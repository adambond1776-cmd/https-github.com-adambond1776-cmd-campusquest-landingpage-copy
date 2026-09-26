import { describe, expect, it } from 'vitest';
import {
  accountPrivileges,
  preferenceUserMetadata,
  serverSignupPlan,
  type AccountProfile,
} from '@/lib/account/authorization';

const unverified: AccountProfile = {
  userId: 'user-1',
  campusEmailVerifiedAt: null,
};

const verified: AccountProfile = {
  userId: 'user-1',
  campusEmailVerifiedAt: '2026-09-01T00:00:00.000Z',
};

const forged = {
  campus_email_pending: false,
  campus_email_verified_at: '2026-09-01T00:00:00.000Z',
  role: 'admin',
  plan: 'premium',
  status: 'verified',
  verified_at: '2026-09-01T00:00:00.000Z',
};

describe('server account privileges ignore client metadata', () => {
  it('does not let a user self-mark their campus email verified', () => {
    expect(accountPrivileges(unverified, forged).verified).toBe(false);
  });

  it('accepts an existing profile verification timestamp', () => {
    expect(accountPrivileges(verified, { campus_email_verified_at: null, status: 'pending' }).verified).toBe(true);
  });

  it('does not treat a missing profile as verified', () => {
    expect(accountPrivileges(null, forged).verified).toBe(false);
  });

  it('does not let user_school_verifications or metadata grant verification', () => {
    expect(accountPrivileges(unverified, { status: 'verified', verified_at: '2026-09-01T00:00:00.000Z' }).verified).toBe(
      false
    );
  });

  it('does not treat Auth email confirmation as campus verification', () => {
    expect(accountPrivileges(unverified, { email_confirmed_at: '2026-06-01T00:00:00.000Z' }).verified).toBe(false);
  });

  it('does not let a user self-grant a plan or entitlement', () => {
    expect(accountPrivileges(verified, forged).plan).toBe('free');
    expect(serverSignupPlan()).toBe('free');
    expect(preferenceUserMetadata({ interests: ['Music'], interestPreferences: { version: 1, selections: [] } })).toEqual({
      interests: ['Music'],
      interest_preferences: { version: 1, selections: [] },
    });
  });
});
