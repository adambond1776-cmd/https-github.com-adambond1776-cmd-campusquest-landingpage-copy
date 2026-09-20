import { createClient } from '@/lib/supabase/server';
import { needsCampusEmailVerification } from '@/lib/email-verification';
import { ageStore } from '@/lib/age-store';
import { allows } from '@/lib/age';

export async function billingIdentity() {
  const client = await createClient();
  if (!client) throw new Error('Connect a test account database before testing checkout.');
  const { data, error } = await client.auth.getUser();
  const user = data.user;
  if (error || !user?.email) throw new Error('Sign in before managing a subscription.');
  if (!user.email_confirmed_at || needsCampusEmailVerification(user.user_metadata)) {
    throw new Error('Verify your email before managing a subscription.');
  }
  if (user.user_metadata?.role === 'organization') throw new Error('This test flow is for student plans, not organization accounts.');
  const age = await ageStore().get(user.email);
  if (!allows(age, 'billing').allowed) throw new Error('Subscription testing requires a verified adult account with an age record.');
  return { id: user.id, email: user.email };
}
