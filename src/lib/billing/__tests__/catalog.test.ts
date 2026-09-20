import { afterEach, describe, expect, it, vi } from 'vitest';
import { BILLING_PLANS, EMPTY_SUBSCRIPTION, subscriptionAccess, type BillingStatus, type SubscriptionView } from '../catalog';
import { billingDemoEnabled, testBillingConfig } from '../config';

const active: SubscriptionView = { plan: 'basic', status: 'active', periodEnd: 2000000000, cancelAtPeriodEnd: false };
const now = 1900000000000;
function configured() {
  vi.stubEnv('CQ_BILLING_MODE', 'test');
  vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_PRICE_ID', 'price_basic');
  vi.stubEnv('CQ_STRIPE_TEST_PLUS_PRICE_ID', 'price_plus');
}
afterEach(() => vi.unstubAllEnvs());
describe('paid access is a separate, explicit social entitlement', () => {
  it('keeps the exact agreed prices', () => expect([BILLING_PLANS.basic.cents, BILLING_PLANS.plus.cents]).toEqual([300, 500]));
  it('grants Basic discovery but not Plus sharing', () => {
    expect(subscriptionAccess(active, now)).toMatchObject({ plan: 'basic', recommendations: true, monthlyPlan: false, sharing: false, geniusMining: false, automatedTexts: false });
  });
  it('grants Plus social permissions but never Genius Mining or texting', () => {
    expect(subscriptionAccess({ ...active, plan: 'plus' }, now)).toMatchObject({ plan: 'plus', recommendations: true, monthlyPlan: true, sharing: true, geniusMining: false, automatedTexts: false });
  });
  it('preserves access during a scheduled cancellation', () => expect(subscriptionAccess({ ...active, cancelAtPeriodEnd: true }, now).recommendations).toBe(true));
  it.each(['none', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete', 'incomplete_expired', 'canceled'] as BillingStatus[])('blocks %s', (status) => {
    expect(subscriptionAccess({ ...active, status }, now).plan).toBe('free');
  });
  it.each([null, 1900000000, 1800000000, NaN])('blocks absent/expired/malformed period %s', (periodEnd) => {
    expect(subscriptionAccess({ ...active, periodEnd }, now).recommendations).toBe(false);
  });
  it('does not treat user metadata as proof of access', () => expect(subscriptionAccess({ ...EMPTY_SUBSCRIPTION, plan: 'plus' }, now).plan).toBe('free'));
});
describe('test mode is fail-closed', () => {
  it.each(['', 'disabled', 'live', 'production'])('rejects mode %s', (mode) => {
    configured(); vi.stubEnv('CQ_BILLING_MODE', mode);
    expect(() => testBillingConfig()).toThrow('disabled');
  });
  it.each(['sk_live_fixture', 'rk_live_fixture', '', 'rk_test_fixture'])('refuses non-test secret %s', (secret) => {
    configured(); vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', secret);
    expect(() => testBillingConfig()).toThrow('test secret');
  });
  it('never falls back to the legacy Stripe key', () => {
    configured(); vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', ''); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_legacy');
    expect(() => testBillingConfig()).toThrow();
  });
  it('rejects ambiguous plan mapping', () => {
    configured(); vi.stubEnv('CQ_STRIPE_TEST_PLUS_PRICE_ID', 'price_basic');
    expect(() => testBillingConfig()).toThrow('separate');
  });
  it.each(['javascript:alert(1)', 'https://user:pass@example.com', 'http://example.com', 'https://example.com/path', 'https://example.com?x=1'])('refuses invalid return origin %s', (origin) => {
    configured(); vi.stubEnv('CQ_BILLING_TEST_ORIGIN', origin);
    expect(() => testBillingConfig()).toThrow();
  });
  it('accepts configured test values', () => { configured(); expect(testBillingConfig().prices).toMatchObject({ basic: 'price_basic', plus: 'price_plus' }); });
  it('hides the simulator in production even if test billing is enabled', () => {
    configured(); vi.stubEnv('NODE_ENV', 'production');
    expect(billingDemoEnabled()).toBe(false);
  });
  it('hides the simulator on hosted Vercel environments', () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('VERCEL', '1');
    expect(billingDemoEnabled()).toBe(false);
  });
});
