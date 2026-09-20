import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

function database() {
  const client = createAdminClient();
  if (!client) throw new Error('Connect a test account database before testing billing.');
  return client;
}
export async function billingCustomer(userId: string, scope: 'student' | 'club' = 'student'): Promise<string | null> {
  const { data, error } = await database().from(scope === 'club' ? 'cq_club_test_billing' : 'cq_test_billing').select('customer_id').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Test billing storage is unavailable.');
  return data?.customer_id ?? null;
}
export async function bindBillingCustomer(userId: string, customerId: string, scope: 'student' | 'club' = 'student') {
  const { error } = await database().from(scope === 'club' ? 'cq_club_test_billing' : 'cq_test_billing').update({ customer_id: customerId }).eq('user_id', userId);
  if (error) throw new Error('Could not save the test customer.');
}
export async function withBillingLock<T>(userId: string, work: () => Promise<T>, scope: 'student' | 'club' = 'student'): Promise<T> {
  const client = database();
  const token = randomUUID();
  const { data, error } = await client.rpc(scope === 'club' ? 'cq_lock_club_test_billing' : 'cq_lock_test_billing', { p_user: userId, p_token: token });
  if (error) throw new Error('Test billing storage is unavailable.');
  if (data !== true) throw new Error('Another billing request is running. Wait a moment and refresh.');
  try { return await work(); }
  finally {
    await client.from(scope === 'club' ? 'cq_club_test_billing' : 'cq_test_billing').update({ lock_token: null, lock_until: null })
      .eq('user_id', userId).eq('lock_token', token);
  }
}
