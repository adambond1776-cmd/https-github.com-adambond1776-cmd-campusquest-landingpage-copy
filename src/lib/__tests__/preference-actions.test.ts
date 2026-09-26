import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, updateUser, revalidatePath, maybeSingle } = vi.hoisted(() => ({
  createClient: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), revalidatePath: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('next/cache', () => ({ revalidatePath }));
import { saveMyInterests } from '@/app/settings/preference-actions';
import { normalizeInterestProfile } from '@/lib/interests';
const profile = normalizeInterestProfile(undefined, ['Tech']);
const verifiedRow = {
  id: 'me',
  campus_email_verified_at: '2026-09-01T00:00:00.000Z',
};

describe('save only the signed-in account interests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    maybeSingle.mockResolvedValue({ data: verifiedRow, error: null });
    createClient.mockResolvedValue({
      auth: { getUser, updateUser },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    });
    getUser.mockResolvedValue({ data: { user: { id: 'me', user_metadata: {} } }, error: null });
    updateUser.mockResolvedValue({ error: null });
  });
  it('saves normalized interests only and refreshes both pages', async () => {
    const weighted = { version: 1, selections: [{ id: 'technology', priority: 3, details: ['Coding'] }] };
    expect(await saveMyInterests(weighted))
      .toEqual({ ok: true, interests: ['Science, technology & making'], profile: weighted });
    expect(updateUser).toHaveBeenCalledExactlyOnceWith({
      data: { interests: ['Science, technology & making'], interest_preferences: weighted },
    });
    expect(revalidatePath.mock.calls).toEqual([['/settings'], ['/activities']]);
  });
  it('persists an explicit opt-out', async () => {
    const empty = { version: 1, selections: [] };
    expect((await saveMyInterests(empty)).ok).toBe(true);
    expect(updateUser).toHaveBeenCalledWith({ data: { interests: [], interest_preferences: empty } });
  });
  it('rejects arbitrary metadata or user IDs before touching auth', async () => {
    expect((await saveMyInterests({ userId: 'someone-else', plan: 'premium', interests: ['Tech'] })).ok).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
  it('does not pretend to save when auth is unconfigured', async () => {
    createClient.mockResolvedValue(null);
    expect((await saveMyInterests(profile)).ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: 'me' } }, error: { message: 'invalid token' } },
  ])('blocks missing or invalid sessions: %j', async (response) => {
    getUser.mockResolvedValue(response);
    expect((await saveMyInterests(profile)).ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it('blocks an authenticated user until the server profile is verified', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'me',
          user_metadata: {
            campus_email_verified_at: '2026-01-01T00:00:00.000Z',
            campus_email_pending: false,
            role: 'organization',
            plan: 'premium',
          },
        },
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: { ...verifiedRow, campus_email_verified_at: null },
      error: null,
    });
    expect((await saveMyInterests(profile)).ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });
  it('saves interests when the server profile is verified even if metadata says pending', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'me', user_metadata: { campus_email_pending: true, plan: 'premium' } } },
      error: null,
    });
    expect((await saveMyInterests(profile)).ok).toBe(true);
    expect(updateUser).toHaveBeenCalledOnce();
    const payload = updateUser.mock.calls[0][0].data;
    expect(payload).not.toHaveProperty('plan');
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('campus_email_verified_at');
  });
  it('does not leak provider errors or claim persistence on failure', async () => {
    updateUser.mockResolvedValue({ error: { message: 'private provider detail' } });
    const result = await saveMyInterests(profile);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private provider detail');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it('handles a network failure', async () => {
    getUser.mockRejectedValue(new Error('offline'));
    expect((await saveMyInterests(profile)).ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
