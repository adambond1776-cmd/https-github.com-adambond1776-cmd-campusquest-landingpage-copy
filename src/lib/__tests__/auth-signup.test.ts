import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_UNCONFIGURED_MESSAGE } from '@/lib/runtime';

const requestLoginLink = vi.fn();

vi.mock('@/app/login/actions', () => ({
  requestLoginLink: (...args: unknown[]) => requestLoginLink(...args),
}));

describe('signInWithEmail', () => {
  beforeEach(() => {
    requestLoginLink.mockReset();
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:43917' },
      localStorage: {
        store: new Map<string, string>(),
        getItem(key: string) {
          return this.store.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          this.store.set(key, value);
        },
        removeItem(key: string) {
          this.store.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns the real emailed-link result without a local bypass', async () => {
    requestLoginLink.mockResolvedValue({ ok: true, mock: false, alreadyRegistered: true });
    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu', redirectTo: '/settings' });

    expect(result).toEqual({ ok: true, mock: false, alreadyRegistered: true });
    expect(requestLoginLink).toHaveBeenCalledWith({
      email: 'student@uri.edu',
      redirectTo: '/settings',
      origin: 'http://localhost:43917',
    });
  });

  it('keeps the development bypass only when the server says Supabase is unconfigured', async () => {
    requestLoginLink.mockResolvedValue({ ok: true, mock: true, alreadyRegistered: false });
    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu' });

    expect(result).toEqual({ ok: true, mock: true, alreadyRegistered: false });
  });

  it('does not honor a mock login result in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    requestLoginLink.mockResolvedValue({ ok: true, mock: true, alreadyRegistered: false });
    const { signInWithEmail } = await import('@/lib/auth');
    const result = await signInWithEmail({ email: 'student@uri.edu' });

    expect(result).toEqual({ ok: false, message: AUTH_UNCONFIGURED_MESSAGE });
  });
});
