import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recordAge = vi.fn();
const findAuthUserByEmail = vi.fn();
const createPendingAuthUser = vi.fn();
const sendCampusEmailCode = vi.fn();
const verifyCampusEmailCode = vi.fn();
const isServerAccountVerified = vi.fn();
const persistConfigured = vi.fn();
const alertsConfigured = vi.fn();
const isProductionRuntime = vi.fn();
const createAdminClient = vi.fn();
const createClient = vi.fn();

vi.mock('@/app/signup/age-actions', () => ({
  recordAge: (...args: unknown[]) => recordAge(...args),
}));

vi.mock('@/lib/email-verification-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email-verification-service')>(
    '@/lib/email-verification-service'
  );
  return {
    ...actual,
    findAuthUserByEmail: (...args: unknown[]) => findAuthUserByEmail(...args),
    createPendingAuthUser: (...args: unknown[]) => createPendingAuthUser(...args),
    sendCampusEmailCode: (...args: unknown[]) => sendCampusEmailCode(...args),
    verifyCampusEmailCode: (...args: unknown[]) => verifyCampusEmailCode(...args),
  };
});

vi.mock('@/lib/account/profile', () => ({
  isServerAccountVerified: (...args: unknown[]) => isServerAccountVerified(...args),
  ensureUnverifiedProfileShell: async () => undefined,
  ensureAccountRole: vi.fn(),
}));

const sessionPrivileges = vi.fn();
vi.mock('@/lib/session', () => ({
  sessionPrivileges: () => sessionPrivileges(),
}));

vi.mock('@/lib/env', async () => {
  const actual = await vi.importActual<typeof import('@/lib/env')>('@/lib/env');
  return {
    ...actual,
    persistConfigured: () => persistConfigured(),
    alertsConfigured: () => alertsConfigured(),
  };
});

