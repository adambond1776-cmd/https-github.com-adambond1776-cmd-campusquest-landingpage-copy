import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertProductionPersistence, supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

/**
 * Students asking their school to pay for Genius Mining.
 *
 * Deliberately not an email relay. The obvious build is a button that emails a
 * vice president, and a few hundred near-identical emails from an unknown vendor
 * reads as astroturf and burns the relationship. This counts instead: the
 * student sees their campus total, and the total is what goes into the meeting.
 *
 * The row holds a hash of the email rather than the address. Deduplicating one
 * student's repeated clicks needs a stable key, not a mailing list, and the
 * public page only ever shows counts. `notify` opt-in stores the address so we
 * can tell those students when their school signs up.
 */
export type CampusInterest = {
  campus_id: string;
  /** Free text, only when the campus is `other`. */
  school_name: string | null;
  email_hash: string;
  /** Present only when the student asked to be told the outcome. */
  email: string | null;
  created_at: string;
};

export type DemandTally = {
  campus_id: string;
  count: number;
};

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export type DemandStore = {
  readonly kind: 'supabase' | 'local';
  /** Returns false when this student had already asked for this campus. */
  record(interest: CampusInterest): Promise<boolean>;
  countFor(campusId: string): Promise<number>;
  tally(): Promise<DemandTally[]>;
  /** Drops every campus this student asked about, for account deletion. */
  forget(emailHash: string): Promise<void>;
};

/* ------------------------------------------------------------------ *
 * Local store
 * ------------------------------------------------------------------ */

class LocalDemandStore implements DemandStore {
  readonly kind = 'local' as const;

  private readonly file =
    process.env.GM_LOCAL_DEMAND_PATH?.trim() ||
    join(tmpdir(), 'campusquest-genius-mining', 'demand.json');

  private async read(): Promise<CampusInterest[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as CampusInterest[];
    } catch {
      return [];
    }
  }

  private async write(rows: CampusInterest[]): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(rows, null, 2), 'utf8');
  }

  async record(interest: CampusInterest): Promise<boolean> {
    const rows = await this.read();
    const already = rows.some(
      (row) => row.campus_id === interest.campus_id && row.email_hash === interest.email_hash
    );
    if (already) return false;

    rows.push(interest);
    await this.write(rows);
    return true;
  }

  async countFor(campusId: string): Promise<number> {
    return (await this.read()).filter((row) => row.campus_id === campusId).length;
  }

  async tally(): Promise<DemandTally[]> {
    const counts = new Map<string, number>();
    for (const row of await this.read()) {
      counts.set(row.campus_id, (counts.get(row.campus_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([campus_id, count]) => ({ campus_id, count }))
      .sort((a, b) => b.count - a.count);
  }

  async forget(emailHash: string): Promise<void> {
    const rows = await this.read();
    await this.write(rows.filter((row) => row.email_hash !== emailHash));
  }
}

/* ------------------------------------------------------------------ *
 * Supabase store
 * ------------------------------------------------------------------ */

const TABLE = 'gm_campus_interest';

class SupabaseDemandStore implements DemandStore {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  async record(interest: CampusInterest): Promise<boolean> {
    const { error } = await this.client.from(TABLE).insert(interest);

    // 23505 is a unique violation: this student already asked for this campus.
    if (error?.code === '23505') return false;
    if (error) throw new Error(`Recording campus interest failed: ${error.message}`);
    return true;
  }

  async countFor(campusId: string): Promise<number> {
    const { count, error } = await this.client
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('campus_id', campusId);

    if (error) throw new Error(`Counting campus interest failed: ${error.message}`);
    return count ?? 0;
  }

  async tally(): Promise<DemandTally[]> {
    const { data, error } = await this.client.from(TABLE).select('campus_id');
    if (error) throw new Error(`Tallying campus interest failed: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { campus_id: string }[]) {
      counts.set(row.campus_id, (counts.get(row.campus_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([campus_id, count]) => ({ campus_id, count }))
      .sort((a, b) => b.count - a.count);
  }

  async forget(emailHash: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('email_hash', emailHash);
    if (error) throw new Error(`Deleting campus interest failed: ${error.message}`);
  }
}

let cached: DemandStore | null = null;

export function resetDemandStoreForTesting(): void {
  cached = null;
}

export function getDemandStore(): DemandStore {
  if (cached) return cached;

  assertProductionPersistence('Campus demand');

  const url = supabaseUrl();
  const serviceKey = supabaseServiceRoleKey();

  cached =
    url && serviceKey
      ? new SupabaseDemandStore(createClient(url, serviceKey, { auth: { persistSession: false } }))
      : new LocalDemandStore();

  return cached;
}
