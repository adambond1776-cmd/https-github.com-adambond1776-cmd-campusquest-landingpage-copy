import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, CalendarX, Compass, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ActivityCard from '@/components/activities/ActivityCard';
import InterestRecommendations from '@/components/activities/InterestRecommendations';
import { recommendByInterests } from '@/lib/activities/interest-recommendations';
import { signedInUser } from '@/lib/session';
import { recommendationBillingAccess } from '@/lib/billing/access';
import ActivityFilters from '@/components/activities/ActivityFilters';
import ReportPanel from '@/components/activities/ReportPanel';
import FoundingOfferPrompt from '@/components/activities/FoundingOfferPrompt';
import { CLUB_DISCOVERY_POLICY } from '@/lib/launch-offers';
import { getActivityStore } from '@/lib/activities/store';
import { upcomingHomeGames } from '@/lib/activities/sources/athletics';
import { PUBLIC_STATUSES, type Activity } from '@/lib/activities/types';
import { formatWhen } from '@/lib/activities/format';
import { campusDirectoryLive, campusName } from '@/lib/campuses';
import { defaultCampusId } from '@/lib/env';
import { gate } from '@/lib/gate';
import { privacyEmail } from '@/lib/legal';
import { siteUrl } from '@/lib/site';
import { publicActivitiesError } from '@/lib/supabase/credentials';

export const metadata: Metadata = {
  title: 'What is happening on campus | CampusQuest',
  description:
    'Every club, home game, and event on campus in one place, pulled from the university calendar, the student organization directory, and the athletics department.',
  alternates: siteUrl ? { canonical: `${siteUrl}/activities` } : undefined,
};

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Cards render 60 at a time; the directory is 650 rows and growing. */
const PAGE_SIZE = 60;

