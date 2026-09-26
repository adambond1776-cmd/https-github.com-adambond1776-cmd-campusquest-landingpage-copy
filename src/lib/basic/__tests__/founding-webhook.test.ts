import { beforeEach, describe, expect, it, vi } from 'vitest';

const retrieveSession = vi.fn();
const retrievePrice = vi.fn();
const constructEvent = vi.fn();
const rpc = vi.fn();

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

const USER = '11111111-1111-4111-8111-111111111111';
const PAID_AT = 1_758_744_000;

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_founding',
    livemode: false,
    mode: 'payment',
    payment_status: 'paid',
    client_reference_id: USER,
    metadata: { cq_user_id: USER, cq_product: 'campusquest_basic_founding' },
    amount_total: 500,
    currency: 'usd',
    created: PAID_AT,
    line_items: { data: [{ quantity: 1, price: { id: 'price_founding' } }] },
    payment_intent: { id: 'pi_test_founding', status: 'succeeded', created: PAID_AT },
    ...overrides,
  };
}

function price(overrides: Record<string, unknown> = {}) {
  return {
    id: 'price_founding',
    livemode: false,
    active: true,
    type: 'one_time',
    recurring: null,
    currency: 'usd',
    unit_amount: 500,
    ...overrides,
  };
}

describe('founding webhook', () => {
  beforeEach(() => {
    vi.stubEnv('CQ_BILLING_MODE', 'test');
    vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID', 'price_founding');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', 'whsec_founding');
    constructEvent.mockReset();
    retrieveSession.mockReset();
    retrievePrice.mockReset();
    rpc.mockReset();
    retrievePrice.mockResolvedValue(price());
    rpc.mockResolvedValue({ data: { applied: true, duplicate: false }, error: null });
  });

  it('rejects a bad signature and a live event before recording a payment', async () => {
    const { handleFoundingWebhook } = await import('@/lib/basic/founding-webhook');
    constructEvent.mockImplementation(() => { throw new Error('bad'); });
    const bad = await handleFoundingWebhook(new Request('http://localhost/api/billing/founding-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'bad' },
      body: '{}',
    }));
    expect(bad.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();

    constructEvent.mockReturnValue({ livemode: true, type: 'checkout.session.completed', data: { object: { id: 'cs_live' } } });
    const live = await handleFoundingWebhook(new Request('http://localhost/api/billing/founding-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'signed' },
      body: '{}',
    }));
    expect(live.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('grants once from the stored payment time and ignores a replay extension', async () => {
    const ends = new Date(PAID_AT * 1000 + 60 * 24 * 60 * 60 * 1000).toISOString();
    rpc
      .mockResolvedValueOnce({ data: { applied: true, duplicate: false, ends_at: ends }, error: null })
      .mockResolvedValueOnce({ data: { applied: false, duplicate: true, ends_at: ends }, error: null });
    constructEvent.mockReturnValue({
      livemode: false,
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_founding' } },
    });
    retrieveSession.mockResolvedValue(session());

    const first = await post();
    const second = await post();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
    expect(rpc.mock.calls[0][1].p_amount).toBe(500);
    expect(rpc.mock.calls[0][1].p_user_id).toBe(USER);
    expect(rpc.mock.calls[1][1].p_paid_at).toBe(new Date(PAID_AT * 1000).toISOString());
  });

  it('does not grant access for a canceled or unpaid checkout', async () => {
    constructEvent.mockReturnValue({
      livemode: false,
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_test_founding' } },
    });
    retrieveSession.mockResolvedValue(session({ payment_status: 'unpaid' }));
    const result = await post();
    expect(result.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});

function post(): Promise<Response> {
  return import('@/lib/basic/founding-webhook').then(({ handleFoundingWebhook }) => handleFoundingWebhook(new Request('http://localhost/api/billing/founding-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'signed' },
    body: '{}',
  })));
}
