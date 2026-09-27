import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithPassword = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient,
}));

import { signInDemoAccount } from '@/app/demo-login/actions';

beforeEach(() => {
  signInWithPassword.mockReset();
  createClient.mockReset();
  createClient.mockResolvedValue({ auth: { signInWithPassword } });
  signInWithPassword.mockResolvedValue({ error: null });
});

describe('demo password login', () => {
  it('does not check a password for any other email', async () => {
    const result = await signInDemoAccount('student@uri.edu', 'not-the-demo-password');
    expect(result).toEqual({ ok: false, message: 'That sign-in is not available.' });
    expect(createClient).not.toHaveBeenCalled();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in only the dedicated demo address and does not create an account', async () => {
    const result = await signInDemoAccount('demo@campusquestapp.com', 'typed-by-the-visitor');
    expect(result).toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'demo@campusquestapp.com',
      password: 'typed-by-the-visitor',
    });
  });

  it('returns a mismatch when the demo password is wrong', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const result = await signInDemoAccount('demo@campusquestapp.com', 'wrong-password');
    expect(result).toEqual({ ok: false, message: 'The email or password did not match.' });
  });
});
