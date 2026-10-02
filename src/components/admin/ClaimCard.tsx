import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import ClaimDecisionForm from '@/components/admin/ClaimDecisionForm';
import type { RepresentativeClaim } from '@/lib/clubs/representation-store';

function safeHttps(value: string | null): string | null {
  if (!value || !value.startsWith('https://')) return null;
  return value;
}

function OrgMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const src = safeHttps(logoUrl);
  if (src) {
    return (
      // Organization logos are remote URIs already stored for the public directory.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-12 w-12 rounded-xl object-cover" />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || 'O';
  return (
    <span
      aria-hidden
      className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-lg font-extrabold text-brand-800"
    >
      {initial}
    </span>
  );
}

function ProofRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

export default function ClaimCard({
  claim,
  action,
}: {
  claim: RepresentativeClaim;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const submitted = new Date(claim.submittedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const verificationUrl = safeHttps(claim.verificationUrl);
  const proof = [
    claim.officialEmail ? 'official email' : null,
    verificationUrl ? 'verification link' : null,
    claim.hasProofFile ? 'attachment' : null,
    claim.note ? 'note' : null,
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-white/10 bg-white text-ink shadow-soft">
      <div className="flex flex-col gap-4 border-b border-cream-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 w-full gap-3 sm:flex-1">
          <OrgMark name={claim.organizationName} logoUrl={claim.logoUrl} />
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-extrabold leading-tight">{claim.organizationName}</h2>
            <p className="mt-1 break-words text-sm text-ink/70">
              {claim.name}
              {claim.email ? <span className="text-ink/50"> · {claim.email}</span> : null}
            </p>
            <p className="mt-1 break-words text-sm text-ink/70">
              {claim.roleTitle ? claim.roleTitle : <span className="text-ink/40">Role not listed</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge status={claim.status} />
          <time className="text-xs font-semibold text-ink/50" dateTime={claim.submittedAt}>
            {submitted}
          </time>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Proof</p>
          <p className="mt-2 text-sm text-ink/60">
            {proof.length > 0 ? proof.join(' · ') : 'No proof details on this request.'}
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {claim.officialEmail ? <ProofRow label="Official email">{claim.officialEmail}</ProofRow> : null}
            {verificationUrl ? (
              <ProofRow label="Verification URL">
                <a className="break-all text-brand-700 underline" href={verificationUrl} rel="noreferrer">
                  {verificationUrl}
                </a>
              </ProofRow>
            ) : null}
            {claim.hasProofFile ? (
              <ProofRow label="Attachment">
                <a className="font-semibold text-brand-700 underline" href={`/admin/club-representatives/proof?claim=${claim.id}`}>
                  View proof
                </a>
              </ProofRow>
            ) : null}
            {claim.note ? (
              <ProofRow label="Submitted note">
                <span className="whitespace-pre-wrap">{claim.note}</span>
              </ProofRow>
            ) : null}
          </dl>
        </div>
        {claim.status === 'pending' ? <ClaimDecisionForm claimId={claim.id} action={action} /> : null}
      </div>
    </article>
  );
}
