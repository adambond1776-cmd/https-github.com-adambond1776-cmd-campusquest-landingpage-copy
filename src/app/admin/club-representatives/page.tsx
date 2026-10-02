import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import ClaimCard from '@/components/admin/ClaimCard';
import { claimQueueFilter, claimQueueHref, type ClaimQueueFilter } from '@/components/admin/claim-queue';
import { adminEmails } from '@/lib/env';
import { reviewerMayDecide } from '@/lib/clubs/representation';
import { listPendingClaims, listRepresentativeClaims } from '@/lib/clubs/representation-store';
import { sessionPrivileges } from '@/lib/session';
import { decideRepresentativeClaim } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Representative Claims | CampusQuest',
  robots: { index: false, follow: false },
};

const FILTERS: { id: ClaimQueueFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export default async function ClubRepresentativeAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const allowed = adminEmails();
  const session = await sessionPrivileges();
  const permitted = session.state === 'signed-in' && reviewerMayDecide({
    reviewerId: session.userId,
    claimantId: '',
    reviewerEmail: session.email,
    allowlist: allowed,
  });
  if (!permitted) notFound();

  const params = await searchParams;
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const filter = claimQueueFilter(rawStatus);
  const claims = await listRepresentativeClaims(filter);
  const pendingCount = filter === 'pending' ? claims.length : (await listPendingClaims()).length;

  return (
    <AdminShell current="claims">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">Admin</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Representative Claims</h1>
        <AdminStatusBadge status="pending" />
        <span className="text-sm font-semibold text-white/70">{pendingCount} pending</span>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
        Approve only when the person is an authorized representative. A payment does not grant this status.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="navigation" aria-label="Claim status">
        {FILTERS.map((item) => {
          const active = item.id === filter;
          return (
            <Link
              key={item.id}
              href={claimQueueHref(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                active ? 'bg-white text-brand-950' : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {claims.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-sm text-white/70">
          {filter === 'pending' ? 'No claims are waiting.' : 'No claims in this view.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {claims.map((claim) => (
            <li key={claim.id}>
              <ClaimCard claim={claim} action={decideRepresentativeClaim} />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
