import { FOUNDING_OFFERS, FOUNDING_TERMS } from '@/lib/launch-offers';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { isProductionRuntime } from '@/lib/runtime';

export const FOUNDING_PASS_CENTS = FOUNDING_OFFERS.student.amount * 100;
export const FOUNDING_PASS_DAYS = FOUNDING_OFFERS.student.days;
export const FOUNDING_PRODUCT = 'campusquest_basic_founding';
export const FOUNDING_TERMS_COPY = FOUNDING_TERMS;

export type FoundingCheckoutFacts = {
  livemode: boolean;
  mode: string | null;
  paymentStatus: string | null;
  clientReferenceId: string | null;
  metadataUserId: string | null;
  metadataProduct: string | null;
  amountTotal: number | null;
  currency: string | null;
  priceId: string | null;
  quantity: number | null;
  priceType: string | null;
  priceLivemode: boolean;
  priceActive: boolean;
  priceCurrency: string | null;
  priceUnitAmount: number | null;
  priceRecurring: boolean;
};

export function foundingCheckoutNotice(
  checkout: string | undefined,
  active: boolean
): 'processing' | 'canceled' | null {
  if (checkout === 'canceled') return 'canceled';
  if (checkout === 'returned' && !active) return 'processing';
  return null;
}

export function foundingWindow(paidAt: Date, days = FOUNDING_PASS_DAYS): { startsAt: string; endsAt: string } {
  const ends = new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000);
  return { startsAt: paidAt.toISOString(), endsAt: ends.toISOString() };
}

/** Same session replay keeps the stored end. It never adds another 60 days. */
export function foundingReplayDecision(input: {
  applied: boolean;
  storedEndsAt: string;
}): { writeAccess: boolean; endsAt: string } {
  if (input.applied) return { writeAccess: false, endsAt: input.storedEndsAt };
  return { writeAccess: true, endsAt: input.storedEndsAt };
}

export function acceptFoundingCheckout(
  facts: FoundingCheckoutFacts,
  expectedPriceId: string
): { ok: true; userId: string } | { ok: false } {
  const userId = facts.metadataUserId;
  if (facts.livemode || facts.priceLivemode) return { ok: false };
  if (facts.mode !== 'payment' || facts.paymentStatus !== 'paid') return { ok: false };
  if (!userId || !isCanonicalRecordId(userId) || facts.clientReferenceId !== userId) return { ok: false };
  if (facts.metadataProduct !== FOUNDING_PRODUCT) return { ok: false };
  if (facts.amountTotal !== FOUNDING_PASS_CENTS || facts.currency !== 'usd') return { ok: false };
  if (facts.quantity !== 1 || facts.priceId !== expectedPriceId) return { ok: false };
  if (!facts.priceActive || facts.priceRecurring || facts.priceType !== 'one_time') return { ok: false };
  if (facts.priceCurrency !== 'usd' || facts.priceUnitAmount !== FOUNDING_PASS_CENTS) return { ok: false };
  return { ok: true, userId };
}

export function testBillingOrigin(value: string | undefined): string {
  const origin = new URL(value || 'http://localhost:43917');
  const local = origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname);
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    (origin.protocol !== 'https:' && !local)
  ) {
    throw new Error('Invalid test billing origin.');
  }
  return origin.origin;
}

export function foundingTestSecret(): string {
  if (isProductionRuntime()) throw new Error('Founding checkout is closed.');
  const secret = process.env.CQ_STRIPE_TEST_SECRET_KEY?.trim();
  if (!secret?.startsWith('sk_test_')) throw new Error('A Stripe test secret key is required. Live keys are refused.');
  return secret;
}

export function foundingBillingConfig() {
  const secret = foundingTestSecret();
  const priceId = process.env.CQ_STRIPE_TEST_BASIC_FOUNDING_PRICE_ID?.trim();
  if (!priceId?.startsWith('price_')) throw new Error('Configure the CQ Basic founding test price.');
  return {
    secret,
    priceId,
    origin: testBillingOrigin(process.env.CQ_BILLING_TEST_ORIGIN),
  };
}

export function foundingWebhookSecretUsable(secret = process.env.CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET?.trim() || ''): boolean {
  return /^whsec_[A-Za-z0-9+/=_-]{16,}$/.test(secret);
}

/** Local test Checkout only. Production stays closed even if test keys are present. */
export function foundingLocalCheckoutConfigured(): boolean {
  if (!foundingWebhookSecretUsable()) return false;
  try {
    foundingBillingConfig();
    return true;
  } catch {
    return false;
  }
}

export function foundingCheckoutConfigured(): boolean {
  try {
    foundingBillingConfig();
    return true;
  } catch {
    return false;
  }
}

export function foundingWebhookSecret(): string | null {
  const secret = process.env.CQ_STRIPE_TEST_BASIC_FOUNDING_WEBHOOK_SECRET?.trim();
  return secret || null;
}
