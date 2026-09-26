import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prepare = vi.fn();
const signIn = vi.fn();

vi.mock('@/lib/account/test-account-provision', () => ({
  prepareLocalTestAccount: () => prepare(),
  signInPreparedTestAccount: (...args: unknown[]) => signIn(...args),
}));

afterEach(() => vi.unstubAllEnvs());

describe('startLocalTestAccount', () => {
  beforeEach(() => {
    prepare.mockReset();
    signIn.mockReset();
  });

  it('does not prepare an account when the bypass is closed', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CQ_ENABLE_TEST_ACCOUNT_BYPASS', '');
    vi.stubEnv('CQ_TEST_ACCOUNT_EMAIL', 'campusquesttest@uri.edu');
    const { startLocalTestAccount } = await import('@/app/login/test-account-actions');
    const result = await startLocalTestAccount();
    expect(result).toEqual({ ok: false, message: 'Local test account is not available.' });
    expect(prepare).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('does not prepare an account in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CQ_ENABLE_TEST_ACCOUNT_BYPASS', 'true');
    vi.stubEnv('CQ_TEST_ACCOUNT_EMAIL', 'campusquesttest@uri.edu');
    const { startLocalTestAccount } = await import('@/app/login/test-account-actions');
    const result = await startLocalTestAccount();
    expect(result.ok).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('prepares and signs in only the configured address when the local flag is on', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CQ_ENABLE_TEST_ACCOUNT_BYPASS', 'true');
    vi.stubEnv('CQ_TEST_ACCOUNT_EMAIL', 'campusquesttest@uri.edu');
    prepare.mockResolvedValue({ userId: 'user-1', email: 'campusquesttest@uri.edu' });
    signIn.mockResolvedValue(true);
    const { startLocalTestAccount } = await import('@/app/login/test-account-actions');
    await expect(startLocalTestAccount()).resolves.toEqual({ ok: true });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith('user-1', 'campusquesttest@uri.edu');
  });
});
