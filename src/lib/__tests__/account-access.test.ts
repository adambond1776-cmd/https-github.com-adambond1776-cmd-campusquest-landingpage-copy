import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
const ageGet = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock('@/lib/age-store', () => ({ ageStore: () => ({ get: ageGet }) }));

const verified = {
  id: 'me',
  campus_email_verified_at: '2026-09-01T00:00:00.000Z',
};

describe('account access enforcement', () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
    ageGet.mockReset();
  });

  it('does not let an authenticated unverified user into protected account functionality', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'me',
          email: 'ram@uri.edu',
          user_metadata: {
            campus_email_verified_at: '2026-09-01T00:00:00.000Z',
            role: 'organization',
            plan: 'premium',
          },
        },
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: { ...verified, campus_email_verified_at: null },
      error: null,
    });
    const { redirectIfCampusEmailUnverified } = await import('@/lib/gate');
    await expect(redirectIfCampusEmailUnverified()).rejects.toThrow('REDIRECT /signup?verify=1');
  });

  it('accepts an existing profile whose campus email is already verified', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'me',
          email: 'ram@uri.edu',
          user_metadata: { campus_email_verified_at: null, role: 'faculty_staff' },
        },
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: verified, error: null });
    const { redirectIfCampusEmailUnverified } = await import('@/lib/gate');
    await expect(redirectIfCampusEmailUnverified()).resolves.toBeUndefined();
  });

  it('does not treat a legacy school verification or a confirmed auth email as campus verification', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'me',
          email: 'ram@uri.edu',
          email_confirmed_at: '2026-06-01T00:00:00.000Z',
          user_metadata: { status: 'verified', verified_at: '2026-06-01T00:00:00.000Z' },
        },
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: { id: 'me', campus_email_verified_at: null },
      error: null,
    });
    const { redirectIfCampusEmailUnverified } = await import('@/lib/gate');
    await expect(redirectIfCampusEmailUnverified('/settings')).rejects.toThrow(
      'REDIRECT /signup?verify=1&next=%2Fsettings'
    );
  });

  it('does not invent verification when the auth user has no profile', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'me', email: 'ram@uri.edu', user_metadata: { status: 'verified' } } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { redirectIfCampusEmailUnverified } = await import('@/lib/gate');
    await expect(redirectIfCampusEmailUnverified()).rejects.toThrow('REDIRECT /signup?verify=1');
  });

  it('does not send an allowlisted admin into the student verification gate', async () => {
    vi.stubEnv('GM_ADMIN_EMAILS', 'campusquest@campusquestapp.com');
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin',
          email: 'campusquest@campusquestapp.com',
          user_metadata: {},
        },
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: { id: 'admin', campus_email_verified_at: null },
      error: null,
    });
    ageGet.mockResolvedValue(null);
    const { redirectIfCampusEmailUnverified } = await import('@/lib/gate');
    await expect(redirectIfCampusEmailUnverified('/welcome')).resolves.toBeUndefined();
  });

  it('still sends an unverified student into campus verification when an admin allowlist exists', async () => {
    vi.stubEnv('GM_ADMIN_EMAILS', 'campusquest@campusquestapp.com');
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'me',
          email: 'ram@uri.edu',
          user_metadata: { role: 'admin', campus_email_verified_at: '2026-09-01T00:00:00.000Z' },
        },
      },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: { id: 'me', campus_email_verified_at: null },
      error: null,
    });
    const { redirectIfCampusEmailUnverified } = await import('@/lib/gate');
    await expect(redirectIfCampusEmailUnverified()).rejects.toThrow('REDIRECT /signup?verify=1');
  });

  it('does not treat a missing age record as verified adulthood', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'me', email: 'ram@uri.edu', user_metadata: {} } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: verified, error: null });
    ageGet.mockResolvedValue(null);
    const { gate } = await import('@/lib/gate');
    const access = await gate('directory');
    expect(access.signedIn).toBe(true);
    expect(access.allowed).toBe(false);
  });

  it('still lets a signed-out visitor browse the public directory', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { gate } = await import('@/lib/gate');
    const access = await gate('directory');
    expect(access.signedIn).toBe(false);
    expect(access.allowed).toBe(true);
  });
});
