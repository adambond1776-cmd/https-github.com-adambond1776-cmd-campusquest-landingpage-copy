import type { SupabaseClient } from '@supabase/supabase-js';
import { accountPrivileges, type AccountProfile } from '@/lib/account/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

const TABLE = 'profiles';

type ProfileRow = {
  id: string;
  campus_email_verified_at: string | null;
};

/**
 * Placeholder identity columns required by the production profile table.
 * Role is left null. Verification is left null so the production consume
 * function is the only writer of campus_email_verified_at.
 */
export function shellProfileUsername(userId: string): string {
  const compact = userId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const body = (compact || 'member').slice(0, 23);
  return (`n${body}`).slice(0, 24);
}

export function mapProfileRow(row: ProfileRow): AccountProfile {
  return {
    userId: row.id,
    campusEmailVerifiedAt: row.campus_email_verified_at,
  };
}

export async function loadAccountForSessionUser(
  client: SupabaseClient,
  userId: string
): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('id, campus_email_verified_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data?.id) return null;
  return mapProfileRow(data as ProfileRow);
}

export async function isServerAccountVerified(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const profile = await loadAccountForSessionUser(admin, userId);
  return accountPrivileges(profile).verified;
}

/**
 * Creates the profile row a new Auth user needs before the production
 * verification function can stamp campus_email_verified_at. An existing
 * profile is left unchanged, including its role and verification timestamp.
 */
export async function ensureUnverifiedProfileShell(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await admin.from(TABLE).select('id').eq('id', userId).maybeSingle();
  if (error) throw new Error('Could not prepare the account profile.');
  if (data?.id) return;

  const { error: insertError } = await admin.from(TABLE).insert({
    id: userId,
    username: shellProfileUsername(userId),
    display_name: 'New member',
  });
  if (insertError) throw new Error('Could not prepare the account profile.');
}
