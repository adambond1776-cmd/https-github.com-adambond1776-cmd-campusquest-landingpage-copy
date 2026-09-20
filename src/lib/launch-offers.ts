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
  'One payment covers the full founding period. No automatic renewal.';

export const LAUNCH_AVAILABILITY =
  'Preview only. Paid access is not open yet, and this page cannot accept payment.';

export const CLUB_DISCOVERY_POLICY =
  'Clubs do not have to pay to appear in CampusQuest. Corrections are always free, and paying for club tools does not move a club higher in discovery.';

export const SPONSOR_POLICY =
  'CampusQuest may show a small number of clearly labeled sponsor messages, including on paid plans. No pop-ups, and sponsorship does not change organic recommendations.';

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
