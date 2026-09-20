import Link from 'next/link';
import type { Metadata } from 'next';
import SubscriptionPanel from '@/components/billing/SubscriptionPanel';
import { EMPTY_SUBSCRIPTION, type BillingView } from '@/lib/billing/catalog';
import { billingDemoEnabled, testBillingConfig } from '@/lib/billing/config';
import { billingIdentity } from '@/lib/billing/identity';
import { readTestSubscription } from '@/lib/billing/service';
import { manageTestBilling } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Test subscriptions | CampusQuest', robots: { index: false, follow: false } };
export default async function BillingPage() {
  let view: BillingView = { available: false, subscription: { ...EMPTY_SUBSCRIPTION } };
  try {
    testBillingConfig();
    const user = await billingIdentity();
    view = { available: true, subscription: await readTestSubscription(user.id) };
  } catch {
    view.message = 'Connected checkout is unavailable. Test billing needs test Stripe configuration, a test database and a verified adult account. No paid access has been assumed.';
  }
  return <main className="min-h-screen bg-brand-950 px-5 py-10 text-white">
    <div className="mx-auto max-w-3xl">
      <Link href="/settings" className="text-sm font-semibold text-gold-400">Back to account</Link>
      <h1 className="mt-6 text-3xl font-extrabold">Your CampusQuest plan</h1>
      <p className="mb-7 mt-3 text-sm leading-relaxed text-white/75">Test the $3 Basic and $5 Plus subscription flow. A checkout return URL does not prove payment; access is read from Stripe on the server.</p>
      <SubscriptionPanel initialView={view} run={manageTestBilling} />
      {billingDemoEnabled() && <Link href="/billing/demo" className="mt-7 inline-block text-sm font-semibold text-gold-400">Open local subscription simulator</Link>}
    </div>
  </main>;
}
