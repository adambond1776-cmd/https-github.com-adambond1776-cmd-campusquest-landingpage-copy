import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acceptFoundingCheckout,
  foundingBillingConfig,
  foundingCheckoutNotice,
  foundingLocalCheckoutConfigured,
  foundingReplayDecision,
  foundingWebhookSecret,
  foundingWebhookSecretUsable,
  foundingWindow,
  type FoundingCheckoutFacts,
} from '@/lib/basic/founding';

const USER = '11111111-1111-4111-8111-111111111111';
const PAID_AT = new Date('2026-09-24T20:00:00.000Z');

function paidFacts(overrides: Partial<FoundingCheckoutFacts> = {}): FoundingCheckoutFacts {
  return {
    livemode: false,
    mode: 'payment',
    paymentStatus: 'paid',
    clientReferenceId: USER,
    metadataUserId: USER,
    metadataProduct: 'campusquest_basic_founding',
    amountTotal: 500,
    currency: 'usd',
    priceId: 'price_founding',
    quantity: 1,
    priceType: 'one_time',
    priceLivemode: false,
    priceActive: true,
    priceCurrency: 'usd',
    priceUnitAmount: 500,
    priceRecurring: false,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe('founding pass checkout rules', () => {
  it('does not grant access from a checkout return', () => {
    expect(foundingCheckoutNotice('returned', false)).toBe('processing');
    expect(foundingCheckoutNotice('canceled', false)).toBe('canceled');
    expect(foundingCheckoutNotice('returned', true)).toBeNull();
  });

  it('builds one 60-day window from the verified payment time', () => {
    const window = foundingWindow(PAID_AT);
    expect(new Date(window.endsAt).getTime() - PAID_AT.getTime()).toBe(60 * 24 * 60 * 60 * 1000);
  });

  it('keeps the original end when the same payment is replayed', () => {
    const first = foundingWindow(PAID_AT);
    const replay = foundingReplayDecision({ applied: true, storedEndsAt: first.endsAt });
    expect(replay.writeAccess).toBe(false);
    expect(replay.endsAt).toBe(first.endsAt);
    expect(replay.endsAt).not.toBe(foundingWindow(new Date(PAID_AT.getTime() + 86_400_000)).endsAt);
  });

  it('accepts only a verified one-time $5 test payment for the signed-in user', () => {
    expect(acceptFoundingCheckout(paidFacts(), 'price_founding').ok).toBe(true);
    expect(acceptFoundingCheckout(paidFacts({ livemode: true }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ mode: 'subscription' }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ paymentStatus: 'unpaid' }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ amountTotal: 300 }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ priceType: 'recurring', priceRecurring: true }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ priceId: 'price_other' }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ metadataUserId: 'someone-else' }), 'price_founding').ok).toBe(false);
    expect(acceptFoundingCheckout(paidFacts({ metadataProduct: 'campusquest_social_test' }), 'price_founding').ok).toBe(false);
  });

  it('opens local checkout only with a test key, a price, and a usable webhook secret', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID', 'price_founding');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', 'whsec_short');
    expect(foundingWebhookSecretUsable()).toBe(false);
    expect(foundingLocalCheckoutConfigured()).toBe(false);
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', 'whsec_1234567890123456');
    expect(foundingLocalCheckoutConfigured()).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => foundingBillingConfig()).toThrow(/closed/);
    expect(foundingLocalCheckoutConfigured()).toBe(false);
  });

  it('starts from the founding price without turning on the monthly billing mode', () => {
    vi.stubEnv('CQ_BILLING_MODE', '');
    vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID', 'price_founding');
    expect(foundingBillingConfig().priceId).toBe('price_founding');
  });

  it('refuses live keys and the monthly price variables', () => {
    vi.stubEnv('CQ_BILLING_MODE', 'test');
    vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_live_fixture');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID', 'price_founding');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_other');
    expect(() => foundingBillingConfig()).toThrow(/Live keys are refused/);
    vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID', '');
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_PRICE_ID', 'price_monthly');
    expect(() => foundingBillingConfig()).toThrow(/founding test price/);
    vi.stubEnv('CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_other');
    vi.stubEnv('CQ_STRIPE_TEST_WEBHOOK_SECRET', 'whsec_monthly');
    expect(foundingWebhookSecret()).toBeNull();
  });
});
