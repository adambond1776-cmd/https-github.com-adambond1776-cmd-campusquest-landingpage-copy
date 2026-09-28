import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { adminDashboardItems, adminRouteDecision } from '@/lib/account/admin-access';
import { clubIdentity } from '@/lib/clubs/identity';
import { listPendingClaims } from '@/lib/clubs/representation-store';
import { adminEmails } from '@/lib/env';
import { sessionPrivileges } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Admin | CampusQuest',
  robots: { index: false, follow: false },
};

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
  });

  return (
    <>
      <Navbar appearance="dark" />
      <main className="min-h-screen bg-brand-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">CampusQuest admin</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Admin dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          Review organization representative requests and the other operator tools already in this build.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white p-6 text-ink shadow-soft transition-colors hover:border-gold-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-extrabold">{item.title}</h2>
                  <span className="shrink-0 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-brand-950">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{item.detail}</p>
                <span className="mt-5 text-sm font-semibold text-brand-600">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      </main>
    </>
  );
}
