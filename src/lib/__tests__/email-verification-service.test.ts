import { describe, expect, it, vi } from 'vitest';
import { CAMPUS_EMAIL_USER_MESSAGES } from '@/lib/email-verification';
import {
  EmailVerificationError,
  sendCampusEmailCode,
  verifyCampusEmailCode,
} from '@/lib/email-verification-service';

type Row = {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  created_at: string;
  dispatched_at: string | null;
  consumed_at: string | null;
  invalidated_at: string | null;
};

const { rows, consumeIfHashMatches } = vi.hoisted(() => ({
  rows: [] as Row[],
  consumeIfHashMatches: vi.fn(async () => false),
}));

vi.mock('@/lib/account/profile', () => ({
  ensureUnverifiedProfileShell: async () => undefined,
  isServerAccountVerified: async () => true,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: {} } }),
}));

vi.mock('@/lib/email-verification-crypto', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email-verification-crypto')>(
    '@/lib/email-verification-crypto'
  );
  return {
    ...actual,
    getEmailVerificationSecret: () => 'test-secret',
    generateCampusEmailCode: () => '123456',
    hashCampusEmailCode: ({ code }: { code: string }) => `hash:${code}`,
    campusEmailCodesMatch: (left: string, right: string) => left === right,
  };
});

vi.mock('@/lib/email-verification-store', () => ({
  createEmailChallengeStore: () => ({
    list: async () => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    insert: async (row: Omit<Row, 'id'>) => {
      const created = { ...row, id: `c${rows.length + 1}` };
      rows.unshift(created);
      return created;
    },
    invalidateOpen: async (_userId: string, at: string) => {
      for (const row of rows) {
        if (!row.consumed_at && !row.invalidated_at) row.invalidated_at = at;
      }
    },
    markDispatched: async (id: string, at: string) => {
      const row = rows.find((item) => item.id === id);
      if (row) row.dispatched_at = at;
    },
    consumeIfHashMatches,
    incrementAttempts: async (id: string) => {
      const row = rows.find((item) => item.id === id);
      if (!row) return 0;
      row.attempts += 1;
      return row.attempts;
    },
  }),
}));

describe('sendCampusEmailCode', () => {
  it('does not mark a code dispatched when email delivery fails', async () => {
    rows.length = 0;
    await expect(
      sendCampusEmailCode({
        userId: 'user-1',
        email: 'ram@uri.edu',
        mailer: async () => {
          throw new Error('Resend rejected the verification email.');
        },
      })
    ).rejects.toMatchObject({
      message: CAMPUS_EMAIL_USER_MESSAGES.sendFailed,
    });
    expect(rows.every((row) => row.dispatched_at === null)).toBe(true);
    expect(rows.every((row) => row.invalidated_at)).toBe(true);
  });

  it('logs admin delivery stages without the code or the full address', async () => {
    rows.length = 0;
    vi.stubEnv('GM_ADMIN_EMAILS', 'owner@campusquestapp.com');
    const logged: unknown[] = [];
    const info = vi.spyOn(console, 'info').mockImplementation((...args) => {
      logged.push(args);
    });
    const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
      logged.push(args);
    });
    await sendCampusEmailCode({
      userId: 'user-1',
      email: 'owner@campusquestapp.com',
      mailer: async () => {
        const failure = new Error('Resend rejected owner@campusquestapp.com code 123456') as Error & {
          statusCode: number;
          code: string;
        };
        failure.statusCode = 403;
        failure.code = 'validation_error';
        throw failure;
      },
    }).catch(() => undefined);
    const text = JSON.stringify(logged);
    expect(text).toContain('admin_code_created');
    expect(text).toContain('admin_code_send_attempt');
    expect(text).toContain('admin_code_send_failed');
    expect(text).toContain('campusquestapp.com');
    expect(text).toContain('403');
    expect(text).toContain('validation_error');
    expect(text).not.toContain('123456');
    expect(text).not.toContain('owner@campusquestapp.com');
    expect(rows[0]?.invalidated_at).toBeTruthy();
    info.mockRestore();
    error.mockRestore();
  });

  it('invalidates the previous open admin code when a new one is created', async () => {
    rows.length = 0;
    vi.stubEnv('GM_ADMIN_EMAILS', 'owner@campusquestapp.com');
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await sendCampusEmailCode({
      userId: 'user-1',
      email: 'owner@campusquestapp.com',
      now: new Date('2026-09-27T12:00:00.000Z'),
      mailer: async () => undefined,
    });
    await sendCampusEmailCode({
      userId: 'user-1',
      email: 'owner@campusquestapp.com',
      now: new Date('2026-09-27T12:02:00.000Z'),
      mailer: async () => undefined,
    });
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.invalidated_at)).toHaveLength(1);
    expect(rows.filter((row) => row.dispatched_at && !row.invalidated_at)).toHaveLength(1);
    info.mockRestore();
  });

  it('marks the challenge dispatched only after the mailer succeeds', async () => {
    rows.length = 0;
    const result = await sendCampusEmailCode({
      userId: 'user-1',
      email: 'ram@uri.edu',
      mailer: async () => undefined,
    });
    expect(result.ok).toBe(true);
    expect(rows[0]?.dispatched_at).toBeTruthy();
    expect(rows[0]?.code_hash).toBe('hash:123456');
  });
});

describe('verifyCampusEmailCode', () => {
  it('rejects an incorrect code', async () => {
    rows.length = 0;
    rows.push({
      id: 'c1',
      user_id: 'user-1',
      email: 'ram@uri.edu',
      code_hash: 'hash:123456',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(),
      consumed_at: null,
      invalidated_at: null,
    });

    await expect(
      verifyCampusEmailCode({ userId: 'user-1', email: 'ram@uri.edu', code: '000000' })
    ).rejects.toBeInstanceOf(EmailVerificationError);
  });

  it('rejects an expired code', async () => {
    rows.length = 0;
    rows.push({
      id: 'c1',
      user_id: 'user-1',
      email: 'ram@uri.edu',
      code_hash: 'hash:123456',
      expires_at: new Date(Date.now() - 1_000).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(),
      consumed_at: null,
      invalidated_at: null,
    });

    await expect(
      verifyCampusEmailCode({ userId: 'user-1', email: 'ram@uri.edu', code: '123456' })
    ).rejects.toMatchObject({ message: CAMPUS_EMAIL_USER_MESSAGES.expired });
  });

  it('asks the production consume function to stamp the existing profile', async () => {
    rows.length = 0;
    consumeIfHashMatches.mockResolvedValue(true);
    rows.push({
      id: 'c1',
      user_id: 'user-1',
      email: 'ram@uri.edu',
      code_hash: 'hash:123456',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(),
      consumed_at: null,
      invalidated_at: null,
    });

    const result = await verifyCampusEmailCode({ userId: 'user-1', email: 'ram@uri.edu', code: '123456' });
    expect(result.ok).toBe(true);
    expect(consumeIfHashMatches).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', userId: 'user-1', codeHash: 'hash:123456' })
    );
  });
});
