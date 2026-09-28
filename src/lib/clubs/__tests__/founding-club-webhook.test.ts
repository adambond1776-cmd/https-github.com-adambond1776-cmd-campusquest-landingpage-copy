import { beforeEach, describe, expect, it, vi } from 'vitest';

const retrieveSession = vi.hoisted(() => vi.fn());
const retrievePrice = vi.hoisted(() => vi.fn());
const constructEvent = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => ({
  default: class Stripe {
    static webhooks = { constructEvent };
    checkout = { sessions: { retrieve: retrieveSession } };
    prices = { retrieve: retrievePrice };
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}));

import { handleFoundingWebhook } from '@/lib/basic/founding-webhook';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const PAID_AT = 1_758_744_000;

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_club',
    livemode: false,
    mode: 'payment',
    payment_status: 'paid',
    client_reference_id: USER,
    metadata: {
      campusquest_user_id: USER,
      organization_id: ORG,
      plan: 'founding_club',
      source: 'landing_page',
    },
    amount_total: 9900,
    currency: 'usd',
    created: PAID_AT,
    line_items: { data: [{ quantity: 1, price: { id: 'price_club_founding' } }] },
    payment_intent: { id: 'pi_test_club', status: 'succeeded', created: PAID_AT },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('CQ_STRIPE_TEST_CLUB_FOUNDING_PRICE_ID', 'price_club_founding');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', 'whsec_founding');
  vi.stubEnv('CQ_BILLING_TEST_ORIGIN', 'http://localhost:43917');
  constructEvent.mockReset();
  retrieveSession.mockReset();
  retrievePrice.mockReset();
  rpc.mockReset();
  retrievePrice.mockResolvedValue({
    id: 'price_club_founding', livemode: false, active: true, type: 'one_time', recurring: null, currency: 'usd', unit_amount: 9900,
  });
  rpc.mockResolvedValue({ data: { applied: true, duplicate: false }, error: null });
});

function post(event: unknown) {
  constructEvent.mockReturnValue(event);
  return handleFoundingWebhook(new Request('http://localhost/api/billing/founding-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'signed' },
    body: '{}',
  }));
}

describe('Founding Club webhook', () => {
  it('grants a paid $99 session once and does not extend it on replay', async () => {
    const ends = new Date(PAID_AT * 1000 + 90 * 24 * 60 * 60 * 1000).toISOString();
    rpc
      .mockResolvedValueOnce({ data: { applied: true, duplicate: false, ends_at: ends }, error: null })
      .mockResolvedValueOnce({ data: { applied: false, duplicate: true, ends_at: ends }, error: null });
    retrieveSession.mockResolvedValue(session());
    const event = { livemode: false, type: 'checkout.session.completed', data: { object: { id: 'cs_test_club', metadata: { plan: 'founding_club' } } } };
    expect((await post(event)).status).toBe(200);
    expect((await post(event)).status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][0]).toBe('apply_cq_club_founding_payment');
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
    expect(rpc.mock.calls[0][1].p_amount).toBe(9900);
    expect(rpc.mock.calls[0][1].p_organization_id).toBe(ORG);
    expect(rpc.mock.calls[0][1].p_paid_at).toBe(new Date(PAID_AT * 1000).toISOString());
  });

  it('grants nothing for a failed or canceled checkout', async () => {
    retrieveSession.mockResolvedValue(session({ payment_status: 'unpaid' }));
    const canceled = await post({
      livemode: false,
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_test_club', metadata: { plan: 'founding_club' } } },
    });
    expect(canceled.status).toBe(200);
    retrieveSession.mockResolvedValue(session({ payment_status: 'unpaid' }));
    const failed = await post({
      livemode: false,
      type: 'checkout.session.async_payment_failed',
      data: { object: { id: 'cs_test_club', metadata: { plan: 'founding_club' } } },
    });
    expect(failed.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not grant a session that fails the $99 price check', async () => {
    retrieveSession.mockResolvedValue(session({ amount_total: 500 }));
    const result = await post({
      livemode: false,
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_club', metadata: { plan: 'founding_club' } } },
    });
    expect(result.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
