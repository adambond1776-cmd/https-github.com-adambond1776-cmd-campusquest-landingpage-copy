import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  assertProductionPersistence,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from '@/lib/env';
import { isProductionRuntime } from '@/lib/runtime';
import {
  ActivitiesDirectoryError,
  classifyActivitiesReadError,
  directoryReadBlocker,
  inspectSupabaseAnonCredentials,
  logActivitiesFailure,
} from '@/lib/supabase/credentials';
import {
  activityFromCanonicalEvent,
  activityFromCanonicalOrganization,
  CANONICAL_CAMPUS_ID,
  CANONICAL_EVENT_COLUMNS,
  CANONICAL_EVENT_TABLE,
  CANONICAL_ORGANIZATION_COLUMNS,
  CANONICAL_ORGANIZATION_TABLE,
  isCanonicalRecordId,
  type CanonicalEventRow,
  type CanonicalOrganizationRow,
} from '@/lib/activities/canonical';
import type { Activity, ActivityStatus } from '@/lib/activities/types';

/**
 * Activity persistence, with the same local-file fallback the rest of the app
 * uses so the directory is browsable before Supabase exists.
 */

export type ActivityQuery = {
  campusId?: string;
  kinds?: Activity['kind'][];
  statuses?: ActivityStatus[];
  /** Free text across name, summary, and categories. */
  search?: string;
  category?: string;
  /** Only rows starting at or after this instant. */
  from?: Date;
  /** Only home fixtures. Ignored for non-athletics rows. */
  homeOnly?: boolean;
  limit?: number;
};

export type ActivityStore = {
  readonly kind: 'supabase' | 'local';
  all(campusId?: string): Promise<Activity[]>;
  list(query: ActivityQuery): Promise<Activity[]>;
  get(id: string): Promise<Activity | null>;
  upsert(activities: Activity[]): Promise<void>;
  setStatus(ids: string[], status: ActivityStatus): Promise<void>;
};

/* ------------------------------------------------------------------ *
 * Shared filtering
 *
 * Applied in memory for the local store, and again after the Supabase
 * query so both backends answer a query identically.
 * ------------------------------------------------------------------ */

export function applyQuery(rows: Activity[], query: ActivityQuery): Activity[] {
  const needle = query.search?.trim().toLowerCase();

  let out = rows.filter((row) => {
    if (query.campusId && row.campus_id !== query.campusId) return false;
    if (query.kinds?.length && !query.kinds.includes(row.kind)) return false;
    if (query.statuses?.length && !query.statuses.includes(row.status)) return false;
    if (query.homeOnly && row.athletics && !row.athletics.home) return false;
    if (query.category && !row.categories.some((c) => c.toLowerCase() === query.category?.toLowerCase())) {
      return false;
    }
    if (query.from && row.starts_at && new Date(row.starts_at) < query.from) return false;

    if (needle) {
      const haystack = [row.name, row.summary ?? '', row.categories.join(' '), row.location ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });

  // Dated rows sort soonest-first; undated ones (clubs, facilities) sort by name
  // and always follow, because "what is on this week" is the more urgent question.
  out = out.sort((a, b) => {
    if (a.starts_at && b.starts_at) return a.starts_at.localeCompare(b.starts_at);
    if (a.starts_at) return -1;
    if (b.starts_at) return 1;
    return a.name.localeCompare(b.name);
  });

  return query.limit ? out.slice(0, query.limit) : out;
}

/* ------------------------------------------------------------------ *
 * Local store
 * ------------------------------------------------------------------ */

class LocalActivityStore implements ActivityStore {
  readonly kind = 'local' as const;

  private readonly file =
    process.env.CQ_LOCAL_ACTIVITIES_PATH?.trim() ||
    join(tmpdir(), 'campusquest-activities', 'activities.json');

  private async read(): Promise<Activity[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as Activity[];
    } catch {
      return [];
    }
  }

  private async write(rows: Activity[]): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(rows, null, 2), 'utf8');
  }

  async all(campusId?: string): Promise<Activity[]> {
    const rows = await this.read();
    return campusId ? rows.filter((row) => row.campus_id === campusId) : rows;
  }

  async list(query: ActivityQuery): Promise<Activity[]> {
    return applyQuery(await this.read(), query);
  }

  async get(id: string): Promise<Activity | null> {
    return (await this.read()).find((row) => row.id === id) ?? null;
  }

  async upsert(activities: Activity[]): Promise<void> {
    const rows = await this.read();
    const index = new Map(rows.map((row) => [row.id, row]));
    for (const activity of activities) index.set(activity.id, activity);
    await this.write([...index.values()]);
  }

  async setStatus(ids: string[], status: ActivityStatus): Promise<void> {
    const wanted = new Set(ids);
    const rows = (await this.read()).map((row) =>
      wanted.has(row.id) ? { ...row, status } : row
    );
    await this.write(rows);
  }
}

