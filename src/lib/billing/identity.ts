import { createClient } from '@/lib/supabase/server';
import { accountPrivileges } from '@/lib/account/authorization';
import { loadAccountForSessionUser } from '@/lib/account/profile';
import { ageStore } from '@/lib/age-store';
import { allows } from '@/lib/age';

export async function billingIdentity() {
  const client = await createClient();
  if (!client) throw new Error('Connect a test account database before testing checkout.');
  const { data, error } = await client.auth.getUser();
  const user = data.user;
  if (error || !user?.id || !user.email) throw new Error('Sign in before managing a subscription.');
  const profile = await loadAccountForSessionUser(client, user.id);
  const privileges = accountPrivileges(profile, user.user_metadata ?? {});
  if (!privileges.verified) {
    throw new Error('Verify your email before managing a subscription.');
  }
  const age = await ageStore().get(user.email);
  if (!allows(age, 'billing').allowed) throw new Error('Subscription testing requires a verified adult account with an age record.');
  return { id: user.id, email: user.email };
}
