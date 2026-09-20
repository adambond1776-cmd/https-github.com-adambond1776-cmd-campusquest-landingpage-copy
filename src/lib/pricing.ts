/**
 * Every price CampusQuest quotes, in one place.
 *
 * Prices were duplicated across the pricing section, the onboarding wizard and
 * the welcome page, which is fine until the introductory period ends and three
 * files have to change together. They also have to agree with what Stripe
 * charges, and a number typed into JSX cannot be checked against anything.
 */

export type PlanId = 'free' | 'basic' | 'premium' | 'club';

export type Plan = {
  id: PlanId;
  name: string;
  /** What a new subscriber pays today, in whole dollars per month. */
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
 * The introductory offer.
 *
 * Deliberately has no end date. Adam's read is right: this could close in three
 * months if the pilot takes off or run for a year if it does not, and a
 * countdown to a date nobody can predict is either a broken promise or a lie
 * that gets quietly extended. Two commitments replace the date, and both are
 * things we can actually keep:
 *
 *   1. Whatever you sign up at is your price for as long as your subscription
 *      stays continuously active. Cancel and come back and you pay whatever is
 *      current.
 *   2. Thirty days' notice, on this page and by email, before the introductory
 *      price closes to new sign-ups.
 *
 * Set `closesOn` when the notice actually goes out, and the countdown becomes
 * real rather than manufactured.
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
      'Browse all campus events',
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
    tagline: 'Keep a profile, save events, and filter by what you love.',
    shortTagline: 'Profile, saved events, interest filters.',
    features: [
      'Everything in Free, plus:',
      'Personal user profile',
      'Save events for later',
      'Filter by your interests',
      'Follow clubs you love',
      'No ads, ever',
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
 * The promise attached to the introductory price, in the student's words.
 *
 * Kept here rather than inlined so the pricing page, the onboarding wizard and
 * any future email all make the same commitment.
 */
export const PRICE_LOCK_COPY =
  'Lock this price in. It stays yours for as long as your subscription stays active, even after the introductory rate ends.';

export const INTRO_NOTICE_COPY = `Introductory pricing while we run the Rhode Island pilot. When it ends we will say so here and by email ${INTRO_OFFER.noticeDays} days in advance, and it only affects people who sign up after that.`;
