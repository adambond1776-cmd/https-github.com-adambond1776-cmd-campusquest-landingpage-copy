import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { CAMPUS_EMAIL_CODE_LENGTH } from '@/lib/email-verification';

export function getEmailVerificationSecret(
  env: Record<string, string | undefined> = process.env
): string {
  const dedicated = env.EMAIL_VERIFICATION_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error('EMAIL_VERIFICATION_SECRET is not configured.');
}

/** Cryptographically secure 6-digit numeric code. Never use Math.random(). */
export function generateCampusEmailCode(): string {
  return randomInt(100000, 1000000).toString().padStart(CAMPUS_EMAIL_CODE_LENGTH, '0');
}

export function hashCampusEmailCode(args: {
  userId: string;
  email: string;
  code: string;
  secret: string;
}): string {
  return createHmac('sha256', args.secret)
    .update(`${args.userId}:${args.email}:${args.code}`)
    .digest('hex');
}

export function campusEmailCodesMatch(leftHash: string, rightHash: string): boolean {
  const a = Buffer.from(leftHash, 'utf8');
  const b = Buffer.from(rightHash, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
