import { timingSafeEqual } from 'node:crypto';
import { exactTestAccountEmail } from '@/lib/account/test-account';

/** The one investor demo sign-in. It is not an allowlist and not a verification bypass. */
export const DEMO_ACCOUNT_EMAIL = 'demo@campusquestapp.com';

function sameEmail(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isDemoAccountEmail(value: string | null | undefined): boolean {
  const email = exactTestAccountEmail(value ?? undefined);
  if (!email) return false;
  return sameEmail(email, DEMO_ACCOUNT_EMAIL);
}

/**
 * Password sign-in is limited to the dedicated demo address.
 * Any other address is refused before a password is checked.
 */
export function demoPasswordLoginAllowed(email: string): boolean {
  return isDemoAccountEmail(email);
}
