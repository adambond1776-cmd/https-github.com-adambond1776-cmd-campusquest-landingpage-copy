import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FOUNDING_OFFERS } from '@/lib/launch-offers';
import { activityImageUrl } from '@/lib/activities/image';
import { foundingClubCheckoutConfigured } from '@/lib/clubs/founding-club';
import { loadClubCheckoutFacts } from '@/lib/clubs/representation-store';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { isDemoAccountEmail } from '@/lib/account/demo-account';
import { createAdminClient } from '@/lib/supabase/admin';
import { sessionPrivileges } from '@/lib/session';
import { searchOrganizations, type DirectoryOrganization } from './actions';
import { FoundingClubPurchaseButton, OrganizationSearch, OrgMark, RepresentativeRequestForm } from './represent-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Represent your organization | CampusQuest',
  robots: { index: false, follow: false },
};

const STEPS = ['Choose your organization', 'Tell us your role', 'Provide proof', 'Submit for review'] as const;

export default async function RepresentPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string; q?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const session = await sessionPrivileges();
  if (session.state !== 'signed-in') redirect('/login?next=/clubs/represent');
  const organizationId = params.organization && isCanonicalRecordId(params.organization) ? params.organization : null;
  const query = params.q?.trim().slice(0, 80) ?? '';
  const admin = createAdminClient();
  const selectedRow = organizationId && admin
    ? await admin.from('external_organizations').select('id, name, description, category, logo_url').eq('id', organizationId).eq('is_active', true).maybeSingle()
    : { data: null };
  const selected = selectedRow.data?.id && selectedRow.data.name
    ? {
        id: selectedRow.data.id as string,
        name: String(selectedRow.data.name),
        description: typeof selectedRow.data.description === 'string' ? selectedRow.data.description.trim() : '',
        category: typeof selectedRow.data.category === 'string' ? selectedRow.data.category.trim() : '',
        logoUrl: activityImageUrl(typeof selectedRow.data.logo_url === 'string' ? selectedRow.data.logo_url : null),
      }
    : null;
  const initialResults: DirectoryOrganization[] = query ? await searchOrganizations(query) : [];
  const facts = organizationId ? await loadClubCheckoutFacts(session.userId, organizationId) : null;
  const demo = isDemoAccountEmail(session.email);
  const checkoutReady = foundingClubCheckoutConfigured();
  const pending = !demo && facts?.claimStatus === 'pending' && !facts.approvedRepresentative;
  const rejected = !demo && facts?.claimStatus === 'rejected' && !facts.approvedRepresentative;
  const approved = !demo && facts?.approvedRepresentative === true;
  const step = !selected || demo ? 1 : pending || approved ? 4 : 2;
  const notice = params.checkout === 'canceled'
    ? 'Checkout was canceled. No access was granted.'
    : params.checkout === 'returned'
      ? 'Payment is confirmed only after Stripe notifies CampusQuest. Returning here does not grant access.'
      : null;
  const offer = FOUNDING_OFFERS.club;

  return (
    <main className="min-h-screen bg-brand-950 px-5 py-8 text-white sm:py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <Link href="/activities" className="flex w-fit items-center gap-2 text-sm font-semibold text-gold-400">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to activities
        </Link>
        <p className="mt-6 flex w-fit rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-gold-300">
          Founding Club
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Represent your organization</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
          Verify your role to manage your club on CampusQuest and unlock Founding Club tools.
        </p>

        {notice ? (
          <p className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">{notice}</p>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="order-2 min-w-0 rounded-3xl bg-white p-5 text-ink shadow-soft sm:p-8 lg:order-1">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((label, index) => {
                const number = index + 1;
                const current = number === step;
                return (
                  <li
                    key={label}
                    className={`rounded-2xl border px-3 py-3 ${current ? 'border-brand-600 bg-brand-50' : 'border-cream-200 bg-cream-50'}`}
                    aria-current={current ? 'step' : undefined}
                  >
                    <span className={`text-xs font-bold ${current ? 'text-brand-700' : 'text-ink/45'}`}>Step {number}</span>
                    <span className="mt-1 block text-sm font-bold leading-snug">{label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-2xl border border-cream-200 p-4 sm:p-5">
              {selected ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <OrgMark name={selected.name} logoUrl={selected.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Selected organization</p>
                    <h2 className="mt-1 text-lg font-extrabold break-words">{selected.name}</h2>
                    {selected.category ? <p className="mt-1 text-sm font-semibold text-brand-700">{selected.category}</p> : null}
                  </div>
                  <Link href="/clubs/represent" className="text-sm font-bold text-brand-700 underline underline-offset-2">
                    Change organization
                  </Link>
                </div>
              ) : (
                <OrganizationSearch initialQuery={query} initialResults={initialResults} />
              )}
            </div>

            {selected && demo ? (
              <p className="mt-6 rounded-2xl border border-cream-200 bg-cream-50 p-4 text-sm text-ink/75">
                Purchases are not available for this account.
              </p>
            ) : null}

            {selected && pending ? (
              <div className="mt-6 rounded-2xl border border-gold-500/40 bg-gold-400/15 p-5">
                <h2 className="text-lg font-extrabold">Verification under review</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">
                  We’ll update your account once your request is reviewed.
                </p>
              </div>
            ) : null}

            {selected && approved ? (
              <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
                <h2 className="text-lg font-extrabold">You’re verified</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">
                  You can represent {selected.name}. Founding Club checkout stays tied to this organization.
                </p>
                {facts?.accessActive ? (
                  <p className="mt-4 text-sm font-bold text-brand-800">Founding Club active</p>
                ) : checkoutReady ? (
                  <FoundingClubPurchaseButton organizationId={selected.id} />
                ) : (
                  <p className="mt-4 text-sm font-semibold text-ink/70">Purchase opening soon</p>
                )}
              </div>
            ) : null}

            {selected && rejected ? (
              <div className="mt-6 rounded-2xl border border-cream-300 bg-cream-50 p-5">
                <h2 className="text-lg font-extrabold">This request was not approved</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">
                  You can send another request if you can confirm your role with the organization.
                </p>
              </div>
            ) : null}

            {selected && !demo && !pending && !approved ? (
              <div className="mt-6">
                <RepresentativeRequestForm organizationId={selected.id} rejected={rejected} />
              </div>
            ) : null}
          </section>

          <aside className="order-1 min-w-0 space-y-4 lg:order-2">
            <section className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-gold-300">Founding Club</h2>
              <p className="mt-3 text-3xl font-extrabold">${offer.amount} <span className="text-base font-semibold text-white/70">one-time</span></p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>{offer.days} days</li>
                <li>No automatic renewal</li>
                <li>Payment only becomes available after representative approval</li>
              </ul>
            </section>
            <section className="rounded-3xl border border-white/15 bg-white/5 p-5">
              <h2 className="text-sm font-extrabold">How verification works</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                We review representative requests using official organization information, public officer listings, or direct confirmation when needed. Payment does not grant ownership or management access.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
