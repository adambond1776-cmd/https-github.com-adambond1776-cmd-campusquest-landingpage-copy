/**
 * Shared campus (URI) email verification helpers.
 * Safe for client + server — no secrets, hashes, or codes.
 */

import { normalizeEmail } from '@/lib/signup-email-policy';

export const CAMPUS_EMAIL_CODE_LENGTH = 6;
export const CAMPUS_EMAIL_CODE_TTL_SECONDS = 600;
export const CAMPUS_EMAIL_RESEND_COOLDOWN_SECONDS = 60;
export const CAMPUS_EMAIL_MAX_ATTEMPTS = 5;
export const CAMPUS_EMAIL_SEND_LIMIT = 5;
export const CAMPUS_EMAIL_SEND_WINDOW_SECONDS = 30 * 60;

export const CAMPUS_EMAIL_USER_MESSAGES = {
  sent: 'We sent a 6-digit verification code to your URI email.',
  orgSent: 'We sent a 6-digit verification code to your email.',
  alreadyVerified: 'Your email is already verified. Log in instead.',
  alreadyRegistered: 'An account with this email already exists. Try logging in instead.',
  incorrect: "That code isn't correct. Try again.",
  expired: 'That code has expired. Request a new one.',
  tooManyAttempts: 'Too many attempts. Request a new code.',
  missing: 'Request a new code, then try again.',
  invalidated: 'That code is no longer valid. Request a new one.',
  sendFailed: "We couldn't send your code. Please try again.",
  cooldown: (seconds: number) =>
    `You can request another code in ${seconds} second${seconds === 1 ? '' : 's'}.`,
} as const;

export function isValidCampusEmailCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

export function maskCampusEmail(email?: string | null): string {
  const normalized = normalizeEmail(email ?? '');
  const at = normalized.lastIndexOf('@');
  if (at <= 0) return '••••@••••';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const first = local.charAt(0) || '•';
  const bullets = '•'.repeat(Math.max(local.length - 1, 1));
  return `${first}${bullets}@${domain}`;
}

export function secondsUntil(targetMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
}

/**
 * New landing-page accounts set `campus_email_pending: true` until the 6-digit
 * code lands. `campus_email_verified_at: null` is also pending, in case the
 * Auth API persists JSON nulls. Accounts created before this flow omit both
 * keys and are treated as verified.
 */
export function needsCampusEmailVerification(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) return false;
  if (metadata.campus_email_pending === true) return true;
  return metadata.campus_email_verified_at === null;
}

export function isCampusEmailVerified(metadata: Record<string, unknown> | undefined): boolean {
  if (needsCampusEmailVerification(metadata)) return false;
  const value = metadata?.campus_email_verified_at;
  if (typeof value === 'string' && value.trim()) return true;
  return metadata?.campus_email_pending !== true;
}
