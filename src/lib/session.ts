import { createClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/auth';
import { accountPrivileges, type AccountPrivileges } from '@/lib/account/authorization';
import { loadAccountForSessionUser } from '@/lib/account/profile';
import { interestLabels, normalizeInterestProfile } from '@/lib/interests';

/**
 * The signed-in user, resolved on the server.
 *
 * Returns null when no Supabase project is configured, because the localStorage
 * mock that stands in during local development is not readable from here. Pages
 * that need to work in both places fall back to asking the client.
 */
export async function signedInUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id || !user.email) return null;

  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  const interestPreferences = normalizeInterestProfile(metadata.interest_preferences, metadata.interests);
  const profile = await loadAccountForSessionUser(supabase, user.id);
  const privileges = accountPrivileges(profile, metadata);
  return {
    email: user.email,
    role: undefined,
    plan: privileges.plan,
    interests: interestLabels(interestPreferences),
    interestPreferences,
  };
}

export async function signedInEmail(): Promise<string | null> {
  return (await signedInUser())?.email ?? null;
}

export async function sessionPrivileges(metadata: Record<string, unknown> = {}): Promise<
  | { state: 'unconfigured' }
  | { state: 'anonymous' }
  | {
      state: 'signed-in';
      userId: string;
      email: string;
      privileges: AccountPrivileges;
    }
> {
  const supabase = await createClient();
  if (!supabase) return { state: 'unconfigured' };
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id || !user.email) return { state: 'anonymous' };
  const profile = await loadAccountForSessionUser(supabase, user.id);
  return {
    state: 'signed-in',
    userId: user.id,
    email: user.email,
    privileges: accountPrivileges(profile, { ...metadata, ...(user.user_metadata ?? {}) }),
  };
}
