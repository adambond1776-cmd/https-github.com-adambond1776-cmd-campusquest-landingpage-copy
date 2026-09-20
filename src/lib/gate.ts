import { ageStore } from '@/lib/age-store';
import { allows, type AccessDecision, type AgeRecord, type Capability } from '@/lib/age';
import { needsCampusEmailVerification } from '@/lib/email-verification';
import { supabaseConfigured } from '@/lib/env';
import { isProductionRuntime } from '@/lib/runtime';
import { signedInEmail } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const VERIFY_CAMPUS_EMAIL_PATH = '/signup?verify=1';

/**
 * Pending 6-digit signups must not use welcome, settings, or Genius Mining
 * until the code has been verified. Grandfathered accounts (no pending flag)
 * pass through.
 */
export async function redirectIfCampusEmailUnverified(): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (needsCampusEmailVerification(metadata)) {
    redirect(VERIFY_CAMPUS_EMAIL_PATH);
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

  if (!record) {
    if (capability === 'genius_mining' || capability === 'billing') {
      return {
        allowed: false,
        reason: 'Tell us your age first so we know what we can show you.',
        record: null,
        signedIn: true,
      };
    }
    // Directory: accounts created before the gate existed have no answer on
    // file. Rather than lock people out of public listings, they are let
    // through and asked the next time they hit something that needs an adult.
    return { allowed: true, reason: '', record: null, signedIn: true };
  }

  return { ...allows(record, capability), record, signedIn: true };
}

/**
 * Genius Mining is 18+ and requires a signed-in adult with an age record.
 * Local development without Supabase has no age store identity, so the
 * instrument stays walkable there.
 */
export async function requireGeniusMiningAccess(): Promise<GateResult> {
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

  await redirectIfCampusEmailUnverified();
  return gate('genius_mining');
}
