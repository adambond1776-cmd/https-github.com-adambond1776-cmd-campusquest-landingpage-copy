import Link from 'next/link';
import ActivityCard from './ActivityCard';
import type { InterestRecommendation } from '@/lib/activities/interest-recommendations';
import GeniusMiningTeaser from '@/components/GeniusMiningTeaser';

export default function InterestRecommendations({
  signedIn, interests, recommendations, billingMessage,
}: {
  signedIn: boolean;
  interests: readonly string[];
  recommendations: InterestRecommendation[];
  billingMessage?: string;
}) {
  return (
    <section aria-labelledby="recommendations-heading" className="border-b border-cream-300 bg-cream-100">
      <div className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recommendations-heading" className="text-xl font-extrabold text-ink">Recommended for you</h2>
          <Link href={signedIn ? '/settings' : '/login'} className="text-sm font-semibold text-brand-700 underline underline-offset-4">
            {signedIn ? 'Edit your interests' : 'Sign in to personalize'}
          </Link>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {billingMessage ?? (!signedIn ? 'Sign in and choose your interests to find campus activities that fit you. You can browse all listings below.'
            : !interests.length ? 'Choose your interests in account settings to see matching clubs and activities.'
            : `Matched to your ${interests.length} selected interest${interests.length === 1 ? '' : 's'}, with your priorities first. Every result explains its match.`)}
        </p>
        {billingMessage && <Link href="/billing" className="mt-4 inline-block font-semibold text-brand-700 underline">Manage test subscription</Link>}
        {!billingMessage && signedIn && interests.length > 0 && !recommendations.length && (
          <p className="mt-4 text-sm text-slate-700">No confirmed, current matches yet. Browse the directory below or update your interests.</p>
        )}
        {!billingMessage && recommendations.length > 0 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ activity, reason }) => (
              <div key={activity.id} className="flex min-w-0 flex-col gap-2">
                <p className="text-xs font-semibold text-brand-700">{reason}</p>
                <ActivityCard activity={activity} />
              </div>
            ))}
          </div>
        )}
        <GeniusMiningTeaser />
      </div>
    </section>
  );
}
