'use server';

import { alertsConfigured, mailFrom, persistConfigured, supabaseConfigured } from '@/lib/env';
import { findAuthUserByEmail } from '@/lib/email-verification-service';
import { logLoginDiagnostic } from '@/lib/login-diagnostics';
import { deliverLoginLink, loginCallbackUrl, type LoginLinkResult } from '@/lib/login-link';
import { sendLoginEmail } from '@/lib/login-mail';
import { AUTH_UNCONFIGURED_MESSAGE, isProductionRuntime } from '@/lib/runtime';
import { SIGNUP_RETRY_MESSAGE } from '@/lib/signup-diagnostics';
import { createAdminClient } from '@/lib/supabase/admin';
import { SIGNUP_NETWORK_TIMEOUT_MS, withTimeout } from '@/lib/timeout';
import { validateEmail } from '@/lib/validation';

export async function requestLoginLink(input: {
  email: string;
  redirectTo?: string;
  origin?: string;
}): Promise<LoginLinkResult> {
  const emailError = validateEmail(input.email);
  if (emailError) return { ok: false, message: emailError };

  const email = input.email.trim().toLowerCase();
  const production = isProductionRuntime();
  const callback = loginCallbackUrl({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    origin: input.origin,
    redirectTo: input.redirectTo,
    production,
  });
  const from = mailFrom();
  const fromDomain = from.match(/@([A-Za-z0-9.-]+)/)?.[1]?.toLowerCase() ?? null;

  logLoginDiagnostic({
    stage: 'config',
    outcome: supabaseConfigured() && persistConfigured() && alertsConfigured() && callback ? 'ok' : 'error',
    message: [
      `supabaseUrl=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)}`,
      `anonKey=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}`,
      `serviceRole=${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}`,
      `resend=${alertsConfigured()}`,
      `mailFrom=${Boolean(from)}`,
      `mailFromDomain=${fromDomain ?? 'missing'}`,
      `callback=${callback ?? 'missing'}`,
    ].join(' '),
  });

  return deliverLoginLink({
    email,
    redirectTo: input.redirectTo,
    origin: input.origin,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    production,
    supabaseConfigured: supabaseConfigured() && persistConfigured(),
    mailConfigured: alertsConfigured(),
    unavailableMessage: AUTH_UNCONFIGURED_MESSAGE,
    retryMessage: SIGNUP_RETRY_MESSAGE,
    findUser: async (target) => {
      try {
        const user = await findAuthUserByEmail(target);
        logLoginDiagnostic({
          stage: 'lookup',
          outcome: user?.id ? 'ok' : 'missing',
        });
        return user?.id ?? null;
      } catch (error) {
        throw stageError('lookup', error);
      }
    },
    generateLink: async (target, redirectTo) => {
      try {
        const generated = await withTimeout(
          generateExistingUserLink(target, redirectTo),
          SIGNUP_NETWORK_TIMEOUT_MS,
          'login_link'
        );
        return generated;
      } catch (error) {
        throw stageError('generate_link', error);
      }
    },
    sendEmail: async (to, link) => {
      try {
        await withTimeout(sendLoginEmail({ to, link }), SIGNUP_NETWORK_TIMEOUT_MS, 'login_email');
      } catch (error) {
        throw stageError('resend_send', error);
      }
    },
  });
}

function stageError(stage: string, error: unknown): Error & { stage: string; code: string | null } {
  const message = error instanceof Error ? error.message : 'Login step failed.';
  const code =
    error && typeof error === 'object' && 'code' in error && (typeof error.code === 'string' || typeof error.code === 'number')
      ? String(error.code)
      : null;
  const wrapped = new Error(message) as Error & { stage: string; code: string | null };
  wrapped.stage = stage;
  wrapped.code = code;
  return wrapped;
}

async function generateExistingUserLink(
  email: string,
  redirectTo: string
): Promise<{ userId: string; tokenHash: string }> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Supabase admin client is not configured.');

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  if (error || !data.user?.id || !data.properties?.hashed_token) {
    throw new Error('Could not prepare a login link.');
  }

  return { userId: data.user.id, tokenHash: data.properties.hashed_token };
}
