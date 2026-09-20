import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SECTION_IDS,
  nextDigitalCode,
  parseParticipantCode,
  type CorpusRecord,
} from '@hiddengeniuslabs/genius-mining';
import { assertProductionPersistence, supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import { newRecord, type GeniusMiningRecord } from '@/lib/gm/records';

export type Store = {
  readonly kind: 'supabase' | 'local';
  get(participantCode: string): Promise<GeniusMiningRecord | null>;
  findByUserId(userId: string): Promise<GeniusMiningRecord | null>;
  save(record: GeniusMiningRecord): Promise<GeniusMiningRecord>;
  createFor(userId: string | null, campusId: string): Promise<GeniusMiningRecord>;
  /** Records with a retention clock running, for the purge job. */
  withRetentionClockRunning(): Promise<GeniusMiningRecord[]>;
  list(): Promise<GeniusMiningRecord[]>;
  writeCorpusRecord(record: CorpusRecord): Promise<void>;
  /**
   * Deletes the row outright, for account deletion.
   *
   * Distinct from the retention purge, which blanks the answers but keeps the
   * row so the participant code is not handed out twice. When someone deletes
   * their account the row itself is identifying — it carries their user id —
   * so it goes.
   */
  remove(participantCode: string): Promise<void>;
};

const FIRST_SECTION = SECTION_IDS[0];

function touch(record: GeniusMiningRecord): GeniusMiningRecord {
  return { ...record, updated_at: new Date().toISOString() };
}

/* ------------------------------------------------------------------ *
 * Local store
 * ------------------------------------------------------------------ */

type LocalData = {
  records: Record<string, GeniusMiningRecord>;
  corpus: CorpusRecord[];
};

/**
 * File-backed store for running without Supabase credentials.
 *
 * Two sittings and resume-across-devices are requirements of the instrument, so
 * an in-memory map would make the form untestable the moment the dev server
 * restarted. It lives in the temp directory: good enough to demo the flow,
 * obviously not somewhere real answers belong.
 */
class LocalStore implements Store {
  readonly kind = 'local' as const;

  private readonly file =
    process.env.GM_LOCAL_STORE_PATH?.trim() ||
    join(tmpdir(), 'campusquest-genius-mining', 'records.json');

  private async read(): Promise<LocalData> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as LocalData;
    } catch {
      return { records: {}, corpus: [] };
    }
  }

  private async write(data: LocalData): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(data, null, 2), 'utf8');
  }

  async get(participantCode: string): Promise<GeniusMiningRecord | null> {
    return (await this.read()).records[participantCode] ?? null;
  }

  async findByUserId(userId: string): Promise<GeniusMiningRecord | null> {
    const data = await this.read();
    return Object.values(data.records).find((record) => record.user_id === userId) ?? null;
  }

  async save(record: GeniusMiningRecord): Promise<GeniusMiningRecord> {
    const data = await this.read();
    const next = touch(record);
    data.records[next.participant_code] = next;
    await this.write(data);
    return next;
  }

  async remove(participantCode: string): Promise<void> {
    const data = await this.read();
    delete data.records[participantCode];
    await this.write(data);
  }

  async createFor(userId: string | null, campusId: string): Promise<GeniusMiningRecord> {
    const data = await this.read();

    const highest = Object.keys(data.records)
      .map((code) => parseParticipantCode(code) ?? 0)
      .reduce((max, value) => Math.max(max, value), 0);

    const record = newRecord({
      participantCode: nextDigitalCode(highest || null),
      userId,
      campusId,
      instrumentVersion: '1.3',
      firstSection: FIRST_SECTION,
    });

    data.records[record.participant_code] = record;
    await this.write(data);
    return record;
  }

  async withRetentionClockRunning(): Promise<GeniusMiningRecord[]> {
    const data = await this.read();
    return Object.values(data.records).filter(
      (record) => record.retention.lapsed_at !== null && record.retention.membership_status !== 'purged'
    );
  }

  async list(): Promise<GeniusMiningRecord[]> {
    return Object.values((await this.read()).records);
  }

  async writeCorpusRecord(record: CorpusRecord): Promise<void> {
    const data = await this.read();
    data.corpus.push(record);
    await this.write(data);
  }
}

