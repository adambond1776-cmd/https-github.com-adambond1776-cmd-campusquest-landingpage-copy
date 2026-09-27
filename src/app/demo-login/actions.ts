'use server';

import { demoPasswordLoginAllowed, DEMO_ACCOUNT_EMAIL } from '@/lib/account/demo-account';
import { createClient } from '@/lib/supabase/server';

export type DemoLoginResult = { ok: true } | { ok: false; message: string };

const UNAVAILABLE = 'That sign-in is not available.';
const MISMATCH = 'The email or password did not match.';

/** Signs in the dedicated demo account. Does not create users or confirm emails. */
export async function signInDemoAccount(email: string, password: string): Promise<DemoLoginResult> {
  if (!demoPasswordLoginAllowed(email)) return { ok: false, message: UNAVAILABLE };
  if (!password) return { ok: false, message: MISMATCH };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: 'Sign-in is unavailable right now.' };

  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNT_EMAIL,
    password,
  });
  if (error) return { ok: false, message: MISMATCH };
  return { ok: true };
}
