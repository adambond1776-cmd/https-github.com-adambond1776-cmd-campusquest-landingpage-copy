'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteAccount } from '@/lib/account/delete';

export type DeleteResult = { ok: true } | { ok: false; message: string };

/**
 * Deletes the signed-in account.
 *
 * The confirmation phrase is checked on the server as well as in the form.
 * Client-side confirmation stops accidents, which is most of the value, but the
 * server is what stops a stray request, and this is the one action on the site
 * that cannot be undone.
 */
export async function deleteMyAccount(confirmation: string): Promise<DeleteResult> {
  if (confirmation.trim().toLowerCase() !== 'delete my account') {
    return { ok: false, message: 'Type the phrase exactly to confirm.' };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'Accounts are not connected in this environment, so there is nothing to delete.',
    };
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return { ok: false, message: 'Sign in first.' };

  const result = await deleteAccount({ email: user.email, userId: user.id });
  if (!result.ok) return { ok: false, message: result.message };

  // The auth user is already gone by this point; clearing the cookie stops the
  // browser holding a session for an account that no longer exists.
  await supabase.auth.signOut();

  return { ok: true };
}