export default async function ActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await gate('directory');
  if (!access.allowed) return <DirectoryLocked reason={access.reason} />;

  const params = await searchParams;
  const campusId = first(params.campus) ?? defaultCampusId();
  const kind = first(params.kind);
  const search = first(params.q);
  const category = first(params.category);
  const homeOnly = first(params.home) === '1';

  let all: Activity[] = [];
  let loadError: string | null = null;

  try {
    all = (await getActivityStore().all(campusId)).filter((row) =>
      PUBLIC_STATUSES.includes(row.status)
    );
  } catch (error) {
    loadError = publicActivitiesError(error);
  }

  const now = new Date();
  const user = await signedInUser();
  const interests = user?.interests ?? [];
  const billingAccess = user ? await recommendationBillingAccess() : { allowed: true };
  const recommendations = billingAccess.allowed
    ? recommendByInterests(all, user?.interestPreferences ?? interests, campusId, now) : [];

  // Dated rows drop off the directory once they have finished. Undated rows
  // (clubs, facilities) always stay.
  const current = all.filter((row) => {
    if (!row.starts_at) return true;
    const ends = new Date(row.ends_at ?? row.starts_at);
    return Number.isNaN(ends.getTime()) || ends >= now;
  });

  const counts = {
    all: current.length,
    game: current.filter((row) => row.kind === 'game').length,
    event: current.filter((row) => row.kind === 'event').length,
    organization: current.filter((row) => row.kind === 'organization').length,
  };

  const categories = [...new Set(current.flatMap((row) => row.categories))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 60);

  const needle = search?.trim().toLowerCase();

  const matches = current
    .filter((row) => {
      if (kind && kind !== 'all' && row.kind !== kind) return false;
      if (homeOnly && !row.athletics?.home) return false;
      if (category && !row.categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
        return false;
      }
      if (needle) {
        const haystack = [row.name, row.summary ?? '', row.categories.join(' '), row.location ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.starts_at && b.starts_at) return a.starts_at.localeCompare(b.starts_at);
      if (a.starts_at) return -1;
      if (b.starts_at) return 1;
      return a.name.localeCompare(b.name);
    });

  const shown = matches.slice(0, PAGE_SIZE);

  // Clubs and facilities only. Reporting a single dated event as defunct is
  // noise, and a select holding all 629 rows is unusable on a phone.
  const reportOptions = current
    .filter((row) => row.kind === 'organization' || row.kind === 'facility')
    .map((row) => ({ id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const homeGames = upcomingHomeGames(current, now).slice(0, 4);
  const filtering = Boolean(needle || category || homeOnly || (kind && kind !== 'all'));
  const empty = current.length === 0;

  return (
    <>
      <Navbar appearance="light" />
      <main className="bg-cream-50 min-h-screen">
        {/* Top padding clears the fixed navbar, which overlays the page. */}
        <header className="bg-white border-b border-cream-300">
          <div className="max-w-content mx-auto px-5 sm:px-8 py-10 sm:py-14">
            <span className="eyebrow">
              <Compass className="w-4 h-4" />
              {campusName(campusId)}
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink text-balance">
              Find your next campus activity
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Clubs, home games, and events in one list, pulled straight from the university
              calendar, the student organization directory, and the athletics department. Every
              listing says where it came from and links back to the source.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
              CampusQuest is an independent early-release service, not an official university
              directory. Public information can be incomplete or out of date. Confirm times,
              locations and availability with the organizer before attending.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{CLUB_DISCOVERY_POLICY}</p>
            <Link href="/contribute" className="mt-3 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2">
              Help improve the early release
            </Link>
          </div>
        </header>

        {!loadError && campusDirectoryLive(campusId) && (
          <InterestRecommendations signedIn={Boolean(user)} interests={interests} recommendations={recommendations} billingMessage={billingAccess.message} />
        )}

        {/* Home games get their own rail above the filters. Filling seats is the
            athletics department's actual ask, and a home fixture buried on page
            three of a combined list does not fill anything. */}
        {homeGames.length > 0 ? (
          <section className="border-b border-cream-300 bg-brand-950">
            <div className="max-w-content mx-auto px-5 sm:px-8 py-8 sm:py-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-lg sm:text-xl font-extrabold text-white">
                  <Trophy className="w-5 h-5 text-gold-500" />
                  Next home games
                </h2>
                <Link
                  href="/activities?kind=game&home=1"
                  className="text-sm font-semibold text-brand-300 hover:text-white transition-colors"
                >
                  See the full schedule
                </Link>
              </div>
              <p className="mt-1 text-sm text-white/50">Free for students with a valid ID.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {homeGames.map((game) => (
                  <a
                    key={game.id}
                    href={game.url ?? '#'}
                    target={game.url ? '_blank' : undefined}
                    rel="noreferrer noopener"
                    className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-gold-500">
                      {formatWhen(game, now)}
                    </p>
                    <p className="mt-1.5 font-bold text-white text-sm leading-snug">{game.name}</p>
                    {game.location ? (
                      <p className="mt-1.5 text-xs text-white/50 leading-snug">{game.location}</p>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="max-w-content mx-auto px-5 sm:px-8 py-8 sm:py-10">
          {loadError ? (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">The directory would not load.</p>
                <p className="mt-1 text-sm text-red-800 leading-relaxed">
                  Nothing is lost and this is on our side, not yours. Try again in a moment.
                </p>
                <p className="mt-2 text-xs font-mono text-red-700/70 break-words">{loadError}</p>
              </div>
            </div>
          ) : empty ? (
            <div className="text-center py-16 px-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cream-200 text-slate-400">
                <CalendarX className="w-7 h-7" />
              </div>
              <h2 className="mt-5 text-xl font-extrabold text-ink">
                {campusDirectoryLive(campusId)
                  ? `Nothing here for ${campusName(campusId)} yet`
                  : `${campusName(campusId)} is coming soon`}
              </h2>
              <p className="mt-2 max-w-md mx-auto text-slate-600 leading-relaxed">
                {campusDirectoryLive(campusId)
                  ? 'The directory fills from the university calendar, the organization directory, and the athletics schedule. Once the first sync runs for this campus, everything happening will show up here.'
                  : 'CampusQuest is piloting at the University of Rhode Island first. Other Rhode Island schools stay on this list so students can ask them to cover Genius Mining, but the activity directory is not live there yet.'}
              </p>
              {!campusDirectoryLive(campusId) ? (
                <Link href="/activities" className="btn-secondary mt-6">
                  See URI listings
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              <ActivityFilters categories={categories} counts={counts} />

              <div className="mt-6 flex items-baseline justify-between gap-4">
                <p className="text-sm text-slate-500" aria-live="polite">
                  {matches.length === 0
                    ? 'No matches'
                    : `Showing ${shown.length} of ${matches.length}`}
                </p>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-16 px-5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cream-200 text-slate-400">
                    <CalendarX className="w-7 h-7" />
                  </div>
                  <h2 className="mt-5 text-xl font-extrabold text-ink">Nothing matched that</h2>
                  <p className="mt-2 max-w-md mx-auto text-slate-600 leading-relaxed">
                    {filtering
                      ? 'Try a broader search, or clear the filters to see everything on campus.'
                      : 'Check back shortly.'}
                  </p>
                  <Link href="/activities" className="btn-secondary mt-6">
                    Show everything
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((activity) => (
                    <li key={activity.id} className="h-full">
                      <ActivityCard activity={activity} />
                    </li>
                  ))}
                </ul>
              )}

              {matches.length > shown.length ? (
                <p className="mt-8 text-center text-sm text-slate-500">
                  {matches.length - shown.length} more. Narrow it down with search or a category to
                  find what you are after.
                </p>
              ) : null}

              {filtering && matches.length > 0 ? <FoundingOfferPrompt /> : null}
            </>
          )}
          {!loadError && campusDirectoryLive(campusId) ? (
            <div id="report-listing" className="mt-12 scroll-mt-24">
              <ReportPanel campusId={campusId} options={reportOptions} />
            </div>
          ) : null}
          {loadError ? (
            <p id="report-listing" className="mt-6 text-sm text-slate-600">
              Listing reports are temporarily unavailable while the directory cannot load.
              <Link href="/contribute" className="ml-1 font-semibold text-brand-700 underline underline-offset-2">Other ways to help</Link>
            </p>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Shown to a signed-in account that is not cleared for the directory.
 *
 * In practice this is a 16 or 17 year old whose guardian has not answered yet.
 * It says what is happening and what to do about it, because "access denied" to
 * someone who did nothing wrong and is waiting on a third party is not useful.
 */
function DirectoryLocked({ reason }: { reason: string }) {
  return (
    <>
      <Navbar appearance="dark" />
      <main className="min-h-[70vh] bg-brand-950 px-5 py-20 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-gold-500/25 bg-gold-500/10 p-6 sm:p-8">
          <h1 className="text-xl font-extrabold sm:text-2xl">Almost there</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{reason}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            Approval links can land in spam, so it is worth asking them to check. If the
            link has expired we can send another one — email{' '}
            <a className="text-gold-400 hover:text-gold-500" href={`mailto:${privacyEmail()}`}>
              {privacyEmail()}
            </a>
            .
          </p>
          <Link href="/" className="btn-gold mt-6 inline-flex">
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
