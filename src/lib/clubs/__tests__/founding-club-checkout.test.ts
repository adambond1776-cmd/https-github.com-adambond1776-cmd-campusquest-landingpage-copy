import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadClubCheckoutFacts = vi.hoisted(() => vi.fn());
const stripeRetrieve = vi.hoisted(() => vi.fn());
const stripeCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/clubs/representation-store', () => ({
  loadClubCheckoutFacts,
}));

vi.mock('stripe', () => ({
  default: class Stripe {
    prices = { retrieve: stripeRetrieve };
    checkout = { sessions: { create: stripeCreate } };
  },
}));

import { createFoundingClubCheckout } from '@/lib/clubs/founding-club-checkout';

const ORG = '22222222-2222-4222-8222-222222222222';
const ready = {
  organizationExists: true,
  approvedRepresentative: true,
  claimStatus: 'approved',
  accessActive: false,
};

beforeEach(() => {
  vi.unstubAllEnvs();
  loadClubCheckoutFacts.mockReset();
  stripeRetrieve.mockReset();
  stripeCreate.mockReset();
  loadClubCheckoutFacts.mockResolvedValue(ready);
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('CQ_STRIPE_TEST_CLUB_FOUNDING_PRICE_ID', 'price_club_founding');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', 'whsec_1234567890123456');
  vi.stubEnv('CQ_BILLING_TEST_ORIGIN', 'http://localhost:43917');
});

describe('Founding Club checkout session', () => {
  it('creates a one-time $99 payment for an approved representative', async () => {
    stripeRetrieve.mockResolvedValue({
      id: 'price_club_founding', livemode: false, active: true, type: 'one_time', recurring: null, currency: 'usd', unit_amount: 9900,
    });
    stripeCreate.mockResolvedValue({ id: 'cs_test_club', livemode: false, url: 'https://checkout.stripe.com/c/pay/club' });
    const url = await createFoundingClubCheckout('11111111-1111-4111-8111-111111111111', 'rep@uri.edu', ORG);
    expect(url).toBe('https://checkout.stripe.com/c/pay/club');
    expect(stripeCreate.mock.calls[0][0]).toMatchObject({
      mode: 'payment',
      line_items: [{ price: 'price_club_founding', quantity: 1 }],
      metadata: {
        campusquest_user_id: '11111111-1111-4111-8111-111111111111',
        organization_id: ORG,
        plan: 'founding_club',
        source: 'landing_page',
      },
    });
    expect(JSON.stringify(stripeCreate.mock.calls[0][0])).not.toContain('subscription');
  });

  it('does not call Stripe for a pending, rejected, active, or demo account', async () => {
    loadClubCheckoutFacts.mockResolvedValue({ ...ready, approvedRepresentative: false, claimStatus: 'pending' });
    await expect(createFoundingClubCheckout('user', 'rep@uri.edu', ORG)).rejects.toThrow('pending');
    loadClubCheckoutFacts.mockResolvedValue({ ...ready, approvedRepresentative: false, claimStatus: 'rejected' });
    await expect(createFoundingClubCheckout('user', 'rep@uri.edu', ORG)).rejects.toThrow('approved representative');
    loadClubCheckoutFacts.mockResolvedValue({ ...ready, accessActive: true });
    await expect(createFoundingClubCheckout('user', 'rep@uri.edu', ORG)).rejects.toThrow('already active');
    await expect(createFoundingClubCheckout('user', 'demo@campusquestapp.com', ORG)).rejects.toThrow('not available');
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('rejects a client-looking organization id before Stripe', async () => {
    await expect(createFoundingClubCheckout('user', 'rep@uri.edu', 'price_attacker')).rejects.toThrow('organization');
    expect(stripeRetrieve).not.toHaveBeenCalled();
  });
});
