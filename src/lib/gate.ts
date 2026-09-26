import { ageStore } from '@/lib/age-store';
import { allows, type AccessDecision, type AgeRecord, type Capability } from '@/lib/age';
import { sessionPrivileges } from '@/lib/session';
import { supabaseConfigured } from '@/lib/env';
import { isProductionRuntime } from '@/lib/runtime';
import { safeReturnPath } from '@/lib/return-path';
import { signedInEmail } from '@/lib/session';
import { redirect } from 'next/navigation';

export const VERIFY_CAMPUS_EMAIL_PATH = '/signup?verify=1';

/** Code entry for the account that is already signed in, then back to the feature. */
export function campusVerificationPath(returnTo?: string | null): string {
  const next = returnTo ? safeReturnPath(returnTo, '') : '';
  if (!next) return VERIFY_CAMPUS_EMAIL_PATH;
  return `${VERIFY_CAMPUS_EMAIL_PATH}&next=${encodeURIComponent(next)}`;
}

/**
 * Pending 6-digit signups must not use welcome, settings, or Genius Mining
 * until the server profile says the campus email is verified. A session or
 * Auth metadata flag is not enough.
 */
export async function redirectIfCampusEmailUnverified(returnTo?: string): Promise<void> {
  const access = await sessionPrivileges();
  if (access.state === 'signed-in' && !access.privileges.verified) {
    redirect(campusVerificationPath(returnTo));
  }
}

export type GateResult = AccessDecision & {
  /** Null when nobody is signed in. */
  record: AgeRecord | null;
  signedIn: boolean;
};

/**
 * Whether the current visitor may use a capability.
 *
 * Signed out is treated as allowed, not blocked. The activity directory is
 * public information about public events, and putting an age wall in front of a
 * list of football fixtures would be theatre: anyone refused could read the same
 * page on the university's own site. The gate exists to keep the promises made
 * to a guardian about what their student's *account* can do, so it starts
 * mattering once there is an account to make promises about.
 *
 * Capabilities that write something or cost something — contributing, the
 * instrument, billing — require a session anyway, and their callers check that
 * separately.
 */
export async function gate(capability: Capability): Promise<GateResult> {
  const email = await signedInEmail();
  if (!email) {
    if (capability === 'genius_mining' || capability === 'billing') {
      return {
        allowed: false,
        reason: 'Sign in to continue.',
        record: null,
        signedIn: false,
      };
    }
    return { allowed: true, reason: '', record: null, signedIn: false };
  }

  const record = await ageStore().get(email);
  return { ...allows(record, capability), record, signedIn: true };
}

/**
 * Genius Mining is 18+ and requires a signed-in adult with an age record.
 * Local development without Supabase has no age store identity, so the
 * instrument stays walkable there.
 */
export async function requireGeniusMiningAccess(returnTo = '/genius-mining'): Promise<GateResult> {
  if (!supabaseConfigured()) {
    if (isProductionRuntime()) {
      return {
        allowed: false,
        reason: 'Genius Mining is temporarily unavailable.',
        record: null,
        signedIn: false,
      };
    }
    return { allowed: true, reason: '', record: null, signedIn: false };
  }

  await redirectIfCampusEmailUnverified(returnTo);
  return gate('genius_mining');
}
