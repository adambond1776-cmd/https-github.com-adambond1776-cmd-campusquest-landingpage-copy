/** Separate from the legacy Genius Mining tiers. No subscription here grants GM. */
export const BILLING_PLANS = {
  basic: { name: 'Basic', cents: 300, features: ['Interest-based recommendations', 'Profile and preferences', 'Weekly updates and saved events: planned'] },
  plus: { name: 'Plus', cents: 500, features: ['Everything in Basic', 'Monthly activity plans and sharing: planned', 'Personal invitations: planned'] },
} as const;
export type PaidPlan = keyof typeof BILLING_PLANS;
export type BillingScope = 'student' | 'club';
export type SubscriptionPlan = PaidPlan | 'club';
export type BillingStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'unpaid' | 'paused' | 'incomplete' | 'incomplete_expired' | 'canceled';
export type SubscriptionView = {
  plan: SubscriptionPlan | null;
  status: BillingStatus;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
};
export const EMPTY_SUBSCRIPTION: SubscriptionView = { plan: null, status: 'none', periodEnd: null, cancelAtPeriodEnd: false };
export function isPaidPlan(value: unknown): value is PaidPlan { return value === 'basic' || value === 'plus'; }

/** A payment-provider verified snapshot only, never user_metadata or URL params. */
export function subscriptionAccess(subscription: SubscriptionView, now = Date.now()) {
  const paid = subscription.status === 'active' && isPaidPlan(subscription.plan)
    && subscription.periodEnd !== null && subscription.periodEnd * 1000 > now;
  return {
    plan: paid && isPaidPlan(subscription.plan) ? subscription.plan : 'free' as const,
    recommendations: paid,
    savedEvents: paid,
    weeklyUpdates: paid,
    monthlyPlan: paid && subscription.plan === 'plus',
    sharing: paid && subscription.plan === 'plus',
    geniusMining: false as const,
    automatedTexts: false as const,
  };
}

export type BillingView = {
  subscription: SubscriptionView;
  available: boolean;
  message?: string;
};
export type BillingCommand = 'basic' | 'plus' | 'cancel' | 'resume' | 'refresh';
export type BillingResult = { ok: true; view: BillingView; url?: string } | { ok: false; message: string };
