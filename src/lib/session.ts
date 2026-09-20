import { createClient } from '@/lib/supabase/server';
import type { CurrentUser, Plan, Role } from '@/lib/auth';
import { interestLabels, normalizeInterestProfile } from '@/lib/interests';

const ROLES: Role[] = ['student', 'organization'];
const PLANS: Plan[] = ['free', 'basic', 'premium', 'club'];

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
  if (!user?.email) return null;

  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  const interestPreferences = normalizeInterestProfile(metadata.interest_preferences, metadata.interests);
  return {
    email: user.email,
    role: ROLES.includes(metadata.role as Role) ? (metadata.role as Role) : undefined,
    plan: PLANS.includes(metadata.plan as Plan) ? (metadata.plan as Plan) : undefined,
    interests: interestLabels(interestPreferences),
    interestPreferences,
  };
}

export async function signedInEmail(): Promise<string | null> {
  return (await signedInUser())?.email ?? null;
}
