/**
 * Authorization facts for a CampusQuest account.
 *
 * URI verification is `public.profiles.campus_email_verified_at`. Auth
 * user_metadata is client-editable, and `user_school_verifications` is
 * client-writable. Neither one is an authorization source. `profiles.role`
 * is a production game role and is not a landing privilege.
 */

export type AccountRole = 'student' | 'organization';

export type AccountProfile = {
  userId: string;
  campusEmailVerifiedAt: string | null;
};

export type AccountPrivileges = {
  verified: boolean;
  /** This foundation does not grant a paid plan from a profile row or metadata. */
  plan: 'free';
};

export function accountPrivileges(
  profile: AccountProfile | null,
  _metadata: Record<string, unknown> = {}
): AccountPrivileges {
  const verified =
    typeof profile?.campusEmailVerifiedAt === 'string' &&
    profile.campusEmailVerifiedAt.trim().length > 0;
  return { verified, plan: 'free' };
}

export function canUseAccountFeatures(
  profile: AccountProfile | null,
  metadata: Record<string, unknown> = {}
): boolean {
  return accountPrivileges(profile, metadata).verified;
}

/** Signup cannot carry a paid plan into the server profile. */
export function serverSignupPlan(): 'free' {
  return 'free';
}

export function preferenceUserMetadata(input: {
  interests: string[];
  interestPreferences: unknown;
}): Record<string, unknown> {
  return {
    interests: input.interests,
    interest_preferences: input.interestPreferences,
  };
}
