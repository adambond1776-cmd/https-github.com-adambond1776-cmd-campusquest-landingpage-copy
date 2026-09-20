import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('@/lib/age-store');
  vi.resetModules();
});

describe('recordAge', () => {
  it('does not throw when the age store rejects, so signup can leave the loading state', async () => {
    vi.doMock('@/lib/age-store', () => ({
      ageStore: () => ({
        kind: 'supabase',
        attest: vi.fn().mockRejectedValue(new Error('Could not save age: JWT expired')),
        get: vi.fn(),
        requestGuardian: vi.fn(),
        findByTokenHash: vi.fn(),
        recordConsent: vi.fn(),
        forget: vi.fn(),
      }),
    }));

    const { recordAge } = await import('@/app/signup/age-actions');
    const result = await recordAge({ email: 'senior@uri.edu', birthYear: 1999 });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.message).not.toMatch(/JWT|Could not save age/i);
    expect(result.message).not.toMatch(/storage is not configured/i);
  });
});