vi.mock('@/lib/runtime', async () => {
  const actual = await vi.importActual<typeof import('@/lib/runtime')>('@/lib/runtime');
  return {
    ...actual,
    isProductionRuntime: () => isProductionRuntime(),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClient(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClient(),
}));

const input = {
  email: 'ram@uri.edu',
  role: 'student' as const,
  interests: ['Sports'],
  plan: 'free' as const,
  birthYear: 2004,
};

describe('startCampusSignup', () => {
  beforeEach(() => {
    vi.resetModules();
    recordAge.mockReset();
    findAuthUserByEmail.mockReset();
    createPendingAuthUser.mockReset();
    sendCampusEmailCode.mockReset();
    verifyCampusEmailCode.mockReset();
    isServerAccountVerified.mockReset();
    sessionPrivileges.mockReset();
    persistConfigured.mockReset();
    alertsConfigured.mockReset();
    isProductionRuntime.mockReset();
    createAdminClient.mockReset();
    createClient.mockReset();

    persistConfigured.mockReturnValue(true);
    alertsConfigured.mockReturnValue(true);
    isProductionRuntime.mockReturnValue(true);
    recordAge.mockResolvedValue({ ok: true, bracket: 'adult' });
    isServerAccountVerified.mockResolvedValue(false);
    sessionPrivileges.mockResolvedValue({ state: 'anonymous' });
    findAuthUserByEmail.mockResolvedValue(null);
    createPendingAuthUser.mockResolvedValue({ id: 'user-1' });
    sendCampusEmailCode.mockResolvedValue({
      ok: true,
      emailMasked: 'r••@uri.edu',
      expiresInSeconds: 600,
      resendAvailableInSeconds: 60,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates a pending user and only reports success after the code is sent', async () => {
    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup(input);

    expect(result).toEqual({
      ok: true,
      mock: false,
      alreadyRegistered: false,
      needsVerification: true,
      emailMasked: 'r••@uri.edu',
    });
    expect(createPendingAuthUser).toHaveBeenCalledWith({
      email: 'ram@uri.edu',
      role: 'student',
      metadata: { interests: ['Playing sports', 'Watching sports'] },
    });
    expect(sendCampusEmailCode).toHaveBeenCalledWith({ userId: 'user-1', email: 'ram@uri.edu' });
  });

  it('rejects non-URI student emails', async () => {
    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup({ ...input, email: 'student@gmail.com' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.message).toMatch(/URI email/i);
    expect(createPendingAuthUser).not.toHaveBeenCalled();
    expect(sendCampusEmailCode).not.toHaveBeenCalled();
  });

  it('persists priority and optional detail during signup', async () => {
    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const interestPreferences = { version: 1 as const, selections: [{ id: 'arts' as const, priority: 3 as const, details: ['Photography'] }] };
    expect((await startCampusSignup({ ...input, interestPreferences })).ok).toBe(true);
    expect(createPendingAuthUser).toHaveBeenCalledWith({
      email: input.email,
      role: 'student',
      metadata: { interests: ['Art, photography & film'], interest_preferences: interestPreferences },
    });
  });

  it('rejects invalid priorities before age storage or email sending', async () => {
    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const invalid = { version: 1, selections: [{ id: 'arts', priority: 500, details: [] }] };
    expect((await startCampusSignup({ ...input, interestPreferences: invalid as never })).ok).toBe(false);
    expect(recordAge).not.toHaveBeenCalled();
    expect(sendCampusEmailCode).not.toHaveBeenCalled();
  });

  it('a failed age write prevents completion', async () => {
    recordAge.mockResolvedValue({
      ok: false,
      message: "We couldn't complete that. Please try again.",
      kind: 'database',
    });

    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup(input);

    expect(result.ok).toBe(false);
    expect(createPendingAuthUser).not.toHaveBeenCalled();
    expect(sendCampusEmailCode).not.toHaveBeenCalled();
  });

  it('does not create a user when the auth lookup fails', async () => {
    findAuthUserByEmail.mockRejectedValue(new Error('lookup failed'));
    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup(input);
    expect(result.ok).toBe(false);
    expect(createPendingAuthUser).not.toHaveBeenCalled();
  });

  it('does not treat a paid signup selection as an entitlement', async () => {
    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    expect((await startCampusSignup({ ...input, plan: 'premium' })).ok).toBe(true);
    expect(createPendingAuthUser).toHaveBeenCalledWith({
      email: 'ram@uri.edu',
      role: 'student',
      metadata: { interests: ['Playing sports', 'Watching sports'] },
    });
  });

  it('returns a send failure after creating the pending user, without claiming a code was sent', async () => {
    const { EmailVerificationError } = await import('@/lib/email-verification-service');
    sendCampusEmailCode.mockRejectedValue(
      new EmailVerificationError("We couldn't send your code. Please try again.", 'send_failed')
    );

    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup(input);

    expect(result).toEqual({
      ok: false,
      message: "We couldn't send your code. Please try again.",
    });
  });

  it('refuses an already-verified server profile instead of sending another signup code', async () => {
    findAuthUserByEmail.mockResolvedValue({
      id: 'user-1',
      user_metadata: { campus_email_verified_at: '2026-01-01T00:00:00.000Z', role: 'organization', plan: 'premium' },
    });
    isServerAccountVerified.mockResolvedValue(true);

    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup(input);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.message).toMatch(/already exists/i);
    expect(recordAge).not.toHaveBeenCalled();
    expect(createPendingAuthUser).not.toHaveBeenCalled();
  });

  it('does not trust metadata that claims the campus email is already verified', async () => {
    findAuthUserByEmail.mockResolvedValue({
      id: 'user-1',
      user_metadata: { campus_email_verified_at: '2026-01-01T00:00:00.000Z', campus_email_pending: false },
    });
    isServerAccountVerified.mockResolvedValue(false);

    const { startCampusSignup } = await import('@/app/signup/signup-actions');
    const result = await startCampusSignup(input);

    expect(result.ok).toBe(true);
    expect(recordAge).not.toHaveBeenCalled();
    expect(createPendingAuthUser).not.toHaveBeenCalled();
    expect(sendCampusEmailCode).toHaveBeenCalledWith({ userId: 'user-1', email: 'ram@uri.edu' });
  });
});

describe('existing account verification', () => {
  beforeEach(() => {
    vi.resetModules();
    recordAge.mockReset();
    findAuthUserByEmail.mockReset();
    createPendingAuthUser.mockReset();
    sendCampusEmailCode.mockReset();
    verifyCampusEmailCode.mockReset();
    isServerAccountVerified.mockReset();
    sessionPrivileges.mockReset();
    persistConfigured.mockReset();
    alertsConfigured.mockReset();
    isProductionRuntime.mockReset();
    createAdminClient.mockReset();
    createClient.mockReset();
    persistConfigured.mockReturnValue(true);
    alertsConfigured.mockReturnValue(true);
    isProductionRuntime.mockReturnValue(true);
    createAdminClient.mockReturnValue({ auth: { admin: { updateUserById: vi.fn() } } });
    sendCampusEmailCode.mockResolvedValue({
      ok: true,
      emailMasked: 'r••@uri.edu',
      expiresInSeconds: 600,
      resendAvailableInSeconds: 60,
    });
  });

  it('does not prompt a profile that is already campus-verified', async () => {
    sessionPrivileges.mockResolvedValue({
      state: 'signed-in',
      userId: 'user-1',
      email: 'ram@uri.edu',
      privileges: { verified: true, plan: 'free' },
    });
    const { startExistingAccountVerification } = await import('@/app/signup/signup-actions');
    const result = await startExistingAccountVerification();
    expect(result).toMatchObject({ ok: true, alreadyVerified: true });
    expect(sendCampusEmailCode).not.toHaveBeenCalled();
    expect(createPendingAuthUser).not.toHaveBeenCalled();
  });

  it('recognizes an existing unverified URI account and does not create another one', async () => {
    sessionPrivileges.mockResolvedValue({
      state: 'signed-in',
      userId: 'user-1',
      email: 'ram@uri.edu',
      privileges: { verified: false, plan: 'free' },
    });
    const { startExistingAccountVerification } = await import('@/app/signup/signup-actions');
    const result = await startExistingAccountVerification();
    expect(result).toMatchObject({ ok: true, alreadyVerified: false, emailMasked: 'r••@uri.edu' });
    expect(recordAge).not.toHaveBeenCalled();
    expect(createPendingAuthUser).not.toHaveBeenCalled();
    expect(findAuthUserByEmail).not.toHaveBeenCalled();
    expect(sendCampusEmailCode).toHaveBeenCalledWith({ userId: 'user-1', email: 'ram@uri.edu' });
  });

  it('stamps the existing account from a valid code without rotating a session that already matches', async () => {
    const updateUserById = vi.fn();
    createAdminClient.mockReturnValue({ auth: { admin: { updateUserById } } });
    sessionPrivileges.mockResolvedValue({
      state: 'signed-in',
      userId: 'user-1',
      email: 'ram@uri.edu',
      privileges: { verified: false, plan: 'free' },
    });
    isServerAccountVerified.mockResolvedValue(false);
    verifyCampusEmailCode.mockResolvedValue({ ok: true, verifiedAt: '2026-09-22T00:00:00.000Z' });
    const { verifyCampusSignupCode } = await import('@/app/signup/signup-actions');
    const result = await verifyCampusSignupCode({ email: 'ram@uri.edu', code: '123456' });
    expect(result).toEqual({ ok: true });
    expect(findAuthUserByEmail).not.toHaveBeenCalled();
    expect(createPendingAuthUser).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
    expect(verifyCampusEmailCode).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'ram@uri.edu',
      code: '123456',
    });
  });
});
