'use server';

import { randomBytes } from 'node:crypto';
import { recordAge } from '@/app/signup/age-actions';
import { bracketForBirthYear } from '@/lib/age';
import type { SignupStartInput, SignupStartResult, VerifyCodeResult } from '@/lib/signup-types';
import {
  CAMPUS_EMAIL_USER_MESSAGES,
  isCampusEmailVerified,
  maskCampusEmail,
} from '@/lib/email-verification';
import {
  createPendingAuthUser,
  EmailVerificationError,
  findAuthUserByEmail,
  sendCampusEmailCode,
  verifyCampusEmailCode,
} from '@/lib/email-verification-service';
import { persistConfigured, alertsConfigured } from '@/lib/env';
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

    const recorded = await recordAge({
      email,
      birthYear: input.birthYear,
      guardianName: input.guardianName,
      guardianEmail: input.guardianEmail,
    });

    if (!recorded.ok) {
      const skippable =
        (recorded.kind === 'database' || recorded.kind === 'configuration') &&
        bracketForBirthYear(input.birthYear) === 'adult';
      if (!skippable) return { ok: false, message: recorded.message };
      logSignupFailure({ stage: 'record_age_optional', kind: recorded.kind ?? 'database' });
    }

    if (!persistConfigured()) {
      if (isProductionRuntime()) {
        logSignupFailure({ stage: 'start_signup', kind: 'configuration' });
        return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
      }
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
      if (isCampusEmailVerified(existing.user_metadata)) {
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

    const user = await createPendingAuthUser({
      email,
      metadata: {
        role: input.role,
        interests: interests.interests,
        ...(input.interestPreferences ? { interest_preferences: interests.profile } : {}),
        plan: input.plan,
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
    if (isCampusEmailVerified(user.user_metadata)) {
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

    const user = await findAuthUserByEmail(email);
    if (!user) return { ok: false, message: CAMPUS_EMAIL_USER_MESSAGES.missing };

    if (isCampusEmailVerified(user.user_metadata)) {
      const signedIn = await establishSession(user.id, email);
      if (!signedIn) return { ok: false, message: SIGNUP_CODE_RETRY_MESSAGE };
      return { ok: true };
    }

    await verifyCampusEmailCode({ userId: user.id, email, code: input.code });
    const signedIn = await establishSession(user.id, email);
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
