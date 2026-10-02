import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { availableCampuses, coverageReport } from '@hiddengeniuslabs/genius-mining';
import AdminShell from '@/components/admin/AdminShell';
import { adminDashboardItems, adminRouteDecision } from '@/lib/account/admin-access';
import { clubIdentity } from '@/lib/clubs/identity';
import { listPendingClaims } from '@/lib/clubs/representation-store';
import { adminEmails } from '@/lib/env';
import { sessionPrivileges } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Admin Dashboard | CampusQuest',
  robots: { index: false, follow: false },
};

function blockedPathwayWords(): number | null {
  try {
    return availableCampuses().reduce((sum, campus) => sum + coverageReport(campus.id).blockedWords.length, 0);
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const session = await sessionPrivileges();
  const decision = adminRouteDecision({
    signedIn: session.state === 'signed-in',
    email: session.state === 'signed-in' ? session.email : null,
    allowlist: adminEmails(),
  });
  if (decision === 'sign-in') redirect('/login?next=/admin');
  if (decision === 'deny') notFound();

  const claims = await listPendingClaims();
  const blockedWords = blockedPathwayWords();
  let clubReview = false;
  if (process.env.CQ_CLUB_MODE === 'test') {
    try {
      await clubIdentity('review');
      clubReview = true;
    } catch {
      clubReview = false;
    }
  }
  const items = adminDashboardItems({
    pendingRepresentatives: claims.length,
    clubReview,
    geniusMiningBlocked: blockedWords,
  });
  const stats = [
    { label: 'Pending representative claims', value: claims.length },
    ...(blockedWords === null
      ? []
      : [{ label: 'Pathway words short of the coverage gate', value: blockedWords }]),
  ];

  return (
    <AdminShell current="dashboard">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">CampusQuest Admin</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Admin Dashboard</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
        Review requests, manage internal operations, and keep CampusQuest running smoothly.
      </p>

      <section aria-label="Summary" className="mt-8">
        <ul className="grid gap-4 md:grid-cols-2">
          {stats.map((stat) => (
            <li key={stat.label} className="min-w-0 rounded-2xl border border-white/10 bg-white p-5 text-ink shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{stat.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-3xl font-extrabold tabular-nums text-brand-950">{stat.value}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  stat.value > 0 ? 'bg-gold-400 text-brand-950' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {stat.value > 0 ? 'Needs review' : 'Clear'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="admin-tools">
        <h2 id="admin-tools" className="text-lg font-extrabold">Tools</h2>
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white p-6 text-ink shadow-soft transition-colors hover:border-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-extrabold">{item.title}</h3>
                  <span className="shrink-0 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-brand-950">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{item.detail}</p>
                <span className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-bold text-white sm:w-fit">
                  {item.cta}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
