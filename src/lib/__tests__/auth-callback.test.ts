import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn();
const loadAccountForSessionUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClient(),
}));

vi.mock('@/lib/account/profile', () => ({
  loadAccountForSessionUser: (...args: unknown[]) => loadAccountForSessionUser(...args),
}));

describe('login callback', () => {
  beforeEach(() => {
    createClient.mockReset();
    loadAccountForSessionUser.mockReset();
  });

  it('returns an existing verified account to the requested page', async () => {
    const verifyOtp = vi.fn(async () => ({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    }));
    createClient.mockResolvedValue({ auth: { verifyOtp } });
    loadAccountForSessionUser.mockResolvedValue({
      userId: 'user-1',
      campusEmailVerifiedAt: '2026-09-01T00:00:00.000Z',
    });

    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(
      new Request(
        'http://localhost:43917/auth/callback?token_hash=hashed-token&type=magiclink&next=%2Fsettings'
      )
    );

    expect(response.headers.get('location')).toBe('http://localhost:43917/settings');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hashed-token', type: 'magiclink' });
  });

  it('sends an unverified student to campus verification', async () => {
    vi.stubEnv('GM_ADMIN_EMAILS', 'campusquest@campusquestapp.com');
    createClient.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn(async () => ({
          data: { user: { id: 'student-1', email: 'ram@uri.edu', user_metadata: { role: 'admin' } } },
          error: null,
        })),
      },
    });
    loadAccountForSessionUser.mockResolvedValue({
      userId: 'student-1',
      campusEmailVerifiedAt: null,
    });

    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:43917/auth/callback?token_hash=hashed-token&type=magiclink&next=%2Fwelcome')
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:43917/signup?verify=1&next=%2Fwelcome'
    );
  });

  it('sends the allowlisted admin to /admin instead of student onboarding', async () => {
    vi.stubEnv('GM_ADMIN_EMAILS', 'campusquest@campusquestapp.com');
    createClient.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn(async () => ({
          data: {
            user: {
              id: 'admin-1',
              email: 'campusquest@campusquestapp.com',
              user_metadata: {},
            },
          },
          error: null,
        })),
      },
    });
    loadAccountForSessionUser.mockResolvedValue({
      userId: 'admin-1',
      campusEmailVerifiedAt: null,
    });

    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:43917/auth/callback?token_hash=hashed-token&type=magiclink&next=%2Fwelcome')
    );

    expect(response.headers.get('location')).toBe('http://localhost:43917/admin');
  });

  it('sends a bad or expired link to the link-error page', async () => {
    createClient.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn(async () => ({ data: { user: null }, error: { message: 'expired' } })),
        exchangeCodeForSession: vi.fn(),
      },
    });

    const { GET } = await import('@/app/auth/callback/route');
    const expired = await GET(
      new Request('http://localhost:43917/auth/callback?token_hash=stale&type=magiclink')
    );
    const rejected = await GET(
      new Request('http://localhost:43917/auth/callback?error=access_denied&error_description=expired')
    );

    expect(expired.headers.get('location')).toBe(
      'http://localhost:43917/auth/auth-code-error?reason=link'
    );
    expect(rejected.headers.get('location')).toBe(
      'http://localhost:43917/auth/auth-code-error?reason=link'
    );
  });

  it('rejects a link that has no code and no token', async () => {
    createClient.mockResolvedValue({ auth: {} });
    const { GET } = await import('@/app/auth/callback/route');
    const response = await GET(new Request('http://localhost:43917/auth/callback'));
    expect(response.headers.get('location')).toBe(
      'http://localhost:43917/auth/auth-code-error?reason=missing'
    );
  });
});
