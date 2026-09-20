import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ClubWorkspace from '@/components/clubs/ClubWorkspace';
import { clubIdentity } from '@/lib/clubs/identity';
import { clubRepository } from '@/lib/clubs/store';
import { clubService } from '@/lib/clubs/service';
import { stripeClubBilling } from '@/lib/clubs/billing';
import { billingDemoEnabled } from '@/lib/billing/config';
import { ClubError, type ClubView } from '@/lib/clubs/model';
import { manageClub } from './actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Club workspace | CampusQuest', robots: { index: false, follow: false } };
export default async function ClubManagePage() {
  let view: ClubView | null = null, message = '';
  try { view = await clubService(clubRepository(), stripeClubBilling).view(await clubIdentity()); }
  catch (error) { message = error instanceof ClubError ? error.message : 'Club tools are unavailable. No account or paid access was assumed.'; }
  return <><Navbar appearance="dark" /><main className="min-h-screen bg-brand-950 px-5 py-12 text-white"><div className="mx-auto max-w-4xl">
    <Link href="/settings" className="text-sm font-semibold text-gold-400">Back to account</Link>
    <h1 className="mb-3 mt-5 text-3xl font-extrabold">Your club workspace</h1>
    <p className="mb-7 text-sm leading-relaxed text-white/75">Built into CampusQuest, using the same accounts, campus directory and interest categories.</p>
    {view ? <ClubWorkspace initialView={view} run={manageClub} /> : <div className="rounded-2xl border border-white/20 p-6"><p className="text-sm">{message}</p><div className="mt-4 flex gap-5"><Link href="/signup" className="text-sm text-gold-400">Create an organization account</Link><Link href="/login" className="text-sm text-gold-400">Sign in</Link></div></div>}
    {billingDemoEnabled() && <Link className="mt-7 inline-block text-sm font-semibold text-gold-400" href="/clubs/demo">Open local club simulator</Link>}
  </div></main><Footer /></>;
}
