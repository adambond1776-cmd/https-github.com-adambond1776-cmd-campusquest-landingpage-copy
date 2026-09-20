import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, updateUser, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('next/cache', () => ({ revalidatePath }));
import { saveMyInterests } from '@/app/settings/preference-actions';
import { normalizeInterestProfile } from '@/lib/interests';
const profile = normalizeInterestProfile(undefined, ['Tech']);

describe('save only the signed-in account interests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createClient.mockResolvedValue({ auth: { getUser, updateUser } });
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
    { data: { user: { id: 'me', user_metadata: { campus_email_pending: true } } }, error: null },
    { data: { user: { id: 'me', user_metadata: { campus_email_verified_at: null } } }, error: null },
  ])('blocks missing, invalid or unverified sessions: %j', async (response) => {
    getUser.mockResolvedValue(response);
    expect((await saveMyInterests(profile)).ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
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
