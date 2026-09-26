import { interestOption, normalizeInterestProfile } from '@/lib/interests';
import { createClient } from '@/lib/supabase/server';

/**
 * Interests for the signed-in user only.
 *
 * The interest picker writes the official CampusQuest selections onto the
 * session. user_onboarding_preferences.interests is the canonical column, and
 * it is used when the picker has not saved a selection yet. Older rows in that
 * column can still hold short slugs such as "career" from a previous taxonomy.
 * Those slugs must not replace the selections the member actually saved.
 */
export function interestsForRecommendations(
  tableInterests: unknown,
  metadataPreferences: unknown,
  metadataInterests: unknown,
): string[] {
  const profile = normalizeInterestProfile(metadataPreferences, metadataInterests);
  const selected = profile.selections.map((selection) => interestOption(selection.id)!.label);
  if (selected.length) return selected;

  if (!Array.isArray(tableInterests)) return [];
  return tableInterests.filter(
    (interest): interest is string => typeof interest === 'string' && interest.trim().length > 0,
  );
}

export async function loadOwnInterests(): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id) return [];

  const { data: preferences, error } = await supabase
    .from('user_onboarding_preferences')
    .select('interests')
    .eq('user_id', user.id)
    .maybeSingle();

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return interestsForRecommendations(
    error ? [] : preferences?.interests,
    metadata.interest_preferences,
    metadata.interests,
  );
}
