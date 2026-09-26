import { loginDiagnosticFromError, logLoginDiagnostic } from '@/lib/login-diagnostics';
import { safeReturnPath } from '@/lib/return-path';

export const LOGIN_NO_ACCOUNT_MESSAGE =
  'No CampusQuest account uses that email yet. Sign up to create one.';

export type LoginLinkResult =
  | { ok: true; mock: boolean; alreadyRegistered: boolean }
  | { ok: false; message: string };

export type LoginLinkDelivery = {
  email: string;
  redirectTo?: string;
  origin?: string;
  siteUrl?: string;
  production: boolean;
  /** Public Supabase URL, anon key, and service role are all present. */
  supabaseConfigured: boolean;
  /** Resend can send from the configured from-address. */
  mailConfigured: boolean;
  unavailableMessage: string;
  retryMessage: string;
  findUser: (email: string) => Promise<string | null>;
  generateLink: (email: string, redirectTo: string) => Promise<{ userId: string; tokenHash: string }>;
  sendEmail: (to: string, link: string) => Promise<void>;
};

function isLocalOrigin(origin: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(origin);
}

function cleanOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Where the emailed link returns after Supabase has accepted the token.
 * Production never uses a localhost callback.
 */
export function loginCallbackUrl(args: {
  siteUrl?: string;
  origin?: string;
  redirectTo?: string;
  production: boolean;
}): string | null {
  const configured = cleanOrigin(args.siteUrl);
  const browser = cleanOrigin(args.origin);
  let origin: string | null;

  if (args.production) {
    if (!configured || isLocalOrigin(configured)) return null;
    origin = configured;
  } else if (browser && isLocalOrigin(browser)) {
    origin = browser;
  } else {
    origin = configured || browser;
  }

  if (!origin) return null;
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', safeReturnPath(args.redirectTo));
  return callback.toString();
}

export function loginEmailUrl(callbackUrl: string, tokenHash: string): string {
  const url = new URL(callbackUrl);
  url.searchParams.set('token_hash', tokenHash);
  url.searchParams.set('type', 'magiclink');
  return url.toString();
}

/** The development shortcut is never rendered in production. */
export function loginBypassVisible(mock: boolean, production: boolean): boolean {
  return mock === true && production === false;
}

/**
 * Sends a magic link for an account that already exists.
 * Does not create an Auth user. A missing mailbox configuration fails closed
 * instead of pretending the link was sent.
 */
export async function deliverLoginLink(input: LoginLinkDelivery): Promise<LoginLinkResult> {
  const callback = loginCallbackUrl({
    siteUrl: input.siteUrl,
    origin: input.origin,
    redirectTo: input.redirectTo,
    production: input.production,
  });

  if (!input.supabaseConfigured) {
    if (input.production) return { ok: false, message: input.unavailableMessage };
    return { ok: true, mock: true, alreadyRegistered: false };
  }

  if (!callback) return { ok: false, message: input.unavailableMessage };
  if (!input.mailConfigured) return { ok: false, message: input.unavailableMessage };

  try {
    const userId = await input.findUser(input.email);
    if (!userId) return { ok: false, message: LOGIN_NO_ACCOUNT_MESSAGE };

    const generated = await input.generateLink(input.email, callback);
    if (!generated.tokenHash || generated.userId !== userId) {
      logLoginDiagnostic({
        stage: 'generate_link',
        outcome: 'error',
        code: generated.userId !== userId ? 'user_mismatch' : 'missing_token',
        message: 'The login link did not match the existing account.',
      });
      return { ok: false, message: input.retryMessage };
    }

    await input.sendEmail(input.email, loginEmailUrl(callback, generated.tokenHash));
    logLoginDiagnostic({ stage: 'resend_send', outcome: 'ok' });
    return { ok: true, mock: false, alreadyRegistered: true };
  } catch (error) {
    const diagnostic = loginDiagnosticFromError(error);
    logLoginDiagnostic({
      stage: loginFailureStage(error),
      outcome: 'error',
      code: diagnostic.code,
      message: diagnostic.message,
    });
    return { ok: false, message: input.retryMessage };
  }
}

function loginFailureStage(error: unknown): string {
  if (error && typeof error === 'object' && 'stage' in error && typeof error.stage === 'string') {
    return error.stage;
  }
  const message = error instanceof Error ? error.message : '';
  if (message.toLowerCase().includes('resend') || message.toLowerCase().includes('not verified')) {
    return 'resend_send';
  }
  if (message.toLowerCase().includes('lookup') || message.toLowerCase().includes('account')) {
    return 'lookup';
  }
  if (message.toLowerCase().includes('timed out')) return 'timeout';
  return 'generate_link';
}