/* ------------------------------------------------------------------ *
 * Supabase store
 * ------------------------------------------------------------------ */

const TABLE = 'gm_sessions';
const CORPUS_TABLE = 'gm_corpus';

/**
 * The row shape is the record shape — JSONB columns rather than a column per
 * question. The instrument is on v1.3 and will keep moving, and a migration per
 * question edit is a migration nobody will write.
 */
class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  async get(participantCode: string): Promise<GeniusMiningRecord | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('participant_code', participantCode)
      .maybeSingle();

    if (error) throw new Error(`Loading ${participantCode} failed: ${error.message}`);
    return (data as GeniusMiningRecord | null) ?? null;
  }

  async findByUserId(userId: string): Promise<GeniusMiningRecord | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Loading the record for ${userId} failed: ${error.message}`);
    return (data as GeniusMiningRecord | null) ?? null;
  }

  async save(record: GeniusMiningRecord): Promise<GeniusMiningRecord> {
    const next = touch(record);
    const { data, error } = await this.client
      .from(TABLE)
      .upsert(next, { onConflict: 'participant_code' })
      .select()
      .single();

    if (error) throw new Error(`Saving ${record.participant_code} failed: ${error.message}`);
    return data as GeniusMiningRecord;
  }

  async remove(participantCode: string): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .delete()
      .eq('participant_code', participantCode);
    if (error) throw new Error(`Deleting ${participantCode} failed: ${error.message}`);
  }

  async createFor(userId: string | null, campusId: string): Promise<GeniusMiningRecord> {
    // Codes come from a Postgres sequence starting at 100 so two students
    // signing up at once cannot be handed the same one.
    const { data, error } = await this.client.rpc('gm_next_participant_code');
    if (error) throw new Error(`Allocating a participant code failed: ${error.message}`);

    return this.save(
      newRecord({
        participantCode: data as string,
        userId,
        campusId,
        instrumentVersion: '1.3',
        firstSection: FIRST_SECTION,
      })
    );
  }

  async withRetentionClockRunning(): Promise<GeniusMiningRecord[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .not('retention->>lapsed_at', 'is', null)
      .neq('retention->>membership_status', 'purged');

    if (error) throw new Error(`Loading lapsed records failed: ${error.message}`);
    return (data ?? []) as GeniusMiningRecord[];
  }

  async list(): Promise<GeniusMiningRecord[]> {
    const { data, error } = await this.client.from(TABLE).select('*');
    if (error) throw new Error(`Listing records failed: ${error.message}`);
    return (data ?? []) as GeniusMiningRecord[];
  }

  async writeCorpusRecord(record: CorpusRecord): Promise<void> {
    const { error } = await this.client
      .from(CORPUS_TABLE)
      .insert({ corpus_id: record.corpus_id, record });

    if (error) throw new Error(`Writing the corpus record failed: ${error.message}`);
  }
}

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

let cached: Store | null = null;

/** Drops the memoized store. Tests use this after repointing the local store. */
export function resetStoreForTesting(): void {
  cached = null;
}

/**
 * Supabase when it is configured, the local file store otherwise.
 *
 * The service role key is required because the retention job and the billing
 * webhook act on rows with no user session attached.
 */
export function getStore(): Store {
  if (cached) return cached;

  assertProductionPersistence('Genius Mining');

  const url = supabaseUrl();
  const serviceKey = supabaseServiceRoleKey();

  cached = url && serviceKey
    ? new SupabaseStore(createClient(url, serviceKey, { auth: { persistSession: false } }))
    : new LocalStore();

  return cached;
}
