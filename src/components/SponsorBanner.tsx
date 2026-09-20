import { safeSponsorHref, type SponsorPlacement } from '@/lib/launch-offers';

/** One contextual placement, no trackers, targeting, impression counts or ad SDK. */
export default function SponsorBanner({ placement }: { placement: SponsorPlacement | null }) {
  if (!placement?.name.trim() || !placement.message.trim()) return null;
  const href = safeSponsorHref(placement.href);
  if (!href) return null;
  return (
    <aside aria-label="Advertisement" className="border-y border-cream-300 bg-cream-50">
      <div className="max-w-content mx-auto px-5 sm:px-8 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0 break-words">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/60">Advertisement</p>
          <p className="mt-1 font-bold text-ink">{placement.name}</p>
          <p className="mt-1 text-sm text-ink/70">{placement.message}</p>
        </div>
        <a href={href} target="_blank" rel="sponsored noopener noreferrer" className="mt-3 inline-block shrink-0 text-sm font-semibold text-brand-700 underline underline-offset-2 sm:mt-0">
          Explore this sponsor<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </aside>
  );
}
