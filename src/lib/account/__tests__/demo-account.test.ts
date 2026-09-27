import { describe, expect, it } from 'vitest';
import { DEMO_ACCOUNT_EMAIL, demoPasswordLoginAllowed, isDemoAccountEmail } from '@/lib/account/demo-account';

describe('demo account restrictions', () => {
  it('recognizes only the dedicated demo address', () => {
    expect(isDemoAccountEmail(DEMO_ACCOUNT_EMAIL)).toBe(true);
    expect(isDemoAccountEmail(' Demo@CampusQuestApp.com ')).toBe(true);
    expect(isDemoAccountEmail('student@uri.edu')).toBe(false);
    expect(isDemoAccountEmail('demo@campusquestapp.com.evil.com')).toBe(false);
    expect(isDemoAccountEmail('*@campusquestapp.com')).toBe(false);
    expect(demoPasswordLoginAllowed('student@uri.edu')).toBe(false);
    expect(demoPasswordLoginAllowed(DEMO_ACCOUNT_EMAIL)).toBe(true);
  });
});
