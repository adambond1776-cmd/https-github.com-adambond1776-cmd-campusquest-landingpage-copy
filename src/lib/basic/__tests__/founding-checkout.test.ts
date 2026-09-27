import { afterEach, describe, expect, it, vi } from 'vitest';

const loadOwnBasicEntitlement = vi.hoisted(() => vi.fn());
const stripeRetrieve = vi.hoisted(() => vi.fn());
const stripeCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/basic/store', () => ({
  loadOwnBasicEntitlement,
}));

vi.mock('stripe', () => ({
  default: class Stripe {
    prices = { retrieve: stripeRetrieve };
    checkout = { sessions: { create: stripeCreate } };
  },
}));

import { createFoundingCheckout } from '@/lib/basic/founding-checkout';

const ACTIVE = {
  active: true,
  earlyAccess: true,
  startsAt: '2026-09-24T23:26:39.000Z',
  endsAt: '2026-11-23T23:26:39.000Z',
  known: true,
};

afterEach(() => {
  vi.unstubAllEnvs();
  loadOwnBasicEntitlement.mockReset();
  stripeRetrieve.mockReset();
  stripeCreate.mockReset();
});

function enableLocalCheckout() {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID', 'price_founding');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', 'whsec_1234567890123456');
}

describe('founding checkout duplicate protection', () => {
  it('does not create a Checkout Session when Basic is already active', async () => {
    enableLocalCheckout();
    loadOwnBasicEntitlement.mockResolvedValue(ACTIVE);
    await expect(createFoundingCheckout('another-user', 'student@uri.edu')).rejects.toThrow('Founding Basic is already active.');
    expect(stripeRetrieve).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('continues past the entitlement check after the window expires', async () => {
    enableLocalCheckout();
    loadOwnBasicEntitlement.mockResolvedValue({ ...ACTIVE, active: false, earlyAccess: false });
    stripeRetrieve.mockRejectedValue(new Error('price lookup'));
    await expect(createFoundingCheckout('user-1', 'student@uri.edu')).rejects.toThrow('price lookup');
    expect(stripeRetrieve).toHaveBeenCalledOnce();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('does not create a Checkout Session for the demo account', async () => {
    enableLocalCheckout();
    loadOwnBasicEntitlement.mockResolvedValue({ ...ACTIVE, active: false, earlyAccess: false });
    await expect(createFoundingCheckout('user-1', 'demo@campusquestapp.com')).rejects.toThrow(
      'Founding checkout is not available for this account.',
    );
    expect(stripeRetrieve).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });
});
