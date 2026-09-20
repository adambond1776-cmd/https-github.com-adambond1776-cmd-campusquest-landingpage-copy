import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertProductionPersistence, supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import { bracketForBirthYear, type AgeRecord, type GuardianConsent } from '@/lib/age';

/**
 * Where the age gate remembers what it was told.
 *
 * Keyed by a hash of the address rather than the address itself, so the table
 * can be looked up without being a second directory of who has an account. The
 * plain address is kept only on rows with a pending guardian request, because
 * reaching the guardian requires it, and is dropped once that resolves.
 */

export type AgeStore = {
  readonly kind: 'supabase' | 'local';
  get(email: string): Promise<AgeRecord | null>;
  attest(email: string, birthYear: number): Promise<AgeRecord>;
  requestGuardian(email: string, consent: GuardianConsent): Promise<void>;
  /**
   * Finds the request a guardian's link belongs to.
   *
   * `email` is null once consent has been given, because the address was only
   * held in order to reach them. The row still resolves so that a guardian who
   * taps the link a second time is told it is already done, rather than being
   * told their request does not exist.
   */
  findByTokenHash(hash: string): Promise<{ email: string | null; record: AgeRecord } | null>;
  recordConsent(email: string, consentedAt: string): Promise<void>;
  forget(email: string): Promise<void>;
};

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

type Row = {
  email_hash: string;
  email: string | null;
  birth_year: number | null;
  bracket: AgeRecord['bracket'];
  attested_at: string;
  guardian: GuardianConsent | null;
  updated_at: string;
};

function toRecord(row: Row): AgeRecord {
  return {
    bracket: row.bracket,
    birth_year: row.birth_year,
    attested_at: row.attested_at,
    guardian: row.guardian,
  };
}

function newRow(email: string, birthYear: number): Row {
  const bracket = bracketForBirthYear(birthYear);
  const now = new Date().toISOString();
  return {
    email_hash: hashEmail(email),
    // Only held while a guardian may need to be reached.
    email: bracket === 'minor' ? email.trim().toLowerCase() : null,
    birth_year: birthYear,
    bracket,
    attested_at: now,
    guardian: null,
    updated_at: now,
  };
}

/* ------------------------------------------------------------------ *
 * Local store
 * ------------------------------------------------------------------ */

class LocalAgeStore implements AgeStore {
  readonly kind = 'local' as const;

  private readonly file =
    process.env.CQ_LOCAL_AGE_PATH?.trim() || join(tmpdir(), 'campusquest-age', 'ages.json');

  private async read(): Promise<Row[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as Row[];
    } catch {
      return [];
    }
  }

  private async write(rows: Row[]): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(rows, null, 2), 'utf8');
  }

  private async patch(email: string, change: (row: Row) => Row): Promise<void> {
    const rows = await this.read();
    const at = rows.findIndex((row) => row.email_hash === hashEmail(email));
    if (at === -1) return;
    rows[at] = { ...change(rows[at]), updated_at: new Date().toISOString() };
    await this.write(rows);
  }

  async get(email: string): Promise<AgeRecord | null> {
    const row = (await this.read()).find((r) => r.email_hash === hashEmail(email));
    return row ? toRecord(row) : null;
  }

  async attest(email: string, birthYear: number): Promise<AgeRecord> {
    const rows = await this.read();
    const row = newRow(email, birthYear);
    const at = rows.findIndex((r) => r.email_hash === row.email_hash);
    // Re-attesting keeps any guardian consent already given, so a student who
    // corrects a typo does not have to ask their guardian a second time.
    if (at === -1) rows.push(row);
    else rows[at] = { ...row, guardian: rows[at].guardian };
    await this.write(rows);
    return toRecord(rows[at === -1 ? rows.length - 1 : at]);
  }

  async requestGuardian(email: string, consent: GuardianConsent): Promise<void> {
    await this.patch(email, (row) => ({ ...row, guardian: consent }));
  }

  async findByTokenHash(hash: string): Promise<{ email: string | null; record: AgeRecord } | null> {
    const row = (await this.read()).find((r) => r.guardian?.token_hash === hash);
    return row ? { email: row.email, record: toRecord(row) } : null;
  }

  async recordConsent(email: string, consentedAt: string): Promise<void> {
    await this.patch(email, (row) => ({
      ...row,
      email: null,
      guardian: row.guardian ? { ...row.guardian, consented_at: consentedAt } : null,
    }));
  }

  async forget(email: string): Promise<void> {
    const rows = await this.read();
    await this.write(rows.filter((row) => row.email_hash !== hashEmail(email)));
  }
}

/* ------------------------------------------------------------------ *
 * Supabase store
 * ------------------------------------------------------------------ */

const TABLE = 'cq_age_records';

class SupabaseAgeStore implements AgeStore {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  async get(email: string): Promise<AgeRecord | null> {
    const { data } = await this.client
      .from(TABLE)
      .select('*')
      .eq('email_hash', hashEmail(email))
      .maybeSingle();
    return data ? toRecord(data as Row) : null;
  }

  async attest(email: string, birthYear: number): Promise<AgeRecord> {
    const row = newRow(email, birthYear);
    const existing = await this.get(email);
    const merged = { ...row, guardian: existing?.guardian ?? null };
    const { error } = await this.client.from(TABLE).upsert(merged, { onConflict: 'email_hash' });
    if (error) throw new Error(`Could not save age: ${error.message}`);
    return toRecord(merged);
  }

  async requestGuardian(email: string, consent: GuardianConsent): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({ guardian: consent, updated_at: new Date().toISOString() })
      .eq('email_hash', hashEmail(email));
    if (error) throw new Error(`Could not save the guardian request: ${error.message}`);
  }

  async findByTokenHash(hash: string): Promise<{ email: string | null; record: AgeRecord } | null> {
    const { data } = await this.client
      .from(TABLE)
      .select('*')
      .eq('guardian->>token_hash', hash)
      .maybeSingle();
    const row = data as Row | null;
    return row ? { email: row.email, record: toRecord(row) } : null;
  }

  async recordConsent(email: string, consentedAt: string): Promise<void> {
    const current = await this.get(email);
    if (!current?.guardian) return;
    const { error } = await this.client
      .from(TABLE)
      .update({
        email: null,
        guardian: { ...current.guardian, consented_at: consentedAt },
        updated_at: new Date().toISOString(),
      })
      .eq('email_hash', hashEmail(email));
    if (error) throw new Error(`Could not record consent: ${error.message}`);
  }

  async forget(email: string): Promise<void> {
    await this.client.from(TABLE).delete().eq('email_hash', hashEmail(email));
  }
}

let cached: AgeStore | null = null;

export function ageStore(): AgeStore {
  if (cached) return cached;
  assertProductionPersistence('Age and guardian records');
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  cached =
    url && key
      ? new SupabaseAgeStore(createClient(url, key, { auth: { persistSession: false } }))
      : new LocalAgeStore();
  return cached;
}
