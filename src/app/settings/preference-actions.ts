'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { needsCampusEmailVerification } from '@/lib/email-verification';
import { validateInterestProfile, type InterestSaveResult } from '@/lib/interests';

/** Always targets the cookie-authenticated account, never a caller-supplied ID. */
export async function saveMyInterests(input: unknown): Promise<InterestSaveResult> {
  const validated = validateInterestProfile(input);
  if (!validated.ok) return validated;
  try {
    const supabase = await createClient();
    if (!supabase) return { ok: false, message: 'Accounts are not connected in this environment.' };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { ok: false, message: 'Please sign in again to save your interests.' };
    if (needsCampusEmailVerification(data.user.user_metadata)) {
      return { ok: false, message: 'Verify your email before saving your interests.' };
    }
    const { error: updateError } = await supabase.auth.updateUser({
      data: { interests: validated.interests, interest_preferences: validated.profile },
    });
    if (updateError) return { ok: false, message: 'Your interests could not be saved. Please try again.' };
  } catch {
    return { ok: false, message: 'Your interests could not be saved. Please try again.' };
  }
  revalidatePath('/settings');
  revalidatePath('/activities');
  return validated;
}
