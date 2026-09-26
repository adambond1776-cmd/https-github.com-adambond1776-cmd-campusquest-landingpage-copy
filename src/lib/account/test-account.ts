import { timingSafeEqual } from 'node:crypto';
import { isProductionRuntime } from '@/lib/runtime';

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export type TestAccountEnv = {
  production: boolean;
  flag: string | undefined;
  configuredEmail: string | undefined;
};

/** One exact address. Wildcards, lists, and blank values never qualify. */
export function exactTestAccountEmail(value: string | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (!email || email.includes('*') || email.includes(',') || /\s/.test(email)) return null;
  return EMAIL_PATTERN.test(email) ? email : null;
}

function sameEmail(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Local/test only. Production refuses the bypass before the flag or email is considered.
 * The candidate must be the one configured address. The browser does not supply that address.
 */
export function testAccountBypassDecision(env: TestAccountEnv, candidate: string): boolean {
  if (env.production) return false;
  if (env.flag !== 'true') return false;
  const configured = exactTestAccountEmail(env.configuredEmail);
  const email = exactTestAccountEmail(candidate);
  if (!configured || !email) return false;
  return sameEmail(configured, email);
}

export function testAccountEnv(): TestAccountEnv {
  return {
    production: isProductionRuntime(),
    flag: process.env.CQ_ENABLE_TEST_ACCOUNT_BYPASS,
    configuredEmail: process.env.CQ_TEST_ACCOUNT_EMAIL,
  };
}

/** The configured address when this process may prepare that one account. */
export function localTestAccountEmail(): string | null {
  const env = testAccountEnv();
  const email = exactTestAccountEmail(env.configuredEmail);
  if (!email || !testAccountBypassDecision(env, email)) return null;
  return email;
}
