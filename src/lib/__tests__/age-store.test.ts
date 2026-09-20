import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConsentToken, hashConsentToken, type GuardianConsent } from '@/lib/age';

let dir: string;

async function freshStore() {
  // The module caches the store on first use, so each test needs its own copy
  // pointed at its own file.
  const { ageStore } = await import('@/lib/age-store');
  return ageStore();
}

beforeEach(async () => {
  vi.resetModules();
  dir = await mkdtemp(join(tmpdir(), 'cq-age-'));
  process.env.CQ_LOCAL_AGE_PATH = join(dir, 'ages.json');
});

afterEach(async () => {
  delete process.env.CQ_LOCAL_AGE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function consentFor(): GuardianConsent {
  const { hash, expiresAt } = createConsentToken();
  return {
    guardian_name: 'Alex Rivera',
    guardian_email: 'alex@example.com',
    requested_at: new Date().toISOString(),
    consented_at: null,
    token_hash: hash,
    expires_at: expiresAt,
    revoked_at: null,
    terms_version: '1.0',
    privacy_version: '1.0',
  };
}

describe('age store', () => {
  it('brackets an adult and keeps no address for them', async () => {
    const store = await freshStore();
    const record = await store.attest('senior@uri.edu', 1999);

    expect(record.bracket).toBe('adult');
    expect(record.birth_year).toBe(1999);
    expect(await store.findByTokenHash('anything')).toBeNull();
  });

  it('finds a pending request by its token and records the consent', async () => {
    const store = await freshStore();
    const thisYear = new Date().getUTCFullYear();
    await store.attest('young@uri.edu', thisYear - 17);

    const { token, hash, expiresAt } = createConsentToken();
    await store.requestGuardian('young@uri.edu', {
      ...consentFor(),
      token_hash: hash,
      expires_at: expiresAt,
    });

    const found = await store.findByTokenHash(hashConsentToken(token));
    expect(found?.email).toBe('young@uri.edu');
    expect(found?.record.guardian?.consented_at).toBeNull();

    await store.recordConsent('young@uri.edu', new Date().toISOString());
    const after = await store.get('young@uri.edu');
    expect(after?.guardian?.consented_at).not.toBeNull();
  });

  it('drops the stored address once the guardian has answered', async () => {
    const store = await freshStore();
    const thisYear = new Date().getUTCFullYear();
    await store.attest('young@uri.edu', thisYear - 17);
    const consent = consentFor();
    await store.requestGuardian('young@uri.edu', consent);

    await store.recordConsent('young@uri.edu', new Date().toISOString());

    // The address was only held so a guardian could be reached.
    const found = await store.findByTokenHash(consent.token_hash);
    expect(found?.email).toBeNull();
  });

  it('still resolves the token after consent, so a second tap is not an error', async () => {
    const store = await freshStore();
    const thisYear = new Date().getUTCFullYear();
    await store.attest('young@uri.edu', thisYear - 17);
    const consent = consentFor();
    await store.requestGuardian('young@uri.edu', consent);
    await store.recordConsent('young@uri.edu', new Date().toISOString());

    // A guardian who taps the link twice should be told it is already done,
    // not told their request does not exist.
    const found = await store.findByTokenHash(consent.token_hash);
    expect(found).not.toBeNull();
    expect(found?.record.guardian?.consented_at).not.toBeNull();
  });

  it('keeps guardian consent when a student corrects their birth year', async () => {
    const store = await freshStore();
    const thisYear = new Date().getUTCFullYear();
    await store.attest('young@uri.edu', thisYear - 17);
    await store.requestGuardian('young@uri.edu', consentFor());
    await store.recordConsent('young@uri.edu', new Date().toISOString());

    await store.attest('young@uri.edu', thisYear - 16);

    const record = await store.get('young@uri.edu');
    expect(record?.bracket).toBe('minor');
    expect(record?.guardian?.consented_at).not.toBeNull();
  });

  it('forgets everything on request', async () => {
    const store = await freshStore();
    await store.attest('gone@uri.edu', 1998);
    await store.forget('gone@uri.edu');
    expect(await store.get('gone@uri.edu')).toBeNull();
  });
});
