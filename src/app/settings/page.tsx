import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CalendarCheck, Mail, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DeleteAccount from '@/components/settings/DeleteAccount';
import InterestPreferences from '@/components/settings/InterestPreferences';
import { saveMyInterests } from './preference-actions';
import LogoutButton from '@/components/LogoutButton';
import { ageStore } from '@/lib/age-store';
import { guardianConsentActive } from '@/lib/age';
import { redirectIfCampusEmailUnverified } from '@/lib/gate';
import { signedInUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PLANS } from '@/lib/pricing';
import { privacyEmail } from '@/lib/legal';
import { billingDemoEnabled, billingTestEnabled } from '@/lib/billing/config';

export const metadata: Metadata = {
  title: 'Account settings | CampusQuest',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await signedInUser();
  await redirectIfCampusEmailUnverified();

  // With no Supabase project the session lives in localStorage and cannot be
  // read here, so there is nothing this page can honestly show.
  if (isSupabaseConfigured && !user) redirect('/login');

  const age = user ? await ageStore().get(user.email) : null;
  const planName = user?.plan ? PLANS[user.plan]?.name : undefined;

  return (
    <>
      <Navbar appearance="dark" />
      <main className="min-h-screen bg-brand-950 px-5 py-14 text-white sm:py-20">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Your account</h1>
          <p className="mt-2 text-sm text-white/50">
            What we hold, and how to make us stop holding it.
          </p>
          {(billingTestEnabled() || billingDemoEnabled()) && (
            <Link href={user?.role === 'organization' ? '/clubs/manage' : '/billing'} className="mt-6 inline-block rounded-xl border border-gold-400/40 px-5 py-3 text-sm font-semibold text-gold-400">
              {user?.role === 'organization' ? 'Manage club page and test subscription' : 'Manage test subscription · no real charges'}
            </Link>
          )}

          {!user && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/60">
              Accounts are not connected in this environment, so there is nothing to show
              here yet.
            </div>
          )}

          {user && (
            <>
              <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <h2 className="text-lg font-extrabold">Details</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Row icon={<Mail className="h-4 w-4" />} label="Email">
                    {user.email}
                  </Row>
                  {planName && (
                    <Row icon={<CalendarCheck className="h-4 w-4" />} label="Signup selection">
                      {planName} (not payment verification)
                    </Row>
                  )}
                  {age && (
                    <Row icon={<ShieldCheck className="h-4 w-4" />} label="Age">
                      {age.bracket === 'adult'
                        ? '18 or over'
                        : guardianConsentActive(age.guardian)
                          ? 'Under 18, approved by a parent or guardian'
                          : 'Under 18, waiting on a parent or guardian'}
                    </Row>
                  )}
                </dl>
                <p className="mt-5 text-xs leading-relaxed text-white/40">
                  Need something here changed? Email{' '}
                  <a
                    className="text-gold-400 hover:text-gold-500"
                    href={`mailto:${privacyEmail()}`}
                  >
                    {privacyEmail()}
                  </a>{' '}
                  and a person will do it. Editing these in place is not built yet.
                </p>
              </section>

              <InterestPreferences initialInterests={user.interests ?? []} initialProfile={user.interestPreferences} saveAction={saveMyInterests} />

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LogoutButton className="btn-secondary w-full sm:w-auto" />
              </div>

              <div className="mt-6">
                <DeleteAccount />
              </div>

              <p className="mt-6 text-center text-sm text-white/40">
                <Link href="/privacy" className="text-gold-400 hover:text-gold-500">
                  What we collect and why
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <dt className="flex min-w-32 items-center gap-2 text-white/50">
        {icon}
        {label}
      </dt>
      <dd className="font-medium text-white">{children}</dd>
    </div>
  );
}
