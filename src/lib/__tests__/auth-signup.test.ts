import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_UNCONFIGURED_MESSAGE } from '@/lib/runtime';
import { SIGNUP_RETRY_MESSAGE } from '@/lib/signup-diagnostics';

const signInWithOtp = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOtp } }),
  isSupabaseConfigured: true,
}));

describe('signInWithEmail', () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
    vi.stubGlobal('window', {
      location: { origin: 'https://www.joincampusquest.com' },
    });
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.joincampusquest.com');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('emails a login link without creating a new account', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu' });

    expect(result).toEqual({ ok: true, mock: false, alreadyRegistered: false });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'student@uri.edu',
      options: {
        emailRedirectTo: 'https://www.joincampusquest.com/auth/callback?next=%2Fwelcome',
        shouldCreateUser: false,
      },
    });
  });

  it('returns a retry message when Supabase auth fails, without leaking the provider error', async () => {
    signInWithOtp.mockResolvedValue({
      error: { message: 'Redirect URL not allowed: http://secret.internal' },
    });
    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu' });

    expect(result).toEqual({ ok: false, message: SIGNUP_RETRY_MESSAGE });
  });

  it('times out a hung OTP request', async () => {
    signInWithOtp.mockImplementation(() => new Promise(() => {}));
    vi.resetModules();
    vi.doMock('@/lib/timeout', async () => {
      const actual = await vi.importActual<typeof import('@/lib/timeout')>('@/lib/timeout');
      return { ...actual, SIGNUP_NETWORK_TIMEOUT_MS: 20 };
    });
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({ auth: { signInWithOtp } }),
      isSupabaseConfigured: true,
    }));

    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.message).toBe(SIGNUP_RETRY_MESSAGE);
  });

  it('refuses to mint a localhost callback in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubGlobal('window', { location: { origin: 'http://localhost:43917' } });
    vi.resetModules();
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({ auth: { signInWithOtp } }),
      isSupabaseConfigured: true,
    }));

    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu' });

    expect(result).toEqual({ ok: false, message: AUTH_UNCONFIGURED_MESSAGE });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});
