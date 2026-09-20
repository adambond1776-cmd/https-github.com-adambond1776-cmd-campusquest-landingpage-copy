import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ClubDemo from '@/components/clubs/ClubDemo';
import { billingDemoEnabled } from '@/lib/billing/config';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Local club simulator | CampusQuest', robots: { index: false, follow: false } };
export default function ClubDemoPage() {
  if (!billingDemoEnabled()) notFound();
  return <><Navbar appearance="dark" /><main className="min-h-screen bg-brand-950 px-5 py-12 text-white"><div className="mx-auto max-w-4xl">
    <Link href="/clubs/manage" className="text-sm text-gold-400">Back to club account</Link>
    <h1 className="mb-7 mt-5 text-3xl font-extrabold">Try the club workflow</h1><ClubDemo />
  </div></main><Footer /></>;
}
