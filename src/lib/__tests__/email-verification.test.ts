import { describe, expect, it } from 'vitest';
import {
  isCampusEmailVerified,
  isValidCampusEmailCode,
  maskCampusEmail,
  needsCampusEmailVerification,
} from '@/lib/email-verification';
import {
  campusEmailCodesMatch,
  generateCampusEmailCode,
  hashCampusEmailCode,
} from '@/lib/email-verification-crypto';

describe('campus email verification helpers', () => {
  it('accepts only 6-digit codes', () => {
    expect(isValidCampusEmailCode('123456')).toBe(true);
    expect(isValidCampusEmailCode('12345')).toBe(false);
    expect(isValidCampusEmailCode('1234567')).toBe(false);
    expect(isValidCampusEmailCode('12a456')).toBe(false);
  });

  it('masks the local part of an address', () => {
    expect(maskCampusEmail('ram@uri.edu')).toBe('r••@uri.edu');
  });

  it('treats pending metadata as unverified and omitted keys as grandfathered', () => {
    expect(needsCampusEmailVerification({ campus_email_pending: true })).toBe(true);
    expect(needsCampusEmailVerification({ campus_email_verified_at: null })).toBe(true);
    expect(needsCampusEmailVerification({})).toBe(false);
    expect(isCampusEmailVerified({})).toBe(true);
    expect(isCampusEmailVerified({ campus_email_verified_at: '2026-09-17T00:00:00.000Z' })).toBe(
      true
    );
    expect(
      isCampusEmailVerified({
        campus_email_pending: false,
        campus_email_verified_at: '2026-09-17T00:00:00.000Z',
      })
    ).toBe(true);
    expect(isCampusEmailVerified({ campus_email_pending: true })).toBe(false);
  });

  it('hashes codes with HMAC and compares in constant time', () => {
    const secret = 'test-secret';
    const code = generateCampusEmailCode();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashCampusEmailCode({
      userId: 'user-1',
      email: 'ram@uri.edu',
      code,
      secret,
    });
    const same = hashCampusEmailCode({
      userId: 'user-1',
      email: 'ram@uri.edu',
      code,
      secret,
    });
    const other = hashCampusEmailCode({
      userId: 'user-1',
      email: 'ram@uri.edu',
      code: code === '000000' ? '000001' : '000000',
      secret,
    });
    expect(campusEmailCodesMatch(hash, same)).toBe(true);
    expect(campusEmailCodesMatch(hash, other)).toBe(false);
  });
});
