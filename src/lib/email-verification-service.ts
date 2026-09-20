import { randomBytes } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import {
  CAMPUS_EMAIL_CODE_TTL_SECONDS,
  CAMPUS_EMAIL_MAX_ATTEMPTS,
  CAMPUS_EMAIL_RESEND_COOLDOWN_SECONDS,
  CAMPUS_EMAIL_SEND_LIMIT,
  CAMPUS_EMAIL_SEND_WINDOW_SECONDS,
  CAMPUS_EMAIL_USER_MESSAGES,
  isValidCampusEmailCode,
  maskCampusEmail,
  secondsUntil,
} from '@/lib/email-verification';
import {
  campusEmailCodesMatch,
  generateCampusEmailCode,
  getEmailVerificationSecret,
  hashCampusEmailCode,
} from '@/lib/email-verification-crypto';
import { sendCampusVerificationEmailViaResend } from '@/lib/email-verification-mail';
import {
  createEmailChallengeStore,
  type EmailChallengeRow,
} from '@/lib/email-verification-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEmail } from '@/lib/signup-email-policy';

export class EmailVerificationError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'cooldown'
      | 'incorrect'
      | 'expired'
      | 'missing'
      | 'invalidated'
      | 'too_many'
      | 'send_failed'
      | 'rate_limit'
  ) {
    super(message);
    this.name = 'EmailVerificationError';
  }
}

export type SendCodeResult = {
  ok: true;
  emailMasked: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
};

function latestDispatched(rows: EmailChallengeRow[]): EmailChallengeRow | null {
  return rows.find((row) => row.dispatched_at) ?? null;
}

function resendWait(rows: EmailChallengeRow[], nowMs: number): number {
  const latest = latestDispatched(rows);
  if (!latest?.dispatched_at) return 0;
  const resendAt = Date.parse(latest.dispatched_at) + CAMPUS_EMAIL_RESEND_COOLDOWN_SECONDS * 1000;
  return secondsUntil(resendAt, nowMs);
}

function isOpen(row: EmailChallengeRow, now: Date): boolean {
  return !row.consumed_at && !row.invalidated_at && Date.parse(row.expires_at) > now.getTime();
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const target = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) break;
  }

  return null;
}

export async function createPendingAuthUser(args: {
  email: string;
  metadata: Record<string, unknown>;
}): Promise<User> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Supabase admin client is not configured.');

  const password = randomBytes(32).toString('base64url');
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizeEmail(args.email),
    password,
    email_confirm: true,
    user_metadata: {
      ...args.metadata,
      campus_email_pending: true,
      campus_email_verified_at: null,
    },
  });

  if (error || !data.user?.id) {
    throw new Error(error?.message ?? 'Unable to create account.');
  }
  return data.user;
}

export async function markCampusEmailVerified(userId: string, at: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Supabase admin client is not configured.');
  const { data: current, error: readError } = await admin.auth.admin.getUserById(userId);
  if (readError || !current.user) throw new Error('Unable to load the account.');
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(current.user.user_metadata ?? {}),
      campus_email_pending: false,
      campus_email_verified_at: at,
    },
  });
  if (error) throw new Error('Unable to mark the email verified.');
}

export async function sendCampusEmailCode(args: {
  userId: string;
  email: string;
  now?: Date;
  mailer?: (input: { to: string; code: string }) => Promise<void>;
}): Promise<SendCodeResult> {
  const admin = createAdminClient();
  if (!admin) throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.sendFailed, 'send_failed');

  const now = args.now ?? new Date();
  const email = normalizeEmail(args.email);
  const store = createEmailChallengeStore(admin);
  const rows = await store.list(args.userId);

  const wait = resendWait(rows, now.getTime());
  if (wait > 0) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.cooldown(wait), 'cooldown');
  }

  const windowStart = now.getTime() - CAMPUS_EMAIL_SEND_WINDOW_SECONDS * 1000;
  const recentSends = rows.filter(
    (row) => row.dispatched_at && Date.parse(row.dispatched_at) >= windowStart
  ).length;
  if (recentSends >= CAMPUS_EMAIL_SEND_LIMIT) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.cooldown(60), 'rate_limit');
  }

  const secret = getEmailVerificationSecret();
  const code = generateCampusEmailCode();
  await store.invalidateOpen(args.userId, now.toISOString());

  const inserted = await store.insert({
    user_id: args.userId,
    email,
    code_hash: hashCampusEmailCode({ userId: args.userId, email, code, secret }),
    expires_at: new Date(now.getTime() + CAMPUS_EMAIL_CODE_TTL_SECONDS * 1000).toISOString(),
    attempts: 0,
    created_at: now.toISOString(),
    dispatched_at: null,
    consumed_at: null,
    invalidated_at: null,
  });

  try {
    const mailer = args.mailer ?? sendCampusVerificationEmailViaResend;
    await mailer({ to: email, code });
  } catch {
    await store.invalidateOpen(args.userId, new Date().toISOString());
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.sendFailed, 'send_failed');
  }

  await store.markDispatched(inserted.id, now.toISOString());

  return {
    ok: true,
    emailMasked: maskCampusEmail(email),
    expiresInSeconds: CAMPUS_EMAIL_CODE_TTL_SECONDS,
    resendAvailableInSeconds: CAMPUS_EMAIL_RESEND_COOLDOWN_SECONDS,
  };
}

export async function verifyCampusEmailCode(args: {
  userId: string;
  email: string;
  code: string;
  now?: Date;
}): Promise<{ ok: true; verifiedAt: string }> {
  const admin = createAdminClient();
  if (!admin) throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.incorrect, 'incorrect');

  const now = args.now ?? new Date();
  const email = normalizeEmail(args.email);
  const code = args.code.trim();
  if (!isValidCampusEmailCode(code)) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.incorrect, 'incorrect');
  }

  const store = createEmailChallengeStore(admin);
  const rows = await store.list(args.userId);
  const candidate = rows.find((row) => !row.invalidated_at) ?? null;

  if (!candidate) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.missing, 'missing');
  }
  if (candidate.consumed_at) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.invalidated, 'invalidated');
  }
  if (Date.parse(candidate.expires_at) <= now.getTime()) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.expired, 'expired');
  }
  if (candidate.attempts >= CAMPUS_EMAIL_MAX_ATTEMPTS) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.tooManyAttempts, 'too_many');
  }

  const secret = getEmailVerificationSecret();
  const submittedHash = hashCampusEmailCode({ userId: args.userId, email, code, secret });
  if (!campusEmailCodesMatch(candidate.code_hash, submittedHash)) {
    const attempts = await store.incrementAttempts(candidate.id);
    if (attempts >= CAMPUS_EMAIL_MAX_ATTEMPTS) {
      throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.tooManyAttempts, 'too_many');
    }
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.incorrect, 'incorrect');
  }

  const consumed = await store.consumeIfHashMatches({
    id: candidate.id,
    userId: args.userId,
    codeHash: submittedHash,
    at: now.toISOString(),
  });
  if (!consumed) {
    throw new EmailVerificationError(CAMPUS_EMAIL_USER_MESSAGES.invalidated, 'invalidated');
  }

  const verifiedAt = now.toISOString();
  await markCampusEmailVerified(args.userId, verifiedAt);
  return { ok: true, verifiedAt };
}

export function openChallenge(rows: EmailChallengeRow[], now = new Date()): EmailChallengeRow | null {
  const latest = rows.find((row) => !row.invalidated_at) ?? null;
  return latest && isOpen(latest, now) ? latest : null;
}
