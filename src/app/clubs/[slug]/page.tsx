import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ClubPublicPage from '@/components/clubs/ClubPublicPage';
import { assertClubTestMode } from '@/lib/clubs/identity';
import { clubRepository } from '@/lib/clubs/store';
import { stripeClubBilling } from '@/lib/clubs/billing';
import { clubPaid, validateSlug } from '@/lib/clubs/model';
import { campusDirectoryLive } from '@/lib/campuses';
import { requestClubJoin } from '../manage/actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Club page | CampusQuest', robots: { index: false, follow: false } };
export default async function PublicClubPage({ params }: { params: Promise<{ slug: string }> }) {
  try { assertClubTestMode(); } catch { notFound(); }
  const { slug } = await params;
  try { validateSlug(slug); } catch { notFound(); }
  const repo = clubRepository();
  const club = await repo.bySlug(slug);
  if (!club || !club.owner_approved || club.status !== 'approved' || !campusDirectoryLive(club.campus_id)) notFound();
  const now = new Date().getTime();
  const events = (await repo.events(club.id)).filter(e => e.status === 'approved' && Date.parse(e.content.ends_at) > now);
  let accepting = false;
  try { accepting = clubPaid(await stripeClubBilling.read(club.owner_id)); } catch {}
  return <><Navbar appearance="dark" /><main className="min-h-screen bg-brand-950 px-5 py-12 text-white"><div className="mx-auto max-w-3xl">
    <Link href={`/activities?campus=${club.campus_id}`} className="mb-6 inline-block text-sm text-gold-400">Back to campus discovery</Link>
    <ClubPublicPage club={{ slug: club.slug, campus_id: club.campus_id, content: club.content }} events={events} accepting={accepting} join={requestClubJoin.bind(null, slug)} />
  </div></main><Footer /></>;
}
