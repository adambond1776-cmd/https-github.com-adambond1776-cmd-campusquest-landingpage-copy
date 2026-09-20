import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SCHOOL_EMAIL_REQUIRED_MESSAGE,
  isAllowedStudentSignupEmail,
  studentSignupEmailRejection,
} from '@/lib/signup-email-policy';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('student signup email policy', () => {
  it('allows @uri.edu addresses', () => {
    expect(isAllowedStudentSignupEmail('Nick.Lockhart@URI.edu')).toBe(true);
    expect(studentSignupEmailRejection('nick.lockhart@uri.edu')).toBeNull();
  });

  it('rejects other student domains', () => {
    expect(studentSignupEmailRejection('student@gmail.com')).toBe(SCHOOL_EMAIL_REQUIRED_MESSAGE);
    expect(studentSignupEmailRejection('student@brown.edu')).toBe(SCHOOL_EMAIL_REQUIRED_MESSAGE);
  });

  it('allows a QA address from the env allowlist', () => {
    vi.stubEnv('QA_SIGNUP_EMAIL', 'qa@example.com, other@test.edu');
    expect(isAllowedStudentSignupEmail('qa@example.com')).toBe(true);
    expect(studentSignupEmailRejection('other@test.edu')).toBeNull();
    expect(studentSignupEmailRejection('not-listed@example.com')).toBe(
      SCHOOL_EMAIL_REQUIRED_MESSAGE
    );
  });
});
