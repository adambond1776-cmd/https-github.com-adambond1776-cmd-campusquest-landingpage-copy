import { notFound } from 'next/navigation';
import ClubReview from '@/components/clubs/ClubReview';
import { clubIdentity } from '@/lib/clubs/identity';
import { clubRepository } from '@/lib/clubs/store';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Club review | CampusQuest', robots: { index: false, follow: false } };
export default async function ClubReviewPage() {
  try { await clubIdentity('review'); } catch { notFound(); }
  const repo = clubRepository();
  const rows = [];
  for (const club of await repo.clubs()) rows.push({ club, events: await repo.events(club.id) });
  return <main className="min-h-screen bg-brand-950 px-5 py-12 text-white"><div className="mx-auto max-w-4xl"><h1 className="mb-4 text-3xl font-extrabold">Club review · test only</h1><p className="mb-6 text-sm text-white/75">Newest 200 clubs. Review authority comes from server-configured account IDs, never a signup role. Membership requests are not included in this review screen.</p><ClubReview rows={rows} /></div></main>;
}
