import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn(), age: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mock.create }));
vi.mock('@/lib/age-store', () => ({ ageStore: () => ({ get: mock.age }) }));
import { billingIdentity } from '../identity';
const user = { id: 'me', email: 'student@example.edu', email_confirmed_at: '2026-09-01', user_metadata: { role: 'student' } };
beforeEach(() => {
  vi.resetAllMocks();
  mock.create.mockResolvedValue({ auth: { getUser: mock.user } });
  mock.user.mockResolvedValue({ data: { user }, error: null });
  mock.age.mockResolvedValue({ bracket: 'adult', guardian: null });
});
describe('billing identity', () => {
  it('returns the authenticated adult only', async () => expect(await billingIdentity()).toEqual({ id: 'me', email: 'student@example.edu' }));
  it('requires connected auth', async () => { mock.create.mockResolvedValue(null); await expect(billingIdentity()).rejects.toThrow('Connect'); });
  it('requires a valid session', async () => { mock.user.mockResolvedValue({ data: { user: null }, error: null }); await expect(billingIdentity()).rejects.toThrow('Sign in'); });
  it.each([
    { ...user, email_confirmed_at: null },
    { ...user, user_metadata: { campus_email_pending: true } },
  ])('rejects unverified email', async (pending) => {
    mock.user.mockResolvedValue({ data: { user: pending }, error: null });
    await expect(billingIdentity()).rejects.toThrow('Verify');
  });
  it.each([null, { bracket: 'unknown' }, { bracket: 'minor', guardian: { consented_at: '2026-09-01' } }, { bracket: 'under_16' }])('rejects an ineligible age record %j', async (record) => {
    mock.age.mockResolvedValue(record);
    await expect(billingIdentity()).rejects.toThrow('adult');
  });
  it('rejects organization accounts', async () => {
    mock.user.mockResolvedValue({ data: { user: { ...user, user_metadata: { role: 'organization' } } }, error: null });
    await expect(billingIdentity()).rejects.toThrow('student plans');
  });
});
