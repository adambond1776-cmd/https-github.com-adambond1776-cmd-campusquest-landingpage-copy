'use server';

import { randomBytes } from 'node:crypto';
import { recordAge } from '@/app/signup/age-actions';
import type { SignupStartInput, SignupStartResult, VerifyCodeResult } from '@/lib/signup-types';
import { ensureUnverifiedProfileShell, isServerAccountVerified } from '@/lib/account/profile';
import { sessionPrivileges } from '@/lib/session';
import {
  CAMPUS_EMAIL_USER_MESSAGES,
  maskCampusEmail,
} from '@/lib/email-verification';
import {
  createPendingAuthUser,
  EmailVerificationError,
  findAuthUserByEmail,
  sendCampusEmailCode,
  verifyCampusEmailCode,
} from '@/lib/email-verification-service';
import { adminEmails, persistConfigured, alertsConfigured } from '@/lib/env';
import { AUTH_UNCONFIGURED_MESSAGE, isProductionRuntime } from '@/lib/runtime';
import {
  classifySignupError,
  logSignupFailure,
  logSignupSuccess,
  SIGNUP_CODE_RETRY_MESSAGE,
} from '@/lib/signup-diagnostics';
import { normalizeEmail, studentSignupEmailRejection } from '@/lib/signup-email-policy';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateEmail } from '@/lib/validation';
import { validateInterestProfile, validateInterests } from '@/lib/interests';

export type { SignupStartInput, SignupStartResult, VerifyCodeResult };

function mayVerifyExistingEmail(email: string): boolean {
  if (!studentSignupEmailRejection(email)) return true;
  const normalized = normalizeEmail(email);
  return adminEmails().some((entry) => normalizeEmail(entry) === normalized);
}

function asVerificationMessage(error: unknown): string {
  if (error instanceof EmailVerificationError) return error.message;
  const kind = classifySignupError(error);
  if (kind === 'configuration') return AUTH_UNCONFIGURED_MESSAGE;
  return SIGNUP_CODE_RETRY_MESSAGE;
}

/**
 * Mints a session without sending a Supabase magic-link or confirm-signup email.
 * `generateLink` emails the user, so we rotate a one-shot password instead.
 */
async function establishSession(userId: string, email: string): Promise<boolean> {
  const admin = createAdminClient();
  const supabase = await createClient();
  if (!admin || !supabase) return false;

  const password = randomBytes(32).toString('base64url');
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) return false;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return !signInError;
}

/**
 * Creates a pending Auth user (email already confirmed in Supabase so no
 * "Confirm Your Signup" mail is sent) and emails a CampusQuest 6-digit code.
 * Does not create a session. Does not claim a code was sent unless Resend accepted it.
 */
export async function startCampusSignup(input: SignupStartInput): Promise<SignupStartResult> {
  try {
    const interests = input.interestPreferences === undefined
      ? validateInterests(input.interests) : validateInterestProfile(input.interestPreferences);
    if (!interests.ok) return interests;
    const email = normalizeEmail(input.email);
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, message: emailError };

    if (input.role === 'student') {
      const domainError = studentSignupEmailRejection(email);
      if (domainError) return { ok: false, message: domainError };
    }

    if (!persistConfigured()) {
      if (isProductionRuntime()) {
        logSignupFailure({ stage: 'start_signup', kind: 'configuration' });
        return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
      }
      const recorded = await recordAge({
        email,
        birthYear: input.birthYear,
        guardianName: input.guardianName,
        guardianEmail: input.guardianEmail,
      });
      if (!recorded.ok) return { ok: false, message: recorded.message };
      logSignupSuccess('start_signup_mock');
      return {
        ok: true,
        mock: true,
        alreadyRegistered: false,
        needsVerification: true,
        emailMasked: maskCampusEmail(email),
      };
    }

    if (isProductionRuntime() && !alertsConfigured()) {
      logSignupFailure({ stage: 'start_signup', kind: 'email' });
      return { ok: false, message: CAMPUS_EMAIL_USER_MESSAGES.sendFailed };
    }

    const existing = await findAuthUserByEmail(email);
    if (existing) {
      if (await isServerAccountVerified(existing.id)) {
        return {
          ok: false,
          message: CAMPUS_EMAIL_USER_MESSAGES.alreadyRegistered,
        };
      }

      const sent = await sendCampusEmailCode({ userId: existing.id, email });
      logSignupSuccess('resend_unverified_signup');
      return {
        ok: true,
        mock: false,
        alreadyRegistered: true,
        needsVerification: true,
        emailMasked: sent.emailMasked,
      };
    }

    const recorded = await recordAge({
      email,
      birthYear: input.birthYear,
      guardianName: input.guardianName,
      guardianEmail: input.guardianEmail,
    });

    if (!recorded.ok) {
      return { ok: false, message: recorded.message };
    }

    const user = await createPendingAuthUser({
      email,
      role: input.role,
      metadata: {
        interests: interests.interests,
        ...(input.interestPreferences ? { interest_preferences: interests.profile } : {}),
      },
    });

    const sent = await sendCampusEmailCode({ userId: user.id, email });
    logSignupSuccess('start_signup');
    return {
      ok: true,
      mock: false,
      alreadyRegistered: false,
      needsVerification: true,
      emailMasked: sent.emailMasked,
    };
  } catch (error) {
    logSignupFailure({
      stage: 'start_signup',
      kind: error instanceof EmailVerificationError && error.code === 'send_failed' ? 'email' : classifySignupError(error),
    });
    return { ok: false, message: asVerificationMessage(error) };
  }
}

