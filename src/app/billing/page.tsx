import Link from 'next/link';
import type { Metadata } from 'next';
import FoundingPassPanel from '@/components/billing/FoundingPassPanel';
import { formatBasicExpiry } from '@/lib/basic/entitlement';
import { foundingCheckoutNotice, foundingLocalCheckoutConfigured } from '@/lib/basic/founding';
import { isDemoAccountEmail } from '@/lib/account/demo-account';
import { loadOwnBasicEntitlement } from '@/lib/basic/store';
import { redirectIfCampusEmailUnverified } from '@/lib/gate';
import { isProductionRuntime } from '@/lib/runtime';
import { sessionPrivileges } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'CQ Basic | CampusQuest', robots: { index: false, follow: false } };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await redirectIfCampusEmailUnverified('/billing');
  const params = await searchParams;
  const session = await sessionPrivileges();
  const signedIn = session.state === 'signed-in';
  const purchasesBlocked = session.state === 'signed-in' && isDemoAccountEmail(session.email);
  const entitlement = signedIn ? await loadOwnBasicEntitlement() : null;
  const active = entitlement?.active === true;
  const checkout = params.checkout === 'returned' || params.checkout === 'canceled' ? params.checkout : undefined;

  return (
    <main className="min-h-screen bg-brand-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/settings" className="text-sm font-semibold text-gold-400">Back to account</Link>
        <h1 className="mt-6 text-3xl font-extrabold">Your CampusQuest plan</h1>
        <p className="mb-7 mt-3 text-sm leading-relaxed text-white/75">
          {purchasesBlocked || isProductionRuntime()
            ? 'CQ Basic founding access is one payment for the founding period. Coming back to this page does not activate it.'
            : 'CQ Basic founding access is a one-time test payment. Coming back to this page does not activate it.'}
        </p>
        <FoundingPassPanel
          signedIn={signedIn}
          active={active}
          expiry={active ? formatBasicExpiry(entitlement?.endsAt ?? null) : null}
          earlyAccess={entitlement?.earlyAccess === true}
          notice={foundingCheckoutNotice(checkout, active)}
          checkoutReady={foundingLocalCheckoutConfigured() && !purchasesBlocked}
          purchasesBlocked={purchasesBlocked}
        />
      </div>
    </main>
  );
}
