import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { findByUserId } = vi.hoisted(() => ({
  findByUserId: vi.fn(async () => null as { participant_code: string } | null),
}));

vi.mock('@/lib/alerts', () => ({
  sendOperatorAlert: vi.fn(async () => ({ delivered: false, detail: 'skipped' })),
}));

vi.mock('@/lib/gm/retention-job', () => ({
  purgeOnDemand: vi.fn(async () => ({ action: 'purge_blocked', detail: 'de-identification failed' })),
}));

vi.mock('@/lib/gm/store', () => ({
  getStore: () => ({
    findByUserId: () => findByUserId(),
    remove: async () => undefined,
  }),
}));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cq-del-safe-'));
  process.env.CQ_LOCAL_AGE_PATH = join(dir, 'ages.json');
  process.env.CQ_LOCAL_REPORTS_PATH = join(dir, 'reports.json');
  process.env.GM_LOCAL_DEMAND_PATH = join(dir, 'demand.json');
  process.env.GM_LOCAL_STORE_PATH = join(dir, 'records.json');
  vi.resetModules();
  findByUserId.mockReset();
  findByUserId.mockResolvedValue(null);
});

afterEach(async () => {
  delete process.env.CQ_LOCAL_AGE_PATH;
  delete process.env.CQ_LOCAL_REPORTS_PATH;
  delete process.env.GM_LOCAL_DEMAND_PATH;
  delete process.env.GM_LOCAL_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

const EMAIL = 'leaver@uri.edu';

function admin(deleteError: { message: string } | null) {
  const deleted: string[] = [];
  return {
    deleted,
    client: {
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: deleteError }) } },
      from(table: string) {
        return {
          delete() {
            return {
              eq(column: string, value: string) {
                deleted.push(`${table}:${column}:${value}`);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    },
  };
}

describe('deletion safety', () => {
  it('missing service-role credentials cannot return successful deletion', async () => {
    const { ageStore } = await import('@/lib/age-store');
    const { deleteAccount } = await import('@/lib/account/delete');
    await ageStore().attest(EMAIL, 1998);
    const result = await deleteAccount({ email: EMAIL, userId: 'user-1', admin: null });
    expect(result.ok).toBe(false);
    expect(result.authUserDeleted).toBe(false);
    expect(result.message).toMatch(/not configured/i);
    expect(result.message).not.toMatch(/Account deleted/);
    expect(await ageStore().get(EMAIL)).not.toBeNull();
  });

  it('failed auth deletion cannot return successful deletion', async () => {
    const { deleteAccount } = await import('@/lib/account/delete');
    const fake = admin({ message: 'auth delete refused' });
    const result = await deleteAccount({
      email: EMAIL,
      userId: 'user-1',
      admin: fake.client as never,
    });
    expect(result.ok).toBe(false);
    expect(result.authUserDeleted).toBe(false);
    expect(result.message).toMatch(/not closed/i);
  });

  it('cleans verification challenges when deletion succeeds', async () => {
    const { deleteAccount } = await import('@/lib/account/delete');
    const fake = admin(null);
    const result = await deleteAccount({
      email: EMAIL,
      userId: 'user-1',
      admin: fake.client as never,
    });
    expect(result.ok).toBe(true);
    expect(result.authUserDeleted).toBe(true);
    expect(fake.deleted).toContain('campus_email_verification_challenges:user_id:user-1');
    expect(fake.deleted).toContain(`campus_email_verification_challenges:email:${EMAIL}`);
  });

  it('does not call auth deletion ambiguous when Genius Mining cleanup is blocked', async () => {
    findByUserId.mockResolvedValue({ participant_code: 'p1' });
    const { deleteAccount } = await import('@/lib/account/delete');
    const fake = admin(null);
    const result = await deleteAccount({
      email: EMAIL,
      userId: 'user-1',
      admin: fake.client as never,
    });
    expect(result.ok).toBe(false);
    expect(result.authUserDeleted).toBe(false);
    expect(result.message).toMatch(/sign-in was not deleted/i);
    expect(fake.client.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
