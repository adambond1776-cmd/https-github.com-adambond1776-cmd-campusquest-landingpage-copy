import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function links() {
  return import('@/lib/activities/resolve-links');
}

beforeEach(() => {
  vi.resetModules();
  process.env.CRON_SECRET = 'test-secret';
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('resolve links', () => {
  it('accepts a link it signed', async () => {
    const { signResolve, verifyResolve } = await links();
    const token = signResolve('rep_1', 'confirmed')!;
    expect(verifyResolve('rep_1', 'confirmed', token)).toBe(true);
  });

  it('will not let a confirm link be edited into a reject', async () => {
    const { signResolve, verifyResolve } = await links();
    const token = signResolve('rep_1', 'confirmed')!;
    expect(verifyResolve('rep_1', 'rejected', token)).toBe(false);
  });

  it('will not let one report\u2019s link resolve another', async () => {
    const { signResolve, verifyResolve } = await links();
    const token = signResolve('rep_1', 'confirmed')!;
    expect(verifyResolve('rep_2', 'confirmed', token)).toBe(false);
  });

  it('refuses statuses that are not an outcome', async () => {
    const { signResolve, verifyResolve } = await links();
    const token = signResolve('rep_1', 'confirmed')!;
    expect(verifyResolve('rep_1', 'pending', token)).toBe(false);
  });

  it('rejects garbage tokens rather than throwing on them', async () => {
    const { verifyResolve } = await links();
    expect(verifyResolve('rep_1', 'confirmed', 'not-hex')).toBe(false);
    expect(verifyResolve('rep_1', 'confirmed', '')).toBe(false);
    expect(verifyResolve('rep_1', 'confirmed', 'ab'.repeat(64))).toBe(false);
  });

  it('signs nothing when there is no secret, rather than signing with a blank', async () => {
    delete process.env.CRON_SECRET;
    vi.resetModules();
    const { signResolve, verifyResolve } = await links();
    expect(signResolve('rep_1', 'confirmed')).toBeNull();
    expect(verifyResolve('rep_1', 'confirmed', 'a'.repeat(64))).toBe(false);
  });
});
