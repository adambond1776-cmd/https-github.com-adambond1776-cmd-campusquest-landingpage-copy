import Link from 'next/link';
import RecommendationCategoryFilters from './RecommendationCategoryFilters';
import { recommendationCategory, recommendationsForBasicAccess, type InterestRecommendation } from '@/lib/activities/interest-recommendations';
import GeniusMiningTeaser from '@/components/GeniusMiningTeaser';

export default function InterestRecommendations({
  signedIn, hasInterests, basicActive = false, recommendations,
}: {
  signedIn: boolean;
  hasInterests: boolean;
  basicActive?: boolean;
  recommendations: InterestRecommendation[];
}) {
  const visible = recommendationsForBasicAccess(recommendations, basicActive);
  const personalized = signedIn && basicActive && hasInterests && visible.length > 0;
  const promptForInterests = signedIn && basicActive && !hasInterests;
  const upgrade = signedIn && !basicActive;
  const events = visible.filter((item) => recommendationCategory(item.activity) === 'events');

  return (
    <section id="recommended-for-you" aria-labelledby="recommendations-heading" className="scroll-mt-24 border-b border-cream-300 bg-cream-100">
      <div className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-10">
        {upgrade ? (
          <div>
            <h2 id="recommendations-heading" className="text-xl font-extrabold text-ink">Recommendations built around you</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              CampusQuest Basic uses your interests to recommend clubs and organizations you may want to join.
            </p>
            <Link href="/#pricing" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4">
              Explore CampusQuest Basic
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="recommendations-heading" className="text-xl font-extrabold text-ink">
                {promptForInterests ? 'Tell us what you’re into' : 'Recommended for you'}
              </h2>
              {personalized ? (
                <p className="mt-1 text-sm font-medium text-slate-600">Based on your interests</p>
              ) : null}
            </div>
            <Link href={signedIn ? '/settings' : '/login'} className="text-sm font-semibold text-brand-700 underline underline-offset-4">
              {signedIn ? 'Edit your interests' : 'Sign in to personalize'}
            </Link>
          </div>
        )}
        {!upgrade && !personalized ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {!signedIn
              ? 'Sign in and choose your interests to find campus activities that fit you. You can browse all listings below.'
              : promptForInterests
                ? 'Choose a few interests and we’ll recommend events, clubs, and organizations around campus.'
                : 'None of your saved interests match a current public listing yet. Browse the directory below or edit your interests.'}
          </p>
        ) : null}
        {personalized ? <RecommendationCategoryFilters recommendations={visible} /> : null}
        {upgrade && events.length > 0 ? <RecommendationCategoryFilters recommendations={events} filters={['events']} /> : null}
        <GeniusMiningTeaser />
      </div>
    </section>
  );
}
