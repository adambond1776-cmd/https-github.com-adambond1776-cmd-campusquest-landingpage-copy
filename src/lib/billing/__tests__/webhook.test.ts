import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
const { revalidate, apply } = vi.hoisted(() => ({ revalidate: vi.fn(), apply: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: revalidate }));
vi.mock('@/lib/gm/subscription', () => ({ applyToStudent: apply, parseCoverage: vi.fn(), parseSnapshot: vi.fn() }));
import { POST } from '@/app/api/billing/test-webhook/route';
import { POST as legacyPOST } from '@/app/api/billing/subscription-event/route';
const secret = 'whsec_test_fixture';
function request(livemode = false, type = 'customer.subscription.updated', id = 'evt_fixture') {
  const payload = JSON.stringify({ id, object: 'event', type, livemode, data: { object: {
    metadata: { cq_product: 'campusquest_social_test' },
  } } });
  return new Request('http://localhost/api/billing/test-webhook', { method: 'POST', body: payload,
    headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret }) } });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CQ_BILLING_MODE', 'test'); vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_PRICE_ID', 'price_basic'); vi.stubEnv('CQ_STRIPE_TEST_PLUS_PRICE_ID', 'price_plus');
  vi.stubEnv('CQ_STRIPE_TEST_WEBHOOK_SECRET', secret); vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret);
});
afterEach(() => vi.unstubAllEnvs());
describe('signed test webhook isolation', () => {
  it('accepts a signed test subscription event', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(revalidate).toHaveBeenCalledWith('/billing');
    expect(apply).not.toHaveBeenCalled();
  });
  it('rejects even a correctly signed live event', async () => {
    expect((await POST(request(true))).status).toBe(400);
    expect(revalidate).not.toHaveBeenCalled();
  });
  it('rejects a missing signature', async () => {
    expect((await POST(new Request('http://localhost', { method: 'POST', body: '{}' }))).status).toBe(400);
  });
  it('rejects a forged signature', async () => {
    expect((await POST(new Request('http://localhost', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'bad' } }))).status).toBe(400);
  });
  it('is disabled without an explicit test configuration', async () => {
    vi.stubEnv('CQ_BILLING_MODE', 'disabled');
    expect((await POST(request())).status).toBe(503);
  });
  it('requires a separate test webhook secret', async () => {
    vi.stubEnv('CQ_STRIPE_TEST_WEBHOOK_SECRET', '');
    expect((await POST(request())).status).toBe(503);
  });
  it('duplicate and out-of-order events only invalidate, never overwrite entitlements', async () => {
    for (const [id, type] of [
      ['evt_new', 'customer.subscription.deleted'],
      ['evt_old', 'customer.subscription.created'],
      ['evt_new', 'customer.subscription.deleted'],
    ]) expect((await POST(request(false, type, id))).status).toBe(200);
    expect(apply).not.toHaveBeenCalled();
  });
  it.each(['invoice.paid', 'invoice.payment_failed', 'checkout.session.completed'])('refreshes on %s without granting access from the event', async (type) => {
    expect((await POST(request(false, type))).status).toBe(200);
    expect(revalidate).toHaveBeenCalledWith('/activities');
    expect(apply).not.toHaveBeenCalled();
  });
  it('ignores unrelated signed events', async () => {
    expect((await POST(request(false, 'product.created'))).status).toBe(200);
    expect(revalidate).not.toHaveBeenCalled();
  });
  it('blocks a test event misrouted to the legacy GM hook', async () => {
    expect((await legacyPOST(request(false))).status).toBe(200);
    expect(apply).not.toHaveBeenCalled();
  });
  it('blocks a social test marker even on a legacy live event', async () => {
    expect((await legacyPOST(request(true))).status).toBe(200);
    expect(apply).not.toHaveBeenCalled();
  });
});
