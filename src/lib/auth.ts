'use client';

import { AUTH_UNCONFIGURED_MESSAGE, isProductionRuntime } from '@/lib/runtime';
import {
  classifySignupError,
  logSignupFailure,
  logSignupSuccess,
  SIGNUP_RETRY_MESSAGE,
  userFacingSignupMessage,
} from '@/lib/signup-diagnostics';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { SIGNUP_NETWORK_TIMEOUT_MS, withTimeout } from '@/lib/timeout';
import { interestLabels, normalizeInterestProfile, validateInterestProfile, validateInterests, type InterestProfile } from '@/lib/interests';

export type Role = 'student' | 'organization';
export type Plan = 'free' | 'basic' | 'premium' | 'club';

export type SignInInput = {
  email: string;
  /** Path to land on once the emailed link has been exchanged for a session. */
  redirectTo?: string;
};

export type AuthResult =
  | {
      ok: true;
      /** True when no Supabase project is configured and the link was faked. */
      mock: boolean;
      /** The address was already on file, so the link signs them back in. */
      alreadyRegistered: boolean;
    }
  | { ok: false; message: string };

export type OnboardingInput = {
  role: Role;
  interests: string[];
  interestPreferences?: InterestProfile;
  plan: Plan;
};

export type OnboardingResult = { ok: true } | { ok: false; message: string };

export type CurrentUser = {
  email: string;
  role?: Role;
  plan?: Plan;
  interests?: string[];
  interestPreferences?: InterestProfile;
};

const ACCOUNTS_KEY = 'campusquest.accounts';
const SESSION_KEY = 'campusquest.session';
const MOCK_LATENCY_MS = 700;

const SIGN_IN_REDIRECT = '/welcome';

const ROLES: Role[] = ['student', 'organization'];
const PLANS: Plan[] = ['free', 'basic', 'premium', 'club'];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const asRole = (value: unknown): Role | undefined =>
  ROLES.includes(value as Role) ? (value as Role) : undefined;

const asPlan = (value: unknown): Plan | undefined =>
  PLANS.includes(value as Plan) ? (value as Plan) : undefined;

function isLocalOrigin(origin: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(origin);
}

/**
 * Absolute URL of the route handler that trades the emailed code for a
 * session. Production prefers NEXT_PUBLIC_SITE_URL so a stray preview host
 * cannot mint localhost or vercel.app callback links.
 */
function callbackOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (isProductionRuntime()) {
    const origin = configured || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin || isLocalOrigin(origin)) return null;
    return origin;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return configured || null;
}

function callbackUrl(redirectTo: string): string | null {
  const origin = callbackOrigin();
  if (!origin) return null;
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', redirectTo);
  return callback.toString();
}

/* ---------- localStorage mock (used when Supabase is unconfigured) ---------- */

type StoredAccount = {
  email: string;
  role?: Role;
  interests?: string[];
  interestPreferences?: InterestProfile;
  plan?: Plan;
  createdAt: string;
};

type StoredSession = {
  email: string;
  role?: Role;
  plan?: Plan;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // Private browsing or corrupted state: treat as a fresh slate rather than
    // breaking the form.
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a nicety for the mock; failing to store must not surface
    // as an auth error.
  }
}

function readAccounts(): StoredAccount[] {
  const parsed = readJson<unknown>(ACCOUNTS_KEY, []);
  return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
}

function rememberMockAccount(
  email: string,
  details: { role?: Role; interests?: string[]; interestPreferences?: InterestProfile; plan?: Plan } = {}
): StoredSession {
  const normalized = normalizeEmail(email);
  const accounts = readAccounts();
  const existing = accounts.find((account) => account.email === normalized);

  if (existing) {
    existing.role = details.role ?? existing.role;
    existing.interests = details.interests ?? existing.interests;
    existing.interestPreferences = details.interestPreferences ?? existing.interestPreferences;
    existing.plan = details.plan ?? existing.plan;
  } else {
    accounts.push({
      email: normalized,
      role: details.role,
      interests: details.interests,
      interestPreferences: details.interestPreferences,
      plan: details.plan,
      createdAt: new Date().toISOString(),
    });
  }
  writeJson(ACCOUNTS_KEY, accounts);

  const account = existing ?? accounts[accounts.length - 1];
  const session: StoredSession = {
    email: normalized,
    role: account.role,
    plan: account.plan,
  };
  writeJson(SESSION_KEY, session);
  return session;
}

/**
 * Stands in for the whole email round-trip: remembers the address, records a
 * session so `getCurrentUser()` has something to return, and reports whether
 * the address was already known so the UI can say so.
 */
async function mockSendLink(
  email: string,
  details: { role?: Role; interests?: string[]; plan?: Plan } = {}
): Promise<AuthResult> {
  await wait(MOCK_LATENCY_MS);
  const existing = readAccounts().some((account) => account.email === normalizeEmail(email));
  rememberMockAccount(email, details);
  return { ok: true, mock: true, alreadyRegistered: existing };
}

/** Local-dev stand-in after a 6-digit code is accepted without Supabase. */
export function rememberMockSignup(details: {
  email: string;
  role: Role;
  interests: string[];
  interestPreferences?: InterestProfile;
  plan: Plan;
}): void {
  if (isProductionRuntime()) return;
  rememberMockAccount(details.email, details);
}

