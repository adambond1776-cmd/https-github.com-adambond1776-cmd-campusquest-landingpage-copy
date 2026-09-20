import { notFound } from 'next/navigation';
import Link from 'next/link';
import BillingSimulator from '@/components/billing/BillingSimulator';
import { billingDemoEnabled } from '@/lib/billing/config';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Local billing simulator | CampusQuest', robots: { index: false, follow: false } };
export default function BillingDemoPage() {
  if (!billingDemoEnabled()) notFound();
  return <main className="min-h-screen bg-brand-950 px-5 py-10 text-white"><div className="mx-auto max-w-3xl">
    <Link href="/billing" className="text-sm font-semibold text-gold-400">Back to connected test billing</Link>
    <h1 className="mt-6 text-3xl font-extrabold">Subscription test lab</h1>
    <p className="mb-7 mt-3 text-sm leading-relaxed text-white/75">Local development only. No accounts, real cards, messages or external payments. Reset or reload to discard the simulated state.</p>
    <BillingSimulator />
  </div></main>;
}
