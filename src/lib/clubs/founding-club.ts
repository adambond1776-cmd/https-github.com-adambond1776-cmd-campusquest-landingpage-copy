import { FOUNDING_OFFERS } from '@/lib/launch-offers';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { foundingTestSecret, foundingWebhookSecretUsable, testBillingOrigin } from '@/lib/basic/founding';
import { isProductionRuntime } from '@/lib/runtime';

export const FOUNDING_CLUB_CENTS = FOUNDING_OFFERS.club.amount * 100;
export const FOUNDING_CLUB_DAYS = FOUNDING_OFFERS.club.days;
export const FOUNDING_CLUB_PLAN = 'founding_club';
export const FOUNDING_CLUB_SOURCE = 'landing_page';

export type FoundingClubFacts = {
  livemode: boolean;
  mode: string | null;
  paymentStatus: string | null;
  clientReferenceId: string | null;
  userId: string | null;
  organizationId: string | null;
  plan: string | null;
  source: string | null;
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

/** Exact 90 periods of 24 hours from the verified payment time. */
export function foundingClubWindow(paidAt: Date, days = FOUNDING_CLUB_DAYS): { startsAt: string; endsAt: string } {
  const ends = new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000);
  return { startsAt: paidAt.toISOString(), endsAt: ends.toISOString() };
}

export function clubAccessActive(startsAt: string | null, endsAt: string | null, now = Date.now()): boolean {
  if (!startsAt || !endsAt) return false;
  const starts = Date.parse(startsAt);
  const ends = Date.parse(endsAt);
  return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && ends > now;
}

/** A stored session keeps its original end. A second session cannot extend an active window. */
export function clubGrantDecision(input: {
  applied: boolean;
  storedEndsAt: string | null;
  accessEndsAt: string | null;
  paidAt: string;
}): { writeAccess: boolean; endsAt: string | null } {
  if (input.applied) return { writeAccess: false, endsAt: input.storedEndsAt };
  const paid = Date.parse(input.paidAt);
  const accessEnds = input.accessEndsAt ? Date.parse(input.accessEndsAt) : NaN;
  if (Number.isFinite(accessEnds) && accessEnds > paid) return { writeAccess: false, endsAt: input.accessEndsAt };
  return { writeAccess: true, endsAt: input.storedEndsAt };
}

export function acceptFoundingClubCheckout(
  facts: FoundingClubFacts,
  expectedPriceId: string,
): { ok: true; userId: string; organizationId: string } | { ok: false } {
  const userId = facts.userId;
  const organizationId = facts.organizationId;
  if (facts.livemode || facts.priceLivemode) return { ok: false };
  if (facts.mode !== 'payment' || facts.paymentStatus !== 'paid') return { ok: false };
  if (!userId || !isCanonicalRecordId(userId) || facts.clientReferenceId !== userId) return { ok: false };
  if (!organizationId || !isCanonicalRecordId(organizationId)) return { ok: false };
  if (facts.plan !== FOUNDING_CLUB_PLAN || facts.source !== FOUNDING_CLUB_SOURCE) return { ok: false };
  if (facts.amountTotal !== FOUNDING_CLUB_CENTS || facts.currency !== 'usd') return { ok: false };
  if (facts.quantity !== 1 || facts.priceId !== expectedPriceId) return { ok: false };
  if (!facts.priceActive || facts.priceRecurring || facts.priceType !== 'one_time') return { ok: false };
  if (facts.priceCurrency !== 'usd' || facts.priceUnitAmount !== FOUNDING_CLUB_CENTS) return { ok: false };
  return { ok: true, userId, organizationId };
}

export function foundingClubBillingConfig() {
  if (isProductionRuntime()) throw new Error('Founding Club checkout is closed.');
  const secret = foundingTestSecret();
  const priceId = process.env.CQ_STRIPE_TEST_CLUB_FOUNDING_PRICE_ID?.trim();
  if (!priceId?.startsWith('price_')) throw new Error('Founding Club checkout is closed.');
  return {
    secret,
    priceId,
    origin: testBillingOrigin(process.env.CQ_BILLING_TEST_ORIGIN),
  };
}

export function foundingClubCheckoutConfigured(): boolean {
  if (!foundingWebhookSecretUsable()) return false;
  try {
    foundingClubBillingConfig();
    return true;
  } catch {
    return false;
  }
}
