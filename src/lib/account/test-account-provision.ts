import { randomBytes } from 'node:crypto';
import { ageStore } from '@/lib/age-store';
import { localTestAccountEmail } from '@/lib/account/test-account';
import { ensureUnverifiedProfileShell } from '@/lib/account/profile';
import { findAuthUserByEmail } from '@/lib/email-verification-service';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/signup-email-policy';

const ADULT_BIRTH_YEAR = 2000;

function oneTimePassword(): string {
  return `Aa1!${randomBytes(24).toString('base64url')}`;
}

export async function prepareLocalTestAccount(): Promise<{ userId: string; email: string }> {
  const email = localTestAccountEmail();
  if (!email) throw new Error('Local test account is not available.');
  const admin = createAdminClient();
  if (!admin) throw new Error('Local test account is not available.');

  const existing = await findAuthUserByEmail(email);
  const user = existing ?? await createTestAuthUser(email);
  await markTestProfile(user.id);
  await ageStore().attest(email, ADULT_BIRTH_YEAR);
  await ensureTestPreferences(user.id);
  return { userId: user.id, email };
}

async function createTestAuthUser(email: string): Promise<{ id: string }> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Local test account is not available.');
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizeEmail(email),
    password: oneTimePassword(),
    email_confirm: true,
    app_metadata: { cq_test_account: true },
  });
  if (error || !data.user?.id) throw new Error('Local test account is not available.');
  try {
    await ensureUnverifiedProfileShell(admin, data.user.id);
  } catch (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }
  return { id: data.user.id };
}

async function markTestProfile(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Local test account is not available.');
  await ensureUnverifiedProfileShell(admin, userId);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('profiles')
    .update({
      campus_email_verified_at: now,
      is_test_user: true,
      is_hidden: true,
      is_internal_tester: true,
      role: 'qa',
      display_name: 'CampusQuest test account',
    })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error || !data?.id) throw new Error('Local test account is not available.');
}

async function ensureTestPreferences(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Local test account is not available.');
  const { data, error } = await admin
    .from('user_onboarding_preferences')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Local test account is not available.');
  if (data?.user_id) return;
  const { error: insertError } = await admin.from('user_onboarding_preferences').insert({
    user_id: userId,
    school_name: 'University of Rhode Island',
    interests: ['academics'],
    discovery_focus: ['events'],
  });
  if (insertError) throw new Error('Local test account is not available.');
}

export async function signInPreparedTestAccount(userId: string, email: string): Promise<boolean> {
  const admin = createAdminClient();
  const supabase = await createClient();
  if (!admin || !supabase) return false;
  const password = oneTimePassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) return false;
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  return !signInError;
}
