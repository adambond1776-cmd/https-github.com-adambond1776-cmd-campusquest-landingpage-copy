'use server';

import { localTestAccountEmail } from '@/lib/account/test-account';
import { prepareLocalTestAccount, signInPreparedTestAccount } from '@/lib/account/test-account-provision';

export type LocalTestAccountResult = { ok: true } | { ok: false; message: string };

/** Prepares and signs in the one configured local test account. The browser cannot choose the email. */
export async function startLocalTestAccount(): Promise<LocalTestAccountResult> {
  if (!localTestAccountEmail()) return { ok: false, message: 'Local test account is not available.' };
  try {
    const account = await prepareLocalTestAccount();
    const signedIn = await signInPreparedTestAccount(account.userId, account.email);
    if (!signedIn) return { ok: false, message: 'The test account could not be signed in.' };
    return { ok: true };
  } catch {
    return { ok: false, message: 'Local test account is not available.' };
  }
}
