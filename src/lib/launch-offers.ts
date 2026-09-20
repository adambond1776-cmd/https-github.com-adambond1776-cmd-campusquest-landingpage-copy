import { PLANS, type PlanId } from '@/lib/pricing';

/**
 * Presentation only. These proposals do NOT create Stripe prices, entitlements,
 * renewals or rewards. Nick must implement and verify those before release.
 * Keep the existing monthly TEST catalog unchanged.
 */
export const FOUNDING_OFFERS = {
  student: { amount: 5, days: 60, optionalMonthly: PLANS.basic.price },
  club: { amount: 99, days: 90, optionalMonthly: PLANS.club.price },
  sponsor: { amount: 2500, days: 90, studentPasses: 50, clubPlaces: 5 },
} as const;

export const FOUNDING_TERMS =
  'One payment. No automatic renewal. Any later subscription requires a separate choice.';

export const LAUNCH_AVAILABILITY =
  'Offer preview. Paid access is not open and no payment is collected here.';

export const CLUB_DISCOVERY_POLICY =
  'Eligible clubs and their public activities can appear whether or not they pay. Listing corrections are free; paid tools do not buy a higher position in discovery.';

export const SPONSOR_POLICY =
  'Limited, clearly labeled sponsor messages may appear on homepages, including paid experiences. No pop-ups or paid changes to organic recommendations.';

export function launchPlanDisplay(id: PlanId): { price: string; period: string } {
  if (id === 'free') return { price: '$0', period: '' };
  if (id === 'basic') {
    return { price: `$${FOUNDING_OFFERS.student.amount}`, period: ` / ${FOUNDING_OFFERS.student.days} days` };
  }
  if (id === 'club') {
    return { price: `$${FOUNDING_OFFERS.club.amount}`, period: ` / ${FOUNDING_OFFERS.club.days} days` };
  }
  return { price: 'Later', period: '' };
}

export type SponsorPlacement = {
  name: string;
  message: string;
  href: string;
};

/** No sponsor is implied or advertised until an approved placement is supplied. */
export const ACTIVE_SPONSOR: SponsorPlacement | null = null;

export function safeSponsorHref(href: string): string | null {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