async function mockCompleteOnboarding(details: OnboardingInput): Promise<OnboardingResult> {
  await wait(MOCK_LATENCY_MS);

  const session = readJson<StoredSession | null>(SESSION_KEY, null);
  if (!session?.email) {
    return { ok: false, message: 'Your session has expired. Request a new link to sign in.' };
  }

  const accounts = readAccounts();
  const existing = accounts.find((account) => account.email === session.email);

  if (existing) {
    existing.role = details.role;
    existing.interests = details.interests;
    existing.interestPreferences = details.interestPreferences;
    existing.plan = details.plan;
  } else {
    accounts.push({ email: session.email, ...details, createdAt: new Date().toISOString() });
  }
  writeJson(ACCOUNTS_KEY, accounts);

  writeJson(SESSION_KEY, { email: session.email, role: details.role, plan: details.plan });
  return { ok: true };
}

function readMockSession(): CurrentUser | null {
  const session = readJson<StoredSession | null>(SESSION_KEY, null);
  if (!session?.email) return null;
  const account = readAccounts().find((account) => account.email === session.email);
  const interestPreferences = normalizeInterestProfile(account?.interestPreferences, account?.interests);

  return {
    email: session.email,
    role: asRole(session.role),
    plan: asPlan(session.plan),
    interests: interestLabels(interestPreferences),
    interestPreferences,
  };
}

/* ---------- Public API ---------- */

/**
 * Emails a one-time login link for an existing account. New accounts are
 * created through the 6-digit signup flow, not from this form.
 */
function mockAuthOrFail(
  run: () => Promise<AuthResult>
): Promise<AuthResult> {
  if (isProductionRuntime()) {
    return Promise.resolve({ ok: false, message: AUTH_UNCONFIGURED_MESSAGE });
  }
  return run();
}

export async function signInWithEmail({
  email,
  redirectTo = SIGN_IN_REDIRECT,
}: SignInInput): Promise<AuthResult> {
  try {
    const supabase = createClient();
    if (!supabase) return mockAuthOrFail(() => mockSendLink(email));

    const emailRedirectTo = callbackUrl(redirectTo);
    if (!emailRedirectTo) {
      logSignupFailure({ stage: 'sign_in', kind: 'configuration' });
      return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
    }

    const { error } = await withTimeout(
      supabase.auth.signInWithOtp({
        email: normalizeEmail(email),
        options: { emailRedirectTo, shouldCreateUser: false },
      }),
      SIGNUP_NETWORK_TIMEOUT_MS,
      'sign_in_otp'
    );

    if (error) {
      logSignupFailure({ stage: 'sign_in', kind: 'supabase_auth' });
      return { ok: false, message: SIGNUP_RETRY_MESSAGE };
    }

    logSignupSuccess('sign_in');
    return { ok: true, mock: false, alreadyRegistered: false };
  } catch (error) {
    const kind = classifySignupError(error);
    logSignupFailure({ stage: 'sign_in', kind });
    return { ok: false, message: userFacingSignupMessage(kind) };
  }
}

/**
 * Writes the onboarding answers onto an account that already has a session.
 *
 * A magic link creates the account the first time it is used, so someone who
 * typed an unknown address into the login form arrives signed in but with no
 * role, plan or interests. This is how they finish, without a second link.
 */
export async function completeOnboarding(details: OnboardingInput): Promise<OnboardingResult> {
  const validated = details.interestPreferences === undefined
    ? validateInterests(details.interests) : validateInterestProfile(details.interestPreferences);
  if (!validated.ok) return validated;
  const normalizedDetails = { role: details.role, plan: details.plan, interests: validated.interests,
    interest_preferences: validated.profile };
  try {
    const supabase = createClient();
    if (!supabase) {
      if (isProductionRuntime()) {
        return { ok: false, message: AUTH_UNCONFIGURED_MESSAGE };
      }
      return mockCompleteOnboarding({ ...details, interests: validated.interests, interestPreferences: validated.profile });
    }

    const { error } = await withTimeout(
      supabase.auth.updateUser({ data: normalizedDetails }),
      SIGNUP_NETWORK_TIMEOUT_MS,
      'complete_onboarding'
    );
    if (error) {
      logSignupFailure({ stage: 'complete_onboarding', kind: 'supabase_auth' });
      return { ok: false, message: SIGNUP_RETRY_MESSAGE };
    }
    return { ok: true };
  } catch (error) {
    const kind = classifySignupError(error);
    logSignupFailure({ stage: 'complete_onboarding', kind });
    return { ok: false, message: userFacingSignupMessage(kind) };
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  if (!supabase) {
    if (isProductionRuntime()) return null;
    return readMockSession();
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return null;

  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  const interestPreferences = normalizeInterestProfile(metadata.interest_preferences, metadata.interests);
  return {
    email: user.email,
    role: asRole(metadata.role),
    plan: asPlan(metadata.plan),
    interests: interestLabels(interestPreferences),
    interestPreferences,
  };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  if (!supabase) {
    if (!isProductionRuntime()) writeJson(SESSION_KEY, null);
    return;
  }

  await supabase.auth.signOut();
}

export { isSupabaseConfigured };
