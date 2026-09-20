import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ enabled: vi.fn(), identity: vi.fn(), subscription: vi.fn() }));
vi.mock('../config', () => ({ billingTestEnabled: mock.enabled }));
vi.mock('../identity', () => ({ billingIdentity: mock.identity }));
vi.mock('../service', () => ({ readTestSubscription: mock.subscription }));
import { recommendationBillingAccess } from '../access';
beforeEach(() => {
  vi.resetAllMocks(); mock.enabled.mockReturnValue(true);
  mock.identity.mockResolvedValue({ id: 'me' });
  mock.subscription.mockResolvedValue({ plan: 'basic', status: 'active', periodEnd: 4102444800, cancelAtPeriodEnd: false });
});
describe('server-side test recommendation gate', () => {
  it('leaves the existing preview unchanged while billing is disabled', async () => {
    mock.enabled.mockReturnValue(false);
    expect((await recommendationBillingAccess()).allowed).toBe(true);
    expect(mock.subscription).not.toHaveBeenCalled();
  });
  it('allows a verified active Basic subscription', async () => expect((await recommendationBillingAccess()).allowed).toBe(true));
  it('does not assume access when Stripe fails', async () => {
    mock.subscription.mockRejectedValue(new Error('offline'));
    expect((await recommendationBillingAccess()).allowed).toBe(false);
  });
  it('requires identity in test mode', async () => {
    mock.identity.mockRejectedValue(new Error('signed out'));
    expect((await recommendationBillingAccess()).allowed).toBe(false);
  });
  it('blocks a failed payment', async () => {
    mock.subscription.mockResolvedValue({ plan: 'plus', status: 'past_due', periodEnd: 4102444800 });
    expect((await recommendationBillingAccess()).allowed).toBe(false);
  });
});
