'use server';

import { revalidatePath } from 'next/cache';
import { isPaidPlan, type BillingResult } from '@/lib/billing/catalog';
import { testBillingConfig } from '@/lib/billing/config';
import { billingIdentity } from '@/lib/billing/identity';
import { changeTestCancellation, readTestSubscription, startTestCheckout } from '@/lib/billing/service';

export async function manageTestBilling(command: unknown): Promise<BillingResult> {
  if (!isPaidPlan(command) && command !== 'cancel' && command !== 'resume' && command !== 'refresh') {
    return { ok: false, message: 'Unknown billing action.' };
  }
  try {
    testBillingConfig(); // No live mode and no fallback to the legacy key.
    const user = await billingIdentity(); // Never accept user/customer IDs from a caller.
    const url = isPaidPlan(command) ? await startTestCheckout(user.id, user.email, command) : undefined;
    const subscription = command === 'cancel' || command === 'resume'
      ? await changeTestCancellation(user.id, command === 'cancel')
      : await readTestSubscription(user.id);
    revalidatePath('/billing');
    revalidatePath('/activities');
    return { ok: true, view: { available: true, subscription }, ...(url ? { url } : {}) };
  } catch (error) {
    // Expected messages are our own; provider internals and credentials never go to the client.
    const message = error instanceof Error && !('type' in error) ? error.message : '';
    const safe = /^(Test billing|A Stripe test|Configure separate|Invalid test|Connect a test|Sign in|Verify your|This test flow|Subscription testing|Another billing|You already|A checkout|Multiple |The test price|There is no test|This subscription has ended|Resolve the payment|Checkout is unavailable)/.test(message);
    return { ok: false, message: safe ? message : 'Test billing could not be verified. No access change was assumed. Refresh and try again.' };
  }
}
