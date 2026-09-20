import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ identity: vi.fn(), config: vi.fn(), read: vi.fn(), checkout: vi.fn(), cancel: vi.fn(), revalidate: vi.fn() }));
vi.mock('../identity', () => ({ billingIdentity: mock.identity }));
vi.mock('../config', () => ({ testBillingConfig: mock.config }));
vi.mock('../service', () => ({ readTestSubscription: mock.read, startTestCheckout: mock.checkout, changeTestCancellation: mock.cancel }));
vi.mock('next/cache', () => ({ revalidatePath: mock.revalidate }));
import { manageTestBilling } from '@/app/billing/actions';
import { EMPTY_SUBSCRIPTION } from '../catalog';
beforeEach(() => {
  vi.resetAllMocks();
  mock.identity.mockResolvedValue({ id: 'authenticated-user', email: 'student@example.edu' });
  mock.read.mockResolvedValue(EMPTY_SUBSCRIPTION);
  mock.cancel.mockResolvedValue(EMPTY_SUBSCRIPTION);
});
describe('authenticated billing action', () => {
  it.each([null, {}, { plan: 'plus', user_id: 'other' }, 'premium', 'live', 'club'])('rejects forged input %j', async (command) => {
    expect((await manageTestBilling(command)).ok).toBe(false);
    expect(mock.identity).not.toHaveBeenCalled();
  });
  it('uses only the authenticated account', async () => {
    mock.checkout.mockResolvedValue('https://checkout.stripe.com/test');
    expect((await manageTestBilling('plus')).ok).toBe(true);
    expect(mock.checkout).toHaveBeenCalledExactlyOnceWith('authenticated-user', 'student@example.edu', 'plus');
  });
  it('rejects unconfigured/live mode before identity or payment calls', async () => {
    mock.config.mockImplementation(() => { throw new Error('Test billing is disabled.'); });
    expect((await manageTestBilling('basic')).ok).toBe(false);
    expect(mock.identity).not.toHaveBeenCalled();
    expect(mock.checkout).not.toHaveBeenCalled();
  });
  it('rejects missing identity without provider calls', async () => {
    mock.identity.mockRejectedValue(new Error('Sign in before managing a subscription.'));
    expect((await manageTestBilling('cancel')).ok).toBe(false);
    expect(mock.cancel).not.toHaveBeenCalled();
  });
  it('does not leak provider details', async () => {
    mock.read.mockRejectedValue(Object.assign(new Error('private secret provider error'), { type: 'StripeError' }));
    const result = await manageTestBilling('refresh');
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private secret');
  });
  it.each([['cancel', true], ['resume', false]] as const)('handles %s server-side', async (command, cancel) => {
    expect((await manageTestBilling(command)).ok).toBe(true);
    expect(mock.cancel).toHaveBeenCalledExactlyOnceWith('authenticated-user', cancel);
  });
});
