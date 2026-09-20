import { billingTestEnabled } from './config';
import { billingIdentity } from './identity';
import { readTestSubscription } from './service';
import { subscriptionAccess } from './catalog';

/** Paid gating is opt-in in a TEST environment only. Existing public browsing
 * and the non-billing preview remain unchanged while checkout is disabled. */
export async function recommendationBillingAccess(): Promise<{ allowed: boolean; message?: string }> {
  if (!billingTestEnabled()) return { allowed: true };
  try {
    const user = await billingIdentity();
    const access = subscriptionAccess(await readTestSubscription(user.id));
    return access.recommendations ? { allowed: true }
      : { allowed: false, message: 'Test mode: personal recommendations require an active Basic or Plus test subscription. Public browsing stays free.' };
  } catch {
    return { allowed: false, message: 'Test subscription access could not be verified. Public browsing remains available; refresh your billing status to retry.' };
  }
}
