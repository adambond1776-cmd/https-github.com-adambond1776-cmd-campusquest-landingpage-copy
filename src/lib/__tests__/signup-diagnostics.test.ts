import { describe, expect, it } from 'vitest';
import { STORAGE_UNCONFIGURED_MESSAGE } from '@/lib/runtime';
import {
  SIGNUP_CODE_RETRY_MESSAGE,
  SIGNUP_RETRY_MESSAGE,
  classifySignupError,
  userFacingSignupMessage,
} from '@/lib/signup-diagnostics';

describe('signup diagnostics', () => {
  it('does not present age-table failures as a Storage bucket outage', () => {
    expect(classifySignupError(new Error('Could not save age: relation "cq_age_records" does not exist'))).toBe(
      'database'
    );
    expect(userFacingSignupMessage('database')).toBe(SIGNUP_RETRY_MESSAGE);
    expect(userFacingSignupMessage('database')).not.toBe(STORAGE_UNCONFIGURED_MESSAGE);
    expect(userFacingSignupMessage('email')).toBe(SIGNUP_RETRY_MESSAGE);
  });

  it('classifies missing verification persistence as a database problem, not Storage', () => {
    expect(
      classifySignupError(new Error('Could not save verification challenge: permission denied'))
    ).toBe('database');
    expect(userFacingSignupMessage('database')).not.toMatch(/storage is not configured/i);
  });

  it('keeps a dedicated retry string for failed code sends', () => {
    expect(SIGNUP_CODE_RETRY_MESSAGE).toMatch(/code/i);
    expect(SIGNUP_CODE_RETRY_MESSAGE).not.toMatch(/storage/i);
  });
});