export async function resendCampusSignupCode(email: string): Promise<SignupStartResult> {
  try {
    const normalized = normalizeEmail(email);
    const emailError = validateEmail(normalized);
    if (emailError) return { ok: false, message: emailError };

    if (!persistConfigured()) {
      if (isProductionRuntime()) return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
      return {
        ok: true,
        mock: true,
        alreadyRegistered: false,
        needsVerification: true,
        emailMasked: maskCampusEmail(normalized),
      };
    }

    const user = await findAuthUserByEmail(normalized);
    if (!user) return { ok: false, message: CAMPUS_EMAIL_USER_MESSAGES.missing };
    if (await isServerAccountVerified(user.id)) {
      return { ok: false, message: CAMPUS_EMAIL_USER_MESSAGES.alreadyVerified };
    }

    const sent = await sendCampusEmailCode({ userId: user.id, email: normalized });
    logSignupSuccess('resend_signup_code');
    return {
      ok: true,
      mock: false,
      alreadyRegistered: false,
      needsVerification: true,
      emailMasked: sent.emailMasked,
    };
  } catch (error) {
    logSignupFailure({ stage: 'resend_signup_code', kind: classifySignupError(error) });
    return { ok: false, message: asVerificationMessage(error) };
  }
}

export async function verifyCampusSignupCode(input: {
  email: string;
  code: string;
}): Promise<VerifyCodeResult> {
  try {
    const email = normalizeEmail(input.email);
    if (!persistConfigured()) {
      if (isProductionRuntime()) return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
      if (!/^\d{6}$/.test(input.code.trim())) {
        return { ok: false, message: CAMPUS_EMAIL_USER_MESSAGES.incorrect };
      }
      return { ok: true };
    }

    const session = await sessionPrivileges();
    const sessionMatch =
      session.state === 'signed-in' && normalizeEmail(session.email) === email ? session.userId : null;
    const userId = sessionMatch ?? (await findAuthUserByEmail(email))?.id ?? null;
    if (!userId) return { ok: false, message: CAMPUS_EMAIL_USER_MESSAGES.missing };

    if (await isServerAccountVerified(userId)) {
      if (sessionMatch === userId) return { ok: true };
      const signedIn = await establishSession(userId, email);
      if (!signedIn) return { ok: false, message: SIGNUP_CODE_RETRY_MESSAGE };
      return { ok: true };
    }

    await verifyCampusEmailCode({ userId, email, code: input.code });
    if (sessionMatch === userId) return { ok: true };
    const signedIn = await establishSession(userId, email);
    if (!signedIn) {
      logSignupFailure({ stage: 'verify_signup_session', kind: 'supabase_auth' });
      return { ok: false, message: SIGNUP_CODE_RETRY_MESSAGE };
    }

    logSignupSuccess('verify_signup_code');
    return { ok: true };
  } catch (error) {
    logSignupFailure({ stage: 'verify_signup_code', kind: classifySignupError(error) });
    return { ok: false, message: asVerificationMessage(error) };
  }
}

/**
 * Sends a campus code to the signed-in account. Does not create an Auth user,
 * replace a profile, or rewrite age and interests.
 */
export async function startExistingAccountVerification(): Promise<
  | { ok: true; alreadyVerified: true; emailMasked: string }
  | { ok: true; alreadyVerified: false; mock: boolean; emailMasked: string }
  | { ok: false; message: string }
> {
  try {
    const session = await sessionPrivileges();
    if (session.state !== 'signed-in') {
      return { ok: false, message: 'Sign in before verifying your URI email.' };
    }
    if (session.privileges.verified) {
      return { ok: true, alreadyVerified: true, emailMasked: maskCampusEmail(session.email) };
    }

    if (!mayVerifyExistingEmail(session.email)) {
      return { ok: false, message: studentSignupEmailRejection(session.email) ?? CAMPUS_EMAIL_USER_MESSAGES.sendFailed };
    }

    if (!persistConfigured()) {
      if (isProductionRuntime()) return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
      return {
        ok: true,
        alreadyVerified: false,
        mock: true,
        emailMasked: maskCampusEmail(session.email),
      };
    }

    const admin = createAdminClient();
    if (!admin) return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
    await ensureUnverifiedProfileShell(admin, session.userId);

    try {
      const sent = await sendCampusEmailCode({ userId: session.userId, email: session.email });
      return {
        ok: true,
        alreadyVerified: false,
        mock: false,
        emailMasked: sent.emailMasked,
      };
    } catch (error) {
      if (error instanceof EmailVerificationError && (error.code === 'cooldown' || error.code === 'rate_limit')) {
        return {
          ok: true,
          alreadyVerified: false,
          mock: false,
          emailMasked: maskCampusEmail(session.email),
        };
      }
      throw error;
    }
  } catch (error) {
    logSignupFailure({ stage: 'start_existing_verification', kind: classifySignupError(error) });
    return { ok: false, message: asVerificationMessage(error) };
  }
}

/**
 * The signup wizard's student/organization choice is presentation only.
 * It is not written to profiles.role and it does not authorize club tools,
 * billing, or any other sensitive action.
 */
export async function saveAccountRole(
  role: 'student' | 'organization'
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (role !== 'student' && role !== 'organization') {
    return { ok: false, message: 'Choose student or organization.' };
  }
  return { ok: true };
}
