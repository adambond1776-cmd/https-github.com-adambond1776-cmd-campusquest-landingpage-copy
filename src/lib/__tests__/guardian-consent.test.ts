import { describe, expect, it, vi } from 'vitest';
import type { AgeStore } from '@/lib/age-store';
import type { AgeRecord, GuardianConsent } from '@/lib/age';
import { confirmGuardianConsent, inspectGuardianConsent } from '@/lib/guardian-consent';

vi.mock('@/lib/alerts', () => ({
  sendGuardianApproved: vi.fn(async () => ({ delivered: true, detail: 'logged' })),
}));

const consent = (overrides: Partial<GuardianConsent> = {}): GuardianConsent => ({
  guardian_name: 'Pat',
  guardian_email: 'pat@example.com',
  requested_at: '2026-09-01T00:00:00.000Z',
  consented_at: null,
  token_hash: '',
  expires_at: '2099-01-01T00:00:00.000Z',
  revoked_at: null,
  terms_version: '1',
  privacy_version: '1',
  ...overrides,
});

function storeFor(record: AgeRecord | null): AgeStore & { recordConsent: ReturnType<typeof vi.fn> } {
  return {
    kind: 'local',
    get: vi.fn(async () => record),
    attest: vi.fn(async () => record as AgeRecord),
    requestGuardian: vi.fn(async () => undefined),
    findByTokenHash: vi.fn(async () =>
      record ? { email: 'student@uri.edu', record } : null
    ),
    recordConsent: vi.fn(async () => undefined),
    forget: vi.fn(async () => undefined),
  };
}

describe('guardian consent', () => {
  it('a GET-style inspection cannot approve consent', async () => {
    const { hashConsentToken } = await import('@/lib/age');
    const token = 'approve-me';
    const store = storeFor({
      bracket: 'minor',
      birth_year: 2009,
      attested_at: '2026-09-01T00:00:00.000Z',
      guardian: consent({ token_hash: hashConsentToken(token) }),
    });
    await expect(inspectGuardianConsent(token, store)).resolves.toEqual({ state: 'pending' });
    expect(store.recordConsent).not.toHaveBeenCalled();
  });

  it('records approval only from an explicit confirmation', async () => {
    const { hashConsentToken } = await import('@/lib/age');
    const token = 'approve-me';
    const store = storeFor({
      bracket: 'minor',
      birth_year: 2009,
      attested_at: '2026-09-01T00:00:00.000Z',
      guardian: consent({ token_hash: hashConsentToken(token) }),
    });
    await expect(confirmGuardianConsent(token, store)).resolves.toEqual({ state: 'approved' });
    expect(store.recordConsent).toHaveBeenCalledOnce();
  });
});
