import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn(), age: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mock.create }));
vi.mock('@/lib/age-store', () => ({ ageStore: () => ({ get: mock.age }) }));
import { billingIdentity } from '../identity';
const user = { id: 'me', email: 'student@example.edu', email_confirmed_at: '2026-09-01', user_metadata: { role: 'student' } };
const verifiedStudent = {
  id: 'me',
  campus_email_verified_at: '2026-09-01T00:00:00.000Z',
};
function database(row: object | null) {
  return {
    auth: { getUser: mock.user },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mock.create.mockResolvedValue(database(verifiedStudent));
  mock.user.mockResolvedValue({ data: { user }, error: null });
  mock.age.mockResolvedValue({ bracket: 'adult', guardian: null });
});
describe('billing identity', () => {
  it('returns the authenticated adult only', async () => expect(await billingIdentity()).toEqual({ id: 'me', email: 'student@example.edu' }));
  it('requires connected auth', async () => { mock.create.mockResolvedValue(null); await expect(billingIdentity()).rejects.toThrow('Connect'); });
  it('requires a valid session', async () => { mock.user.mockResolvedValue({ data: { user: null }, error: null }); await expect(billingIdentity()).rejects.toThrow('Sign in'); });
  it('rejects an unverified server profile even when metadata says verified', async () => {
    mock.user.mockResolvedValue({
      data: { user: { ...user, user_metadata: { campus_email_verified_at: '2026-09-01', role: 'student', plan: 'premium' } } },
      error: null,
    });
    mock.create.mockResolvedValue(database({ ...verifiedStudent, campus_email_verified_at: null }));
    await expect(billingIdentity()).rejects.toThrow('Verify');
  });
  it.each([null, { bracket: 'unknown' }, { bracket: 'minor', guardian: { consented_at: '2026-09-01' } }, { bracket: 'under_16' }])('rejects an ineligible age record %j', async (record) => {
    mock.age.mockResolvedValue(record);
    await expect(billingIdentity()).rejects.toThrow('adult');
  });
  it('does not treat profiles.role or metadata as a billing entitlement', async () => {
    mock.user.mockResolvedValue({
      data: { user: { ...user, user_metadata: { role: 'admin', plan: 'premium' } } },
      error: null,
    });
    mock.create.mockResolvedValue(database({ ...verifiedStudent, role: 'super_admin' }));
    await expect(billingIdentity()).resolves.toEqual({ id: 'me', email: 'student@example.edu' });
  });
});
