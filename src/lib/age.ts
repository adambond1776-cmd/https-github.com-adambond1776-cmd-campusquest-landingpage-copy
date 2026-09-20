import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Who is old enough to do what.
 *
 * The important decision here is that the age gate is per capability rather
 * than per site. Browsing a directory of public campus events and writing
 * several paragraphs about your own life that then get sent to a language model
 * are not the same act, and a single "are you 18?" checkbox at the door treats
 * them as though they were.
 *
 * So: a sixteen-year-old with a guardian's consent can use the directory, which
 * is public information about public events. Genius Mining stays adults-only
 * until counsel says otherwise, because that is where the sensitive material is.
 *
 * NOT LEGAL ADVICE. The brackets and the consent mechanism below are a
 * defensible default, not a compliance guarantee. See `CONSENT_ASSURANCE_NOTE`.
 */

export type AgeBracket =
  /** 18 or over. Can do everything, including agreeing to be billed. */
  | 'adult'
  /** 16 or 17. Needs a guardian, and cannot reach the instrument or billing. */
  | 'minor'
  /** Under 16. Not eligible; we do not collect anything. */
  | 'under_16'
  | 'unknown';

export const MINIMUM_AGE = 16;
export const ADULT_AGE = 18;

export type Capability =
  /** Browse and search the activity directory. */
  | 'directory'
  /** Report a dead listing or suggest a missing one. */
  | 'contribute'
  /** Take the Genius Mining instrument. */
  | 'genius_mining'
  /** Hold a paid subscription in your own name. */
  | 'billing';

export type GuardianConsent = {
  guardian_name: string;
  guardian_email: string;
  /** When the student asked us to email their guardian. */
  requested_at: string;
  /** Null until the guardian follows the link and affirms. */
  consented_at: string | null;
  /** SHA-256 of the emailed token. The raw token is never stored. */
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  /** Which documents the guardian actually agreed to. */
  terms_version: string;
  privacy_version: string;
};

export type AgeRecord = {
  bracket: AgeBracket;
  /** Year only. A full date of birth is more identifying than we need. */
  birth_year: number | null;
  attested_at: string;
  guardian: GuardianConsent | null;
};

export function bracketForBirthYear(birthYear: number, now: Date = new Date()): AgeBracket {
  // Year-only means the age is uncertain by up to a year, so this reads the
  // youngest the student could be. Erring young is the safe direction.
  const youngest = now.getUTCFullYear() - birthYear - 1;

  if (youngest >= ADULT_AGE) return 'adult';
  if (youngest >= MINIMUM_AGE - 1) return 'minor';
  return 'under_16';
}

/**
 * Consent is live once given and not withdrawn.
 *
 * The token expiry deliberately does not apply here. It bounds how long a
 * guardian has to respond to the request; once they have responded, the consent
 * does not lapse on a timer.
 */
export function guardianConsentActive(consent: GuardianConsent | null): boolean {
  if (!consent?.consented_at) return false;
  if (consent.revoked_at) return false;
  return true;
}

export type AccessDecision = {
  allowed: boolean;
  /** Shown to the student. Written to be read by a person, not logged. */
  reason: string;
};

/**
 * Whether this account may use a given part of the service.
 *
 * Genius Mining and billing are adults-only on purpose:
 *
 * The instrument collects long-form writing about someone's life and sends it
 * to a third-party language model. Doing that to a minor raises a materially
 * different set of obligations, and it changes the research picture too — a
 * study involving minors needs parental permission plus the child's own assent
 * and lands in a higher review category. None of that is impossible, but it is
 * work to be done deliberately rather than inherited by accident.
 *
 * Billing is separate and simpler: a minor generally cannot be held to a
 * contract, so a subscription in a minor's own name is not a thing we should
 * sell. A guardian can pay for a seat, and an institution covering a seat works
 * for any age.
 */
export function allows(record: AgeRecord | null, capability: Capability): AccessDecision {
  if (!record || record.bracket === 'unknown') {
    return { allowed: false, reason: 'Tell us your age first so we know what we can show you.' };
  }

  if (record.bracket === 'under_16') {
    return {
      allowed: false,
      reason: `CampusQuest is for students aged ${MINIMUM_AGE} and over.`,
    };
  }

  if (record.bracket === 'adult') return { allowed: true, reason: '' };

  // Everything below is a 16 or 17 year old.
  const consented = guardianConsentActive(record.guardian);

  if (capability === 'genius_mining') {
    return {
      allowed: false,
      reason:
        'Genius Mining is available to students aged 18 and over. It asks you to write at length about your own life, and we are not opening that to under-18s until the safeguards have been reviewed properly.',
    };
  }

  if (capability === 'billing') {
    return {
      allowed: false,
      reason:
        'A subscription has to be held by an adult. A parent or guardian can buy a seat for you, and if your school covers seats, yours is covered at any age.',
    };
  }

  if (!consented) {
    return {
      allowed: false,
      reason:
        'We need a parent or guardian to confirm before your account opens. We have emailed them a link; nothing happens until they follow it.',
    };
  }

  return { allowed: true, reason: '' };
}

/* ------------------------------------------------------------------ *
 * Guardian consent tokens
 * ------------------------------------------------------------------ */

/** A guardian has two weeks to respond before the request lapses. */
export const CONSENT_TOKEN_TTL_DAYS = 14;

export function createConsentToken(): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashConsentToken(token),
    expiresAt: new Date(Date.now() + CONSENT_TOKEN_TTL_DAYS * 86_400_000).toISOString(),
  };
}

export function hashConsentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare, so a wrong token cannot be found by timing the reply. */
export function consentTokenMatches(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashConsentToken(token), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function consentTokenExpired(consent: GuardianConsent, now: Date = new Date()): boolean {
  const expiry = new Date(consent.expires_at);
  return Number.isNaN(expiry.getTime()) || expiry < now;
}

/**
 * What emailing a guardian a link does and does not prove.
 *
 * It proves someone with access to that mailbox agreed. It does not prove they
 * are the student's parent, and a determined sixteen-year-old can create an
 * address in ninety seconds. This is the lowest rung of what regulators
 * recognise as verifiable parental consent, and it is chosen here because it is
 * proportionate to what a minor can actually reach on this service: a directory
 * of public campus events. It is deliberately not enough for the instrument,
 * which is why the instrument stays adults-only.
 *
 * If the minor pathway is ever extended, the verification has to get stronger
 * first — a small refunded card charge or an identity check — and that is a
 * decision for counsel, not for this file.
 */
export const CONSENT_ASSURANCE_NOTE =
  'Email confirmation shows that someone at that address agreed. It does not prove a family relationship, which is why under-18 accounts are limited to the activity directory.';
