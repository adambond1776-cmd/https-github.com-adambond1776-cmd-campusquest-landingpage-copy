'use server';

import { billingIdentity } from '@/lib/billing/identity';
import { createFoundingCheckout } from '@/lib/basic/founding-checkout';

export type FoundingCheckoutResult = { ok: true; url: string } | { ok: false; message: string };

/** Starts a one-time test Checkout. The return URL does not grant access. */
export async function startFoundingCheckout(): Promise<FoundingCheckoutResult> {
  try {
    const user = await billingIdentity();
    const url = await createFoundingCheckout(user.id, user.email);
    return { ok: true, url };
  } catch (error) {
    const message = error instanceof Error && !('type' in error) ? error.message : '';
    const safe = /^(Test billing|A Stripe test|Configure the CQ|Invalid test|Connect a test|Sign in|Verify your|Founding Basic|Founding checkout|The founding test|Checkout is unavailable|Unrecognized checkout|Tell us your age|A subscription has|Subscription testing|CampusQuest is for students)/.test(message);
    return {
      ok: false,
      message: safe ? message : 'Founding checkout could not be started. No access was granted.',
    };
  }
}
