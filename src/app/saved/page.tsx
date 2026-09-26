import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ActivityCard from '@/components/activities/ActivityCard';
import { BasicSaveProvider } from '@/components/basic/BasicSaveProvider';
import MissingUnsave from '@/components/basic/MissingUnsave';
import ReminderControl from '@/components/basic/ReminderControl';
import { redirectIfCampusEmailUnverified } from '@/lib/gate';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { sessionPrivileges } from '@/lib/session';
import { loadOwnBasicEntitlement, loadOwnSavedItems, resolveSavedItems } from '@/lib/basic/store';
import { EMAIL_REMINDER_NOTE, savedItemKey, type SavedKind } from '@/lib/basic/saved';
import { FOUNDING_OFFERS, FOUNDING_TERMS } from '@/lib/launch-offers';

export const metadata: Metadata = {
  title: 'Saved | CampusQuest',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const GROUPS: { kind: SavedKind; title: string; empty: string }[] = [
  { kind: 'event', title: 'Saved Events', empty: 'No saved events yet.' },
  { kind: 'club', title: 'Saved Clubs', empty: 'No saved clubs yet.' },
  { kind: 'organization', title: 'Saved Organizations', empty: 'No saved organizations yet.' },
];

export default async function SavedPage() {
  await redirectIfCampusEmailUnverified('/saved');
  const session = await sessionPrivileges();
  if (isSupabaseConfigured && session.state !== 'signed-in') redirect('/login?next=/saved');

  const entitlement = session.state === 'signed-in' ? await loadOwnBasicEntitlement() : null;
  const items = entitlement?.known ? await loadOwnSavedItems() : [];
  const resolved = items ? await resolveSavedItems(items) : [];
  const saveState = {
    signedIn: session.state === 'signed-in',
    active: entitlement?.active === true,
    savedKeys: resolved.map((item) => savedItemKey(item.kind, item.target_id)),
  };

  return (
    <>
      <Navbar appearance="light" />
      <BasicSaveProvider state={saveState}>
        <main className="min-h-screen bg-cream-50 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto w-full max-w-content">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Saved</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Events, clubs, and organizations you saved inside CampusQuest.
            </p>

            {session.state !== 'signed-in' ? (
              <p className="mt-8 text-sm text-slate-600">Accounts are not connected in this environment.</p>
            ) : !entitlement?.known ? (
              <p className="mt-8 rounded-2xl border border-cream-300 bg-white p-6 text-sm text-slate-700">
                Saved listings are not available until the Basic tables are installed.
              </p>
            ) : items === null ? (
              <p className="mt-8 text-sm text-slate-700">Saved listings could not be loaded. Please try again.</p>
            ) : !entitlement.active && items.length === 0 ? (
              <section className="mt-8 max-w-xl rounded-2xl border border-brand-200 bg-white p-6">
                <h2 className="text-lg font-extrabold text-ink">Founding Basic</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Saving events, clubs, and organizations inside CampusQuest is part of Founding Basic
                  at ${FOUNDING_OFFERS.student.amount} for {FOUNDING_OFFERS.student.days} days. Browsing,
                  search, and the public event directory stay free.
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-800">{FOUNDING_TERMS}</p>
                <Link href="/#pricing" className="mt-4 inline-block text-sm font-bold text-brand-700 underline underline-offset-2">
                  Preview the founding offer
                </Link>
              </section>
            ) : (
              <div className="mt-8 space-y-10">
                {!entitlement.active ? (
                  <section className="max-w-xl rounded-2xl border border-brand-200 bg-white p-6">
                    <h2 className="text-lg font-extrabold text-ink">Founding Basic is not active</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      You can remove listings you already saved. New saves and reminder changes need an
                      active Founding Basic window. Browsing stays free.
                    </p>
                    <Link href="/#pricing" className="mt-4 inline-block text-sm font-bold text-brand-700 underline underline-offset-2">
                      Preview the founding offer
                    </Link>
                  </section>
                ) : null}
                {GROUPS.map((group) => {
                  const rows = resolved.filter((item) => item.kind === group.kind);
                  return (
                    <section key={group.kind} aria-labelledby={`saved-${group.kind}`}>
                      <h2 id={`saved-${group.kind}`} className="text-xl font-extrabold text-ink">
                        {group.title}
                      </h2>
                      {entitlement.active && group.kind === 'event' ? (
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">{EMAIL_REMINDER_NOTE}</p>
                      ) : null}
                      {rows.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-600">{group.empty}</p>
                      ) : (
                        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {rows.map((item) => (
                            <li key={savedItemKey(item.kind, item.target_id)} className="flex h-full flex-col gap-3">
                              {item.activity ? (
                                <ActivityCard activity={item.activity} />
                              ) : (
                                <article className="rounded-2xl border border-cream-300 bg-white p-5">
                                  <h3 className="font-bold text-ink">This listing is no longer available</h3>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    It is no longer in the public directory. You can remove it from Saved.
                                  </p>
                                  <MissingUnsave kind={item.kind} targetId={item.target_id} />
                                </article>
                              )}
                              {entitlement.active && item.kind === 'event' && item.activity ? (
                                <ReminderControl
                                  targetId={item.target_id}
                                  reminder={item.reminder}
                                  name={item.activity.name}
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </BasicSaveProvider>
      <Footer />
    </>
  );
}
