/**
 * Single source of truth for the legal surface: who the operator is, when the
 * documents last changed, and what a student is actually agreeing to.
 *
 * NOT LEGAL ADVICE. Everything in this file was drafted to be accurate about
 * what the software does, which is the part an engineer can be responsible for.
 * A licensed attorney has to review it before real students and real money are
 * involved. `legalReviewPending()` reports that state so the site can be honest
 * about it rather than implying a review that has not happened.
 */

import { partnershipEmail } from '@/lib/env';

function str(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * The two-entity structure.
 *
 * Hidden Genius Labs LLC holds the intellectual property — the Genius Mining
 * method, the instrument, the curriculum, and the code — and licenses it to
 * CampusQuest, Inc., the Delaware C corporation that operates the service and
 * is the merchant of record.
 *
 * Keeping ownership in the holding company and economics in the operating
 * company is what lets partners take a stake in CampusQuest without acquiring
 * any claim on the method itself. It also means a university evaluating the
 * pilot is contracting with the operator, not the IP owner, which is the point
 * of scoping institutions as evaluators rather than co-developers.
 */
export const IP_HOLDER = 'Hidden Genius Labs LLC';

/**
 * The entity that operates CampusQuest and answers for the data.
 *
 * A privacy policy has to name a controller and a postal address; "CampusQuest"
 * is a product, not a legal person. The exact registered name and address still
 * come from configuration rather than being hardcoded, so incorporation details
 * can be corrected without a deploy.
 */
export function legalEntity(): string | undefined {
  return str('CQ_LEGAL_ENTITY') ?? 'CampusQuest, Inc.';
}

export function legalAddress(): string | undefined {
  return str('CQ_LEGAL_ADDRESS');
}

export function privacyEmail(): string {
  return str('CQ_PRIVACY_EMAIL') ?? partnershipEmail();
}

/**
 * What is still missing from the legal surface.
 *
 * The documents render a visible banner listing these rather than quietly
 * omitting them. A policy with a silent hole looks deliberate in a dispute; one
 * that names its own gaps does not.
 */
export function legalGaps(): string[] {
  const gaps: string[] = [];
  if (!legalAddress()) gaps.push('a registered postal address for the operator');
  if (!attorneyReviewed()) gaps.push('review by a licensed attorney');
  return gaps;
}

/** Set once counsel has signed off, which is not the same as the text existing. */
export function attorneyReviewed(): boolean {
  return str('CQ_LEGAL_REVIEWED') === 'true';
}

export function legalReviewPending(): boolean {
  return legalGaps().length > 0;
}

export function operatorName(): string {
  return legalEntity() ?? 'CampusQuest, Inc.';
}

/**
 * Document versions.
 *
 * Bump these when substance changes, never for typos. Consent records store the
 * version a student accepted, so a bump is what lets us tell who agreed to what.
 */
export const PRIVACY_VERSION = '1.0';
export const TERMS_VERSION = '1.0';
export const LEGAL_EFFECTIVE_DATE = '2026-09-07';

export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * What a student's data can be used for, as separately granted layers.
 *
 * The layering is the whole design. Running a product and running human-subjects
 * research are different activities with different rules, and bundling them into
 * one signup checkbox is how a pilot ends up in front of a review board it never
 * applied to. Each tier is granted on its own, and a tier cannot start until the
 * one before it has.
 */
export type ConsentTier = {
  id: 'service' | 'improvement' | 'research';
  label: string;
  /** How the student grants it. */
  granted: string;
  /** Plain-language scope. */
  scope: string;
  /** What we are not allowed to do under this tier. */
  limits: string;
  /** Whether the tier is live today. */
  active: boolean;
};

export const CONSENT_TIERS: ConsentTier[] = [
  {
    id: 'service',
    label: 'Running the service',
    granted: 'By creating an account.',
    scope:
      'Your email address, the campus you picked, the activities you save, and the plan you are on. This is the minimum needed to sign you in and show you a list that remembers what you liked.',
    limits:
      'We do not sell it, we do not rent it, and we do not hand it to advertisers. No third party buys access to who you are.',
    active: true,
  },
  {
    id: 'improvement',
    label: 'Improving the instrument',
    granted: 'By a separate checkbox on the Genius Mining consent screen, before you answer anything.',
    scope:
      'When your identified answers are deleted, a de-identified copy of the structured parts can be kept to check whether the instrument works: how many items you listed, how long your answers ran, which working word came out, and the confidence rating. No name, no email, no student ID.',
    limits:
      'While the pilot cohort is small, free-text answers are dropped entirely rather than de-identified, because a narrative paragraph from a group this size can identify its author no matter what is stripped from it. This tier is product quality work, not research, and nothing under it is published.',
    active: true,
  },
  {
    id: 'research',
    label: 'Research',
    granted:
      'Not currently offered. If it is ever offered it will be its own consent form, reviewed by an institutional review board, signed separately, and declinable with no effect on anything you paid for.',
    scope:
      'Study of whether the instrument predicts anything real, run with a named faculty investigator at a partner institution, under an approved protocol.',
    limits:
      'No data collected before that approval is used in it. Consenting is not a condition of using CampusQuest, and refusing costs you nothing.',
    active: false,
  },
];

/** The one-line version for the sitewide footer. */
export const FOOTER_CONSENT_LINE =
  'CampusQuest stores only what it needs to run your account and never sells student data. Genius Mining is optional, asks for its own consent before you answer anything, and deletes your identified answers on request.';
