import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const getUserById = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
const insert = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc,
    auth: { admin: { getUserById, createUser, deleteUser } },
    from: () => ({
      insert,
      select: () => ({ eq: () => ({ maybeSingle }) }),
    }),
  }),
}));

describe('findAuthUserByEmail', () => {
  beforeEach(() => {
    rpc.mockReset();
    getUserById.mockReset();
    createUser.mockReset();
    deleteUser.mockReset();
    insert.mockReset();
    maybeSingle.mockReset();
  });

  it('does not treat a lookup error as a missing user or create another account', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'database unavailable' } });
    const { findAuthUserByEmail, AuthLookupError } = await import('@/lib/email-verification-service');
    await expect(findAuthUserByEmail('ram@uri.edu')).rejects.toBeInstanceOf(AuthLookupError);
    expect(createUser).not.toHaveBeenCalled();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('returns null only when the lookup succeeds and no user exists', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const { findAuthUserByEmail } = await import('@/lib/email-verification-service');
    await expect(findAuthUserByEmail('ram@uri.edu')).resolves.toBeNull();
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe('createPendingAuthUser', () => {
  beforeEach(() => {
    rpc.mockReset();
    createUser.mockReset();
    deleteUser.mockReset();
    insert.mockReset();
    createUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'ram@uri.edu' } }, error: null });
    insert.mockResolvedValue({ error: null });
    deleteUser.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('stores preferences only and prepares an unverified profile without a role', async () => {
    const { createPendingAuthUser } = await import('@/lib/email-verification-service');
    await createPendingAuthUser({
      email: 'ram@uri.edu',
      role: 'student',
      metadata: {
        interests: ['Music'],
        role: 'organization',
        plan: 'premium',
        campus_email_verified_at: '2026-09-01T00:00:00.000Z',
        campus_email_pending: false,
      },
    });
    expect(createUser.mock.calls[0][0].user_metadata).toEqual({ interests: ['Music'] });
    expect(insert).toHaveBeenCalledWith({
      id: 'user-1',
      username: 'nuser1',
      display_name: 'New member',
    });
    const payload = insert.mock.calls[0][0];
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('campus_email_verified_at');
    expect(payload).not.toHaveProperty('plan');
  });
});
