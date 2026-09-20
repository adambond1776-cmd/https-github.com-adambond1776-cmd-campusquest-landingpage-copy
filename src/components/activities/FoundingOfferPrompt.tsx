import Link from 'next/link';
import { FOUNDING_OFFERS, FOUNDING_TERMS } from '@/lib/launch-offers';

export default function FoundingOfferPrompt() {
  return (
    <aside aria-labelledby="founding-search-offer" className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
      <h2 id="founding-search-offer" className="text-lg font-extrabold text-ink">Found something worth coming back to?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/75">
        You can bookmark this filtered page in your browser now. Account-based saved searches
        and saved events are planned for Founding Basic: ${FOUNDING_OFFERS.student.amount} for {FOUNDING_OFFERS.student.days} days.
        They are not enabled yet, and this search has not been saved to an account.
      </p>
      <p className="mt-2 text-sm font-semibold text-brand-800">{FOUNDING_TERMS}</p>
      <Link href="/#pricing" className="mt-4 inline-block text-sm font-bold text-brand-700 underline underline-offset-2">
        Preview the founding offer
      </Link>
    </aside>
  );
}
