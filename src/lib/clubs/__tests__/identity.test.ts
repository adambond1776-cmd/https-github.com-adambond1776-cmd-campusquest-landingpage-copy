import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn(), age: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mock.create }));
vi.mock('@/lib/age-store', () => ({ ageStore: () => ({ get: mock.age }) }));
import { clubIdentity } from '../identity';
const user = { id: 'me', email: 'owner@example.com', email_confirmed_at: '2026-09-01', user_metadata: { role: 'organization' } };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('CQ_CLUB_MODE','test'); vi.stubEnv('CQ_CLUB_REVIEWER_IDS','reviewer-id');
  mock.create.mockResolvedValue({ auth: { getUser: mock.user } });
  mock.user.mockResolvedValue({ data: { user }, error: null }); mock.age.mockResolvedValue({ bracket: 'adult', guardian: null });
});
afterEach(() => vi.unstubAllEnvs());
describe('club identity boundary', () => {
  it('accepts a verified adult organization account without requiring .edu', async () => expect(await clubIdentity()).toEqual({ id: 'me', email: user.email, organization: true, reviewer: false }));
  it.each(['disabled','live',''])('rejects non-test mode %s', async mode => { vi.stubEnv('CQ_CLUB_MODE',mode); await expect(clubIdentity()).rejects.toThrow('disabled'); expect(mock.create).not.toHaveBeenCalled(); });
  it('rejects missing session', async () => { mock.user.mockResolvedValue({ data: { user: null } }); await expect(clubIdentity()).rejects.toThrow('Sign in'); });
  it('rejects missing database', async () => { mock.create.mockResolvedValue(null); await expect(clubIdentity()).rejects.toThrow('database'); });
  it('requires provider-confirmed email', async () => { mock.user.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } } }); await expect(clubIdentity()).rejects.toThrow('Verify'); });
  it('requires age eligibility', async () => { mock.age.mockResolvedValue({ bracket: 'minor', guardian: null }); await expect(clubIdentity()).rejects.toThrow('age'); });
  it('does not grant reviewer authority from editable metadata', async () => { mock.user.mockResolvedValue({ data: { user: { ...user, user_metadata: { role: 'admin', reviewer: true } } } }); await expect(clubIdentity('review')).rejects.toThrow('Reviewer'); });
  it('grants review by exact server-allowlisted auth id', async () => { vi.stubEnv('CQ_CLUB_REVIEWER_IDS',' someone, me '); expect((await clubIdentity('review')).reviewer).toBe(true); });
});
