'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';

const TABS = [
  { value: 'all', label: 'Everything' },
  { value: 'game', label: 'Athletics' },
  { value: 'event', label: 'Events' },
  { value: 'organization', label: 'Clubs' },
] as const;

type Props = {
  categories: string[];
  counts: Record<string, number>;
};

/**
 * Filter controls for the directory.
 *
 * State lives in the URL rather than in the component so a filtered view can be
 * shared, bookmarked, and reached with the back button. Every control is inside
 * a real form with a submit button, so the page still filters if the JavaScript
 * has not loaded on a bad campus connection.
 */
export default function ActivityFilters({ categories, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const kind = params.get('kind') ?? 'all';
  const category = params.get('category') ?? '';
  const homeOnly = params.get('home') === '1';
  const query = params.get('q') ?? '';

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }

    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  const filtered = Boolean(params.get('q') || category || homeOnly || kind !== 'all');

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get('q');
          apply({ q: typeof value === 'string' ? value.trim() || null : null });
        }}
        className="relative"
        role="search"
      >
        <label htmlFor="activity-search" className="sr-only">
          Search activities
        </label>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        {/* Uncontrolled, keyed on the query so navigation (back button, "clear
            filters") resets the box without an effect syncing two sources of
            truth. The URL is the state; this input is just how you edit it. */}
        <input
          key={query}
          id="activity-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search clubs, teams, and events"
          className="w-full pl-11 pr-24 py-3.5 rounded-xl border border-cream-300 bg-white text-[15px] text-ink placeholder:text-slate-400 shadow-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Search
        </button>
      </form>

      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap"
        role="tablist"
        aria-label="Filter by type"
      >
        {TABS.map((tab) => {
          const active = kind === tab.value;
          const count = counts[tab.value] ?? 0;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => apply({ kind: tab.value === 'all' ? null : tab.value, home: null })}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                active
                  ? 'bg-brand-600 text-white border-brand-600 shadow-soft'
                  : 'bg-white text-slate-600 border-cream-300 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {tab.label}
              <span className={active ? 'text-white/70' : 'text-slate-400'}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {kind === 'game' ? (
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={homeOnly}
              onChange={(event) => apply({ home: event.target.checked ? '1' : null })}
              className="w-4 h-4 rounded border-cream-400 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-slate-700">Home games only</span>
          </label>
        ) : null}

        {categories.length > 0 ? (
          <>
            <label htmlFor="activity-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="activity-category"
              value={category}
              onChange={(event) => apply({ category: event.target.value || null })}
              className="px-3 py-2 rounded-lg border border-cream-300 bg-white text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {filtered ? (
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname))}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        ) : null}

        {pending ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400" aria-live="polite">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Updating
          </span>
        ) : null}
      </div>
    </div>
  );
}