/* ------------------------------------------------------------------ *
 * Supabase store
 * ------------------------------------------------------------------ */

const LEGACY_TABLE = 'cq_activities';

/**
 * Public directory. Reads the main app's event and organization tables with
 * the anon key. RLS already limits those tables to active rows. This store
 * does not write them.
 */
class CanonicalActivityStore implements ActivityStore {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  async all(campusId?: string): Promise<Activity[]> {
    if (campusId && campusId !== CANONICAL_CAMPUS_ID) return [];
    return this.load();
  }

  async list(query: ActivityQuery): Promise<Activity[]> {
    if (query.campusId && query.campusId !== CANONICAL_CAMPUS_ID) return [];
    return applyQuery(await this.load(), query);
  }

  async get(id: string): Promise<Activity | null> {
    if (!isCanonicalRecordId(id)) return null;

    const event = await this.one(CANONICAL_EVENT_TABLE, CANONICAL_EVENT_COLUMNS, id);
    if (event) {
      return activityFromCanonicalEvent(event as CanonicalEventRow);
    }

    const organization = await this.one(
      CANONICAL_ORGANIZATION_TABLE,
      CANONICAL_ORGANIZATION_COLUMNS,
      id
    );
    if (!organization) return null;
    return activityFromCanonicalOrganization(organization as CanonicalOrganizationRow);
  }

  async upsert(): Promise<void> {
    throw new Error('The public activity directory reads canonical events and does not write them.');
  }

  async setStatus(): Promise<void> {
    throw new Error('The public activity directory reads canonical events and does not write them.');
  }

  private async load(): Promise<Activity[]> {
    const [events, organizations] = await Promise.all([
      this.rows(CANONICAL_EVENT_TABLE, CANONICAL_EVENT_COLUMNS, (request) =>
        request
          .eq('is_active', true)
          .eq('is_cancelled', false)
          .eq('visibility', 'public')
          .is('canonical_event_id', null)
          .order('starts_at', { ascending: true, nullsFirst: false })
          .limit(2000)
      ),
      this.rows(CANONICAL_ORGANIZATION_TABLE, CANONICAL_ORGANIZATION_COLUMNS, (request) =>
        request.eq('is_active', true).order('name', { ascending: true }).limit(2000)
      ),
    ]);

    return [
      ...events.flatMap((row) => {
        const activity = activityFromCanonicalEvent(row as CanonicalEventRow);
        return activity ? [activity] : [];
      }),
      ...organizations.flatMap((row) => {
        const activity = activityFromCanonicalOrganization(row as CanonicalOrganizationRow);
        return activity ? [activity] : [];
      }),
    ];
  }

  private async rows(
    table: string,
    columns: string,
    refine: (request: FilterableQuery) => FilterableQuery
  ): Promise<Record<string, unknown>[]> {
    const request = refine(this.client.from(table).select(columns) as unknown as FilterableQuery);
    const { data, error } = await request;
    if (error) this.fail('list', error);
    return (data ?? []) as Record<string, unknown>[];
  }

  private async one(
    table: string,
    columns: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.client.from(table).select(columns).eq('id', id).maybeSingle();
    if (error) this.fail('read_one', error);
    return (data as Record<string, unknown> | null) ?? null;
  }

  private fail(stage: 'list' | 'read_one' | 'read_all', error: { message: string }): never {
    const kind = classifyActivitiesReadError(error);
    logActivitiesFailure({
      stage,
      kind,
      inspection: inspectSupabaseAnonCredentials(supabaseUrl(), supabaseAnonKey()),
    });
    throw new ActivitiesDirectoryError(kind);
  }
}

type FilterableQuery = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> & {
  eq: (column: string, value: unknown) => FilterableQuery;
  is: (column: string, value: null) => FilterableQuery;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean }
  ) => FilterableQuery;
  limit: (count: number) => FilterableQuery;
};

