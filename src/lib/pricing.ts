/**
 * Legacy monthly TEST catalog. Founding-offer presentation is in launch-offers.ts.
 * Do not use these monthly amounts as one-time Stripe prices.
 *
 * Numeric catalog fields stay unchanged for Nick's existing test integrations.
 * Customer-facing descriptions are updated without granting paid access.
 */

export type PlanId = 'free' | 'basic' | 'premium' | 'club';

export type Plan = {
  id: PlanId;
  name: string;
  /** Legacy TEST monthly amount, not a live charge or a founding-pass price. */
  price: number;
  /** What this plan costs once the introductory period closes. */
  standardPrice: number;
  tagline: string;
  /** One-line version for the cramped plan picker in onboarding. */
  shortTagline: string;
  features: string[];
  cta: string;
};

/**
 * Legacy monthly TEST offer metadata, retained for compatibility only.
 * This is not the founding-pass offer and does not establish current customer
 * commitments. Reconcile old billing terms before enabling any live purchases.
 */
export const INTRO_OFFER = {
  open: true,
  /** ISO date, set only once the 30-day notice has gone out. */
  closesOn: null as string | null,
  noticeDays: 30,
} as const;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    standardPrice: 0,
    tagline: 'Browse and discover events, clubs, and activities on campus.',
    shortTagline: 'Browse events, clubs, and activities.',
    features: [
      'Browse available campus events',
      'View club pages and profiles',
      'Search by category or location',
      "See what's happening this week",
    ],
    cta: 'Start browsing',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 3,
    standardPrice: 5,
    tagline: 'Planned: save searches and events to return to later.',
    shortTagline: 'Saved searches and events, planned.',
    features: [
      'Everything in Free, plus:',
      'Existing interest preferences stay available',
      'Planned: save searches and events for later',
      'Free public search and category filters',
      'Planned: follow clubs you love',
      'Limited, clearly labeled sponsor messages',
    ],
    cta: 'Go Basic',
  },
  premium: {
    id: 'premium',
    name: 'Plus',
    price: 5,
    standardPrice: 9,
    tagline:
      'Planned: your next-month activity plan and easy sharing with friends, plus Basic.',
    shortTagline: 'Monthly plans and sharing, planned. Genius Mining comes later.',
    features: [
      'Everything in Basic, plus:',
      'Planned: save a next-month activity plan',
      'Planned: share selected events with friends',
      'Planned: invitations through your own messaging app',
      'Genius Mining is in development, not included at launch',
    ],
    cta: 'Go Plus',
  },
  club: {
    id: 'club',
    name: 'Club',
    price: 49,
    standardPrice: 49,
    tagline: 'Your club page, event publishing and organized membership inquiries.',
    shortTagline: 'Club page, events and membership inquiries.',
    features: [
      'One editable club page with a shareable address',
      'Create, edit and cancel individual events',
      'Reviewed listings in campus discovery',
      'Private, consent-based membership inquiries',
      'Email notifications: preview-only during testing',
      'One verified owner; ownership review required',
    ],
    cta: 'Claim your club page',
  },
};

/** Live checkout is disabled. The separate /billing flow accepts TEST keys only. */
export const CHECKOUT_LIVE = false;

export const STUDENT_PLANS: Plan[] = [PLANS.free, PLANS.basic, PLANS.premium];

/** What a university pays per student per year for Genius Mining. */
export const INSTITUTIONAL_SEAT_PRICE = 25;

/** What a student pays to throw away a finished profile and start over. */
export const FULL_RESTART_FEE = 25;

export function formatPrice(dollars: number): string {
  return `$${dollars}`;
}

/** True when a plan is currently below the price it will settle at. */
export function isDiscounted(plan: Plan): boolean {
  return INTRO_OFFER.open && plan.standardPrice > plan.price;
}

/**
 * Compatibility exports for existing consumers. No perpetual price lock is
 * offered by the founding-pass presentation.
 */
export const PRICE_LOCK_COPY =
  'Founding offers are planned as one-time purchases with no automatic renewal. Paid checkout is not open.';

export const INTRO_NOTICE_COPY = 'Final availability and purchase terms will be shown before checkout opens.';
