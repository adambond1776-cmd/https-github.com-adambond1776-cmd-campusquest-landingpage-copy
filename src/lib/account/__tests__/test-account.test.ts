import { afterEach, describe, expect, it, vi } from 'vitest';
import { exactTestAccountEmail, localTestAccountEmail, testAccountBypassDecision } from '@/lib/account/test-account';

const EMAIL = 'campusquesttest@uri.edu';

afterEach(() => vi.unstubAllEnvs());

describe('local test account bypass', () => {
  it('allows the configured address when the flag is on outside production', () => {
    expect(testAccountBypassDecision({
      production: false,
      flag: 'true',
      configuredEmail: `  ${EMAIL.toUpperCase()}  `,
    }, EMAIL)).toBe(true);
  });

  it('refuses every other address, including the same domain', () => {
    const env = { production: false, flag: 'true', configuredEmail: EMAIL };
    expect(testAccountBypassDecision(env, 'other@uri.edu')).toBe(false);
    expect(testAccountBypassDecision(env, 'campusquesttest@uri.edu.evil.com')).toBe(false);
    expect(testAccountBypassDecision(env, '')).toBe(false);
  });

  it('stays closed when the flag is missing or not exactly true', () => {
    expect(testAccountBypassDecision({ production: false, flag: undefined, configuredEmail: EMAIL }, EMAIL)).toBe(false);
    expect(testAccountBypassDecision({ production: false, flag: 'false', configuredEmail: EMAIL }, EMAIL)).toBe(false);
    expect(testAccountBypassDecision({ production: false, flag: 'TRUE', configuredEmail: EMAIL }, EMAIL)).toBe(false);
  });

  it('stays closed in production even when the flag and email are set', () => {
    expect(testAccountBypassDecision({
      production: true,
      flag: 'true',
      configuredEmail: EMAIL,
    }, EMAIL)).toBe(false);
  });

  it('rejects wildcard and list configuration', () => {
    expect(exactTestAccountEmail('*@uri.edu')).toBeNull();
    expect(exactTestAccountEmail('a@uri.edu,b@uri.edu')).toBeNull();
    expect(testAccountBypassDecision({
      production: false,
      flag: 'true',
      configuredEmail: '*@uri.edu',
    }, 'campusquesttest@uri.edu')).toBe(false);
  });

  it('reads the server env and still refuses production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CQ_ENABLE_TEST_ACCOUNT_BYPASS', 'true');
    vi.stubEnv('CQ_TEST_ACCOUNT_EMAIL', EMAIL);
    expect(localTestAccountEmail()).toBe(EMAIL);
    vi.stubEnv('NODE_ENV', 'production');
    expect(localTestAccountEmail()).toBeNull();
  });
});