class SupabaseActivityStore implements ActivityStore {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  async all(campusId?: string): Promise<Activity[]> {
    let request = this.client.from(LEGACY_TABLE).select('*');
    if (campusId) request = request.eq('campus_id', campusId);

    const { data, error } = await request;
    if (error) {
      const kind = classifyActivitiesReadError(error);
      logActivitiesFailure({
        stage: 'read_all',
        kind,
        inspection: inspectSupabaseAnonCredentials(supabaseUrl(), supabaseAnonKey()),
      });
      throw new ActivitiesDirectoryError(kind);
    }
    return (data ?? []) as Activity[];
  }

  async list(query: ActivityQuery): Promise<Activity[]> {
    let request = this.client.from(LEGACY_TABLE).select('*');

    if (query.campusId) request = request.eq('campus_id', query.campusId);
    if (query.kinds?.length) request = request.in('kind', query.kinds);
    if (query.statuses?.length) request = request.in('status', query.statuses);
    if (query.from) request = request.or(`starts_at.is.null,starts_at.gte.${query.from.toISOString()}`);

    const { data, error } = await request;
    if (error) {
      const kind = classifyActivitiesReadError(error);
      logActivitiesFailure({
        stage: 'list',
        kind,
        inspection: inspectSupabaseAnonCredentials(supabaseUrl(), supabaseAnonKey()),
      });
      throw new ActivitiesDirectoryError(kind);
    }

    // Search and category matching stay in memory: the directory is a few
    // thousand rows per campus, and pushing them into Postgres text search
    // would buy nothing while making the two backends behave differently.
    return applyQuery((data ?? []) as Activity[], query);
  }

  async get(id: string): Promise<Activity | null> {
    const { data, error } = await this.client.from(LEGACY_TABLE).select('*').eq('id', id).maybeSingle();
    if (error) {
      const kind = classifyActivitiesReadError(error);
      logActivitiesFailure({
        stage: 'read_one',
        kind,
        inspection: inspectSupabaseAnonCredentials(supabaseUrl(), supabaseAnonKey()),
      });
      throw new ActivitiesDirectoryError(kind);
    }
    return (data as Activity | null) ?? null;
  }

  async upsert(activities: Activity[]): Promise<void> {
    if (activities.length === 0) return;

    // Chunked because a full athletics plus events sync is a few hundred rows
    // and PostgREST rejects very large single payloads.
    for (let i = 0; i < activities.length; i += 200) {
      const { error } = await this.client
        .from(LEGACY_TABLE)
        .upsert(activities.slice(i, i + 200), { onConflict: 'id' });
      if (error) throw new Error(`Writing activities failed: ${error.message}`);
    }
  }

  async setStatus(ids: string[], status: ActivityStatus): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client.from(LEGACY_TABLE).update({ status }).in('id', ids);
    if (error) throw new Error(`Updating activity status failed: ${error.message}`);
  }
}

let cachedRead: ActivityStore | null = null;
let cachedWrite: ActivityStore | null = null;

export function resetActivityStoreForTesting(): void {
  cachedRead = null;
  cachedWrite = null;
}

function createDirectoryClient(key: string, url: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Public directory reads. Uses NEXT_PUBLIC_SUPABASE_URL + the anon key so the
 * page honours RLS (`listed` / `verified` only). Never use the service-role
 * key here: that belongs to ingest, not the student-facing listing.
 */
export function getActivityStore(): ActivityStore {
  if (cachedRead) return cachedRead;

  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  const inspection = inspectSupabaseAnonCredentials(url, anonKey);
  const blocker = directoryReadBlocker(inspection);

  if (blocker) {
    if (isProductionRuntime()) {
      logActivitiesFailure({ stage: 'open_store', kind: blocker, inspection });
      throw new ActivitiesDirectoryError(blocker);
    }
    cachedRead = new LocalActivityStore();
    return cachedRead;
  }

  cachedRead = new CanonicalActivityStore(createDirectoryClient(anonKey as string, url as string));
  return cachedRead;
}

/**
 * Ingest and other privileged writes. Server-only. Bypasses RLS.
 */
export function getActivityAdminStore(): ActivityStore {
  if (cachedWrite) return cachedWrite;

  assertProductionPersistence('The activity directory');

  const url = supabaseUrl();
  const serviceKey = supabaseServiceRoleKey();

  cachedWrite =
    url && serviceKey
      ? new SupabaseActivityStore(createDirectoryClient(serviceKey, url))
      : new LocalActivityStore();

  return cachedWrite;
}
