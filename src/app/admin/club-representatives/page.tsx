import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminEmails } from '@/lib/env';
import { reviewerMayDecide } from '@/lib/clubs/representation';
import { listPendingClaims } from '@/lib/clubs/representation-store';
import { sessionPrivileges } from '@/lib/session';
import { decideRepresentativeClaim } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Representative review | CampusQuest',
  robots: { index: false, follow: false },
};

export default async function ClubRepresentativeAdminPage() {
  const allowed = adminEmails();
  const session = await sessionPrivileges();
  const permitted = session.state === 'signed-in' && reviewerMayDecide({
    reviewerId: session.userId,
    claimantId: '',
    reviewerEmail: session.email,
    allowlist: allowed,
  });
  if (!permitted) notFound();
  const claims = await listPendingClaims();

  return (
    <main className="min-h-screen bg-cream-50 px-5 py-12 text-ink">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Admin</p>
        <Link href="/admin" className="mt-3 inline-block text-sm font-semibold text-brand-600">
          Admin dashboard
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold">Representative claims</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">
          Approve only when the person is an authorized representative. A payment does not grant this status.
          Useful evidence includes the official URI listing, a public officer listing, an organization email, or confirmation from a verified representative.
        </p>
        {claims.length === 0 ? <p className="mt-8 text-sm text-ink/60">No claims are waiting.</p> : null}
        <ul className="mt-8 space-y-4">
          {claims.map((claim) => (
            <li key={claim.id} className="rounded-2xl border border-cream-300 bg-white p-5">
              <p className="font-extrabold">{claim.organizationName}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="font-semibold">Claimant</dt><dd>{claim.name} · {claim.email}</dd></div>
                <div><dt className="font-semibold">Organization</dt><dd>{claim.organizationName}</dd></div>
                <div><dt className="font-semibold">Requested role</dt><dd>{claim.roleTitle || 'Not provided'}</dd></div>
                <div><dt className="font-semibold">Official email</dt><dd>{claim.officialEmail || 'Not provided'}</dd></div>
                <div>
                  <dt className="font-semibold">Verification URL</dt>
                  <dd>{claim.verificationUrl?.startsWith('https://') ? <a className="break-all text-brand-700 underline" href={claim.verificationUrl} rel="noreferrer">{claim.verificationUrl}</a> : 'Not provided'}</dd>
                </div>
                <div><dt className="font-semibold">Submitted note</dt><dd className="whitespace-pre-wrap">{claim.note || 'Not provided'}</dd></div>
                <div>
                  <dt className="font-semibold">Proof attachment</dt>
                  <dd>{claim.hasProofFile ? <a className="text-brand-700 underline" href={`/admin/club-representatives/proof?claim=${claim.id}`}>View proof</a> : 'Not provided'}</dd>
                </div>
                <div><dt className="font-semibold">Submitted</dt><dd>{new Date(claim.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
              </dl>
              <form action={decideRepresentativeClaim} className="mt-4 space-y-3">
                <input type="hidden" name="claim" value={claim.id} />
                <label className="block text-sm font-semibold" htmlFor={`note-${claim.id}`}>Reason</label>
                <textarea id={`note-${claim.id}`} name="note" maxLength={1000} className="min-h-20 w-full rounded-xl border border-cream-300 px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <button name="decision" value="approved" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white">Approve</button>
                  <button name="decision" value="rejected" className="rounded-xl border border-cream-300 px-4 py-2 text-sm font-bold">Reject</button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
