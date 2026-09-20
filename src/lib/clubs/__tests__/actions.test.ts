import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ identity: vi.fn(), run: vi.fn(), join: vi.fn(), review: vi.fn(), revalidate: vi.fn() }));
vi.mock('../identity', () => ({ clubIdentity: mock.identity }));
vi.mock('../store', () => ({ clubRepository: () => ({}) }));
vi.mock('../billing', () => ({ stripeClubBilling: {} }));
vi.mock('../service', () => ({ clubService: () => ({ run: mock.run, join: mock.join, review: mock.review }) }));
vi.mock('next/cache', () => ({ revalidatePath: mock.revalidate }));
import { manageClub, requestClubJoin, reviewClub } from '@/app/clubs/manage/actions';
import { ClubError } from '../model';
const actor = { id: 'authenticated', email: 'verified@example.invalid' };
beforeEach(() => {
  vi.resetAllMocks(); mock.identity.mockResolvedValue(actor);
  mock.run.mockResolvedValue({ ok: true, view: {}, message: 'saved' }); mock.join.mockResolvedValue('saved');
});
describe('club server-action boundary', () => {
  it('resolves identity on each action rather than using caller IDs', async () => {
    await manageClub({ type: 'billing', action: 'checkout' });
    expect(mock.identity).toHaveBeenCalledExactlyOnceWith();
    expect(mock.run).toHaveBeenCalledWith(actor, { type: 'billing', action: 'checkout' });
  });
  it('join obtains verified contribution identity and never a supplied email identity', async () => {
    await requestClubJoin('uri-chess', { email: 'forged@example.invalid' });
    expect(mock.identity).toHaveBeenCalledWith('join');
    expect(mock.join).toHaveBeenCalledWith(actor, 'uri-chess', { email: 'forged@example.invalid' });
  });
  it('requires reviewer identity on every review request', async () => {
    await reviewClub({ clubId: 'club', target: 'owner', version: 1, confirmed: true });
    expect(mock.identity).toHaveBeenCalledWith('review');
    expect(mock.review).toHaveBeenCalledWith(actor, 'club', 'owner', 1, undefined);
  });
  it('requires affirmative review confirmation', async () => {
    expect((await reviewClub({ clubId: 'club', target: 'owner', version: 1, confirmed: false })).ok).toBe(false);
    expect(mock.review).not.toHaveBeenCalled();
  });
  it('blocks every action without authenticated identity', async () => {
    mock.identity.mockRejectedValue(new ClubError('Sign in first.'));
    expect((await manageClub({ type: 'billing', action: 'cancel' })).ok).toBe(false);
    expect((await requestClubJoin('uri-chess', {})).ok).toBe(false);
    expect((await reviewClub({ clubId: 'club', target: 'owner', version: 1, confirmed: true })).ok).toBe(false);
    expect(mock.run).not.toHaveBeenCalled(); expect(mock.join).not.toHaveBeenCalled(); expect(mock.review).not.toHaveBeenCalled();
  });
  it('hides provider internals and sensitive errors', async () => {
    mock.run.mockRejectedValue(new Error('secret provider detail'));
    const result = await manageClub({ type: 'billing', action: 'refresh' });
    expect(result.ok).toBe(false); expect(result.message).not.toContain('secret provider');
  });
});
