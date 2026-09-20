/**
 * What a student is paying for, and what that payment currently buys.
 *
 * This module knows about money only. Whether a student may *use* Genius Mining
 * is a separate question answered in `entitlement.ts`, because an institution
 * can cover a student who is paying nothing.
 */

export type Tier = 'free' | 'basic' | 'premium' | 'club';

/**
 * Stripe subscription statuses, plus `none` for a student with no subscription
 * record at all.
 */
export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled';

export type SubscriptionSnapshot = {
  tier: Tier;
  status: SubscriptionStatus;
};

/** Paid tiers that include Genius Mining on their own, with no institution behind them. */
export const GENIUS_MINING_TIERS = ['premium'] as const;

/** Paid tiers that include the social layer: friend invites, shared feeds, club membership. */
export const SOCIAL_TIERS = ['premium'] as const;

/**
 * Payment trouble is not the same as losing the tier.
 *
 * `past_due` and `unpaid` are both recoverable — the card failed and Stripe is
 * still retrying. Neither starts the deletion clock. When Stripe gives up it
 * emits `canceled`, and that is the event we act on. Deleting a paying student's
 * profile because their card expired is the failure mode this list exists to
 * prevent.
 */
export const PAYMENT_GRACE_STATUSES: SubscriptionStatus[] = ['past_due', 'unpaid', 'incomplete'];

/** Statuses that mean the subscription is genuinely over. */
export const TERMINAL_STATUSES: SubscriptionStatus[] = [
  'none',
  'canceled',
  'incomplete_expired',
  'paused',
];

/**
 * Whether the subscription by itself entitles the student to Genius Mining.
 *
 * True for an active or trialing Genius Mining tier, and still true while a
 * payment is failing. False once the subscription actually ends, and false the
 * moment the tier drops to Basic or Free even if billing is otherwise healthy —
 * a downgrade is a loss of the tier.
 *
 * Callers deciding what a student may do should ask `resolveEntitlement`
 * instead. This answers the narrower question of what the money bought.
 */
export function hasGeniusMining(subscription: SubscriptionSnapshot): boolean {
  const tierQualifies = (GENIUS_MINING_TIERS as readonly string[]).includes(subscription.tier);
  if (!tierQualifies) return false;
  return !TERMINAL_STATUSES.includes(subscription.status);
}

/** Whether the subscription by itself entitles the student to the social layer. */
export function hasSocialFeatures(subscription: SubscriptionSnapshot): boolean {
  const tierQualifies = (SOCIAL_TIERS as readonly string[]).includes(subscription.tier);
  if (!tierQualifies) return false;
  return !TERMINAL_STATUSES.includes(subscription.status);
}

/** Whether Stripe is still trying to collect, rather than having given up. */
export function inPaymentGrace(subscription: SubscriptionSnapshot): boolean {
  return PAYMENT_GRACE_STATUSES.includes(subscription.status);
}

/** Whether there is anything left to cancel or refund. */
export function isBillable(subscription: SubscriptionSnapshot): boolean {
  if (subscription.tier === 'free') return false;
  return !TERMINAL_STATUSES.includes(subscription.status);
}
