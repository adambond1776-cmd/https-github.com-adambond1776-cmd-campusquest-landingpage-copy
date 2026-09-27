import { describe, expect, it, vi } from 'vitest';
import { AUTH_UNCONFIGURED_MESSAGE } from '@/lib/runtime';
import { SIGNUP_RETRY_MESSAGE } from '@/lib/signup-diagnostics';
import {
  LOGIN_NO_ACCOUNT_MESSAGE,
  deliverLoginLink,
  loginBypassVisible,
  loginCallbackUrl,
  loginEmailUrl,
  type LoginLinkDelivery,
} from '@/lib/login-link';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function delivery(overrides: Partial<LoginLinkDelivery> = {}): LoginLinkDelivery {
  return {
    email: 'student@uri.edu',
    redirectTo: '/welcome',
    origin: 'http://localhost:43917',
    siteUrl: 'http://localhost:43917',
    production: false,
    supabaseConfigured: true,
    mailConfigured: true,
    unavailableMessage: AUTH_UNCONFIGURED_MESSAGE,
    retryMessage: SIGNUP_RETRY_MESSAGE,
    findUser: vi.fn(async () => USER_ID),
    generateLink: vi.fn(async () => ({ userId: USER_ID, tokenHash: 'hashed-token' })),
    sendEmail: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('login email delivery', () => {
  it('sends a Resend magic link for an existing account and does not create one', async () => {
    const input = delivery();
    const result = await deliverLoginLink(input);

    expect(result).toEqual({ ok: true, mock: false, alreadyRegistered: true });
    expect(input.findUser).toHaveBeenCalledWith('student@uri.edu');
    expect(input.generateLink).toHaveBeenCalledWith(
      'student@uri.edu',
      'http://localhost:43917/auth/callback?next=%2Fwelcome'
    );
    expect(input.sendEmail).toHaveBeenCalledWith(
      'student@uri.edu',
      loginEmailUrl('http://localhost:43917/auth/callback?next=%2Fwelcome', 'hashed-token')
    );
  });

  it('does not generate or send a link when no account exists', async () => {
    const input = delivery({ findUser: vi.fn(async () => null) });
    const result = await deliverLoginLink(input);

    expect(result).toEqual({ ok: false, message: LOGIN_NO_ACCOUNT_MESSAGE });
    expect(input.generateLink).not.toHaveBeenCalled();
    expect(input.sendEmail).not.toHaveBeenCalled();
  });

  it('fails closed when the account lookup errors', async () => {
    const input = delivery({
      findUser: vi.fn(async () => {
        throw new Error('lookup failed');
      }),
    });

    await expect(deliverLoginLink(input)).resolves.toEqual({
      ok: false,
      message: SIGNUP_RETRY_MESSAGE,
    });
    expect(input.generateLink).not.toHaveBeenCalled();
    expect(input.sendEmail).not.toHaveBeenCalled();
  });

  it('does not email a link when link generation returns a different user', async () => {
    const input = delivery({
      generateLink: vi.fn(async () => ({ userId: 'someone-else', tokenHash: 'hashed-token' })),
    });

    await expect(deliverLoginLink(input)).resolves.toEqual({
      ok: false,
      message: SIGNUP_RETRY_MESSAGE,
    });
    expect(input.sendEmail).not.toHaveBeenCalled();
  });

  it('uses the development bypass only when Supabase is not configured', async () => {
    const input = delivery({ supabaseConfigured: false, mailConfigured: false });
    await expect(deliverLoginLink(input)).resolves.toEqual({
      ok: true,
      mock: true,
      alreadyRegistered: false,
    });
    expect(input.findUser).not.toHaveBeenCalled();
    expect(input.generateLink).not.toHaveBeenCalled();
    expect(input.sendEmail).not.toHaveBeenCalled();
    expect(loginBypassVisible(true, false)).toBe(true);
  });

  it('never exposes the bypass in production', async () => {
    const unconfigured = delivery({ production: true, supabaseConfigured: false });
    await expect(deliverLoginLink(unconfigured)).resolves.toEqual({
      ok: false,
      message: AUTH_UNCONFIGURED_MESSAGE,
    });
    expect(unconfigured.findUser).not.toHaveBeenCalled();

    const noMail = delivery({ production: true, mailConfigured: false, siteUrl: 'https://www.joincampusquest.com' });
    await expect(deliverLoginLink(noMail)).resolves.toEqual({
      ok: false,
      message: AUTH_UNCONFIGURED_MESSAGE,
    });
    expect(noMail.generateLink).not.toHaveBeenCalled();
    expect(loginBypassVisible(true, true)).toBe(false);
  });

  it('logs the Resend failure stage without keeping a login token', async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args);
    });
    const input = delivery({
      sendEmail: vi.fn(async () => {
        const failure = new Error(
          'The campusquestapp.com domain is not verified. token_hash=secret-token'
        ) as Error & { stage: string; code: string };
        failure.stage = 'resend_send';
        failure.code = 'validation_error';
        throw failure;
      }),
    });

    await expect(deliverLoginLink(input)).resolves.toEqual({
      ok: false,
      message: SIGNUP_RETRY_MESSAGE,
    });
    const logged = JSON.stringify(errors);
    expect(logged).toContain('resend_send');
    expect(logged).toContain('validation_error');
    expect(logged).toContain('domain is not verified');
    expect(logged).not.toContain('secret-token');
    spy.mockRestore();
  });

  it('refuses a localhost callback in production', () => {
    expect(
      loginCallbackUrl({
        siteUrl: 'http://localhost:43917',
        origin: 'http://localhost:43917',
        production: true,
      })
    ).toBeNull();
    expect(
      loginCallbackUrl({
        siteUrl: 'https://www.joincampusquest.com',
        origin: 'http://localhost:43917',
        redirectTo: '/settings',
        production: true,
      })
    ).toBeNull();
    expect(
      loginCallbackUrl({
        siteUrl: 'https://joincampusquest.com',
        origin: 'http://localhost:43917',
        redirectTo: '/settings',
        production: true,
      })
    ).toBe('https://joincampusquest.com/auth/callback?next=%2Fsettings');
  });
});
