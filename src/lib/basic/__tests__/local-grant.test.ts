import { beforeEach, describe, expect, it, vi } from 'vitest';

const production = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const admin = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/runtime', () => ({ isProductionRuntime: () => production() }));
vi.mock('@/lib/session', () => ({ sessionPrivileges: () => session() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => admin() }));

import { grantLocalBasicAccess, revokeLocalBasicAccess } from '@/app/settings/basic-actions';

describe('local Basic grant', () => {
  beforeEach(() => {
    production.mockReset();
    session.mockReset();
    upsert.mockReset();
    remove.mockReset();
    admin.mockReset();
    admin.mockReturnValue({
      from: () => ({
        upsert,
        delete: () => ({ eq: remove }),
      }),
    });
    session.mockResolvedValue({
      state: 'signed-in',
      userId: 'server-user',
      email: 'student@uri.edu',
      privileges: { verified: true, plan: 'free' },
    });
  });

  it('does not touch the database in production', async () => {
    production.mockReturnValue(true);
    const form = new FormData();
    form.set('user_id', 'someone-else');
    form.set('ends_at', '2099-01-01T00:00:00.000Z');
    form.set('early_access', 'on');
    const result = await grantLocalBasicAccess(form);
    expect(result.ok).toBe(false);
    expect(admin).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('grants only the signed-in account for a server-chosen window', async () => {
    production.mockReturnValue(false);
    upsert.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set('user_id', 'someone-else');
    form.set('ends_at', '2099-01-01T00:00:00.000Z');
    const before = Date.now();
    const result = await grantLocalBasicAccess(form);
    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const row = upsert.mock.calls[0][0] as {
      user_id: string;
      starts_at: string;
      ends_at: string;
      early_access: boolean;
    };
    expect(row.user_id).toBe('server-user');
    expect(row.early_access).toBe(false);
    expect(new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()).toBe(60 * 24 * 60 * 60 * 1000);
    expect(new Date(row.starts_at).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('removes only the signed-in local row outside production', async () => {
    production.mockReturnValue(false);
    remove.mockResolvedValue({ error: null });
    const result = await revokeLocalBasicAccess();
    expect(result.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith('user_id', 'server-user');
  });
});
