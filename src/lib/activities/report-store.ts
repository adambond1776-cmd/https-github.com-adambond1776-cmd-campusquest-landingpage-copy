import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertProductionPersistence, supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import type { ActivityReport, ReportStatus } from '@/lib/activities/reports';

export type ReportStore = {
  readonly kind: 'supabase' | 'local';
  create(report: Omit<ActivityReport, 'id'>): Promise<ActivityReport>;
  /** Every report from one student, for the reward ledger. */
  byReporter(hash: string): Promise<ActivityReport[]>;
  openByReporter(hash: string): Promise<ActivityReport[]>;
  /** Existing report from the same student about the same listing. */
  duplicateOf(hash: string, activityId: string | null, kind: string): Promise<boolean>;
  queue(campusId?: string): Promise<ActivityReport[]>;
  resolve(
    id: string,
    status: ReportStatus,
    resolvedBy: string,
    note?: string | null
  ): Promise<void>;
  markCredited(ids: string[]): Promise<void>;
  /** Drops every report this student filed, for account deletion. */
  forget(reporterHash: string): Promise<void>;
};

const OPEN: ReportStatus[] = ['pending'];

/* ------------------------------------------------------------------ *
 * Local store
 * ------------------------------------------------------------------ */

class LocalReportStore implements ReportStore {
  readonly kind = 'local' as const;

  private readonly file =
    process.env.CQ_LOCAL_REPORTS_PATH?.trim() ||
    join(tmpdir(), 'campusquest-activities', 'reports.json');

  private async read(): Promise<ActivityReport[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as ActivityReport[];
    } catch {
      return [];
    }
  }

  private async write(rows: ActivityReport[]): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(rows, null, 2), 'utf8');
  }

  async create(report: Omit<ActivityReport, 'id'>): Promise<ActivityReport> {
    const row = { ...report, id: `rep_${randomUUID()}` };
    const rows = await this.read();
    rows.push(row);
    await this.write(rows);
    return row;
  }

  async byReporter(hash: string): Promise<ActivityReport[]> {
    return (await this.read()).filter((row) => row.reporter_hash === hash);
  }

  async openByReporter(hash: string): Promise<ActivityReport[]> {
    return (await this.byReporter(hash)).filter((row) => OPEN.includes(row.status));
  }

  async duplicateOf(hash: string, activityId: string | null, kind: string): Promise<boolean> {
    return (await this.byReporter(hash)).some(
      (row) => row.activity_id === activityId && row.kind === kind && row.status !== 'rejected'
    );
  }

  async queue(campusId?: string): Promise<ActivityReport[]> {
    return (await this.read())
      .filter((row) => row.status === 'pending' && (!campusId || row.campus_id === campusId))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async resolve(
    id: string,
    status: ReportStatus,
    resolvedBy: string,
    note: string | null = null
  ): Promise<void> {
    const rows = (await this.read()).map((row) =>
      row.id === id
        ? {
            ...row,
            status,
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy,
            resolution_note: note,
          }
        : row
    );
    await this.write(rows);
  }

  async markCredited(ids: string[]): Promise<void> {
    const wanted = new Set(ids);
    const rows = (await this.read()).map((row) =>
      wanted.has(row.id) ? { ...row, credited: true } : row
    );
    await this.write(rows);
  }

  async forget(reporterHash: string): Promise<void> {
    const rows = await this.read();
    await this.write(rows.filter((row) => row.reporter_hash !== reporterHash));
  }
}

/* ------------------------------------------------------------------ *
 * Supabase store
 * ------------------------------------------------------------------ */

const TABLE = 'cq_activity_reports';

class SupabaseReportStore implements ReportStore {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  async create(report: Omit<ActivityReport, 'id'>): Promise<ActivityReport> {
    const { data, error } = await this.client.from(TABLE).insert(report).select().single();
    if (error) throw new Error(`Filing report failed: ${error.message}`);
    return data as ActivityReport;
  }

  async byReporter(hash: string): Promise<ActivityReport[]> {
    const { data, error } = await this.client.from(TABLE).select('*').eq('reporter_hash', hash);
    if (error) throw new Error(`Reading reports failed: ${error.message}`);
    return (data ?? []) as ActivityReport[];
  }

  async openByReporter(hash: string): Promise<ActivityReport[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('reporter_hash', hash)
      .in('status', OPEN);
    if (error) throw new Error(`Reading open reports failed: ${error.message}`);
    return (data ?? []) as ActivityReport[];
  }

  async duplicateOf(hash: string, activityId: string | null, kind: string): Promise<boolean> {
    let request = this.client
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('reporter_hash', hash)
      .eq('kind', kind)
      .neq('status', 'rejected');

    request = activityId ? request.eq('activity_id', activityId) : request.is('activity_id', null);

    const { count, error } = await request;
    if (error) throw new Error(`Checking for a duplicate report failed: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async queue(campusId?: string): Promise<ActivityReport[]> {
    let request = this.client
      .from(TABLE)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (campusId) request = request.eq('campus_id', campusId);

    const { data, error } = await request;
    if (error) throw new Error(`Reading the report queue failed: ${error.message}`);
    return (data ?? []) as ActivityReport[];
  }

  async resolve(
    id: string,
    status: ReportStatus,
    resolvedBy: string,
    note: string | null = null
  ): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_note: note,
      })
      .eq('id', id);

    if (error) throw new Error(`Resolving report failed: ${error.message}`);
  }

  async markCredited(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client.from(TABLE).update({ credited: true }).in('id', ids);
    if (error) throw new Error(`Crediting reports failed: ${error.message}`);
  }

  async forget(reporterHash: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('reporter_hash', reporterHash);
    if (error) throw new Error(`Deleting reports failed: ${error.message}`);
  }
}

let cached: ReportStore | null = null;

export function resetReportStoreForTesting(): void {
  cached = null;
}

export function getReportStore(): ReportStore {
  if (cached) return cached;

  assertProductionPersistence('Directory reports');

  const url = supabaseUrl();
  const serviceKey = supabaseServiceRoleKey();

  cached =
    url && serviceKey
      ? new SupabaseReportStore(createClient(url, serviceKey, { auth: { persistSession: false } }))
      : new LocalReportStore();

  return cached;
}
