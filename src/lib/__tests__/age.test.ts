import { describe, expect, it } from 'vitest';
import {
  allows,
  bracketForBirthYear,
  consentTokenMatches,
  createConsentToken,
  guardianConsentActive,
  hashConsentToken,
  type AgeRecord,
  type GuardianConsent,
} from '@/lib/age';

const NOW = new Date('2026-09-07T12:00:00.000Z');

function consent(overrides: Partial<GuardianConsent> = {}): GuardianConsent {
  return {
    guardian_name: 'A Guardian',
    guardian_email: 'guardian@example.com',
    requested_at: '2026-09-01T00:00:00.000Z',
    consented_at: '2026-09-02T00:00:00.000Z',
    token_hash: hashConsentToken('whatever'),
    expires_at: '2026-09-15T00:00:00.000Z',
    revoked_at: null,
    terms_version: '1.0',
    privacy_version: '1.0',
    ...overrides,
  };
}

function record(overrides: Partial<AgeRecord> = {}): AgeRecord {
  return {
    bracket: 'adult',
    birth_year: 2004,
    attested_at: '2026-09-01T00:00:00.000Z',
    guardian: null,
    ...overrides,
  };
}

describe('bracketForBirthYear', () => {
  it('reads a clear adult as an adult', () => {
    expect(bracketForBirthYear(2004, NOW)).toBe('adult');
  });

  it('reads a clear minor as a minor', () => {
    expect(bracketForBirthYear(2009, NOW)).toBe('minor');
  });

  it('rejects someone below the floor', () => {
    expect(bracketForBirthYear(2013, NOW)).toBe('under_16');
  });

  it('errs young on the boundary, since a birth year alone is ambiguous', () => {
    // Born 2008: either 17 or 18 during 2026 depending on the birthday. Treated
    // as a minor until they say otherwise, because the costly mistake is
    // letting an under-18 through, not making an 18-year-old wait.
    expect(bracketForBirthYear(2008, NOW)).toBe('minor');
  });
});

describe('allows', () => {
  it('lets an adult do everything', () => {
    for (const capability of ['directory', 'contribute', 'genius_mining', 'billing'] as const) {
      expect(allows(record(), capability).allowed).toBe(true);
    }
  });

  it('refuses everything to an account that has not stated an age', () => {
    expect(allows(null, 'directory').allowed).toBe(false);
    expect(allows(record({ bracket: 'unknown' }), 'directory').allowed).toBe(false);
  });

  it('refuses everything to an under-16', () => {
    expect(allows(record({ bracket: 'under_16' }), 'directory').allowed).toBe(false);
  });

  it('gives a consented minor the directory', () => {
    const minor = record({ bracket: 'minor', guardian: consent() });

    expect(allows(minor, 'directory').allowed).toBe(true);
    expect(allows(minor, 'contribute').allowed).toBe(true);
  });

  it('holds a minor out of the directory until the guardian actually responds', () => {
    const pending = record({ bracket: 'minor', guardian: consent({ consented_at: null }) });

    expect(allows(pending, 'directory').allowed).toBe(false);
    expect(allows(pending, 'directory').reason).toMatch(/parent or guardian/i);
  });

  it('keeps the instrument closed to a minor even with guardian consent', () => {
    const minor = record({ bracket: 'minor', guardian: consent() });
    const decision = allows(minor, 'genius_mining');

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/18 and over/);
  });

  it('will not sell a subscription to a minor even with guardian consent', () => {
    const minor = record({ bracket: 'minor', guardian: consent() });

    expect(allows(minor, 'billing').allowed).toBe(false);
  });

  it('closes access again when a guardian revokes', () => {
    const revoked = record({
      bracket: 'minor',
      guardian: consent({ revoked_at: '2026-09-05T00:00:00.000Z' }),
    });

    expect(guardianConsentActive(revoked.guardian)).toBe(false);
    expect(allows(revoked, 'directory').allowed).toBe(false);
  });
});

describe('consent tokens', () => {
  it('matches the token it issued', () => {
    const { token, hash } = createConsentToken();
    expect(consentTokenMatches(token, hash)).toBe(true);
  });

  it('rejects a different token', () => {
    const { hash } = createConsentToken();
    const other = createConsentToken();
    expect(consentTokenMatches(other.token, hash)).toBe(false);
  });

  it('rejects a malformed token without throwing', () => {
    const { hash } = createConsentToken();
    expect(consentTokenMatches('not-a-real-token', hash)).toBe(false);
  });

  it('never stores the raw token', () => {
    const { token, hash } = createConsentToken();
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
  });
});
