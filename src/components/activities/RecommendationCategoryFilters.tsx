'use client';

import { useState } from 'react';
import ActivityCard from './ActivityCard';
import {
  matchesRecommendationFilter,
  type InterestRecommendation,
  type RecommendationCategoryFilter,
} from '@/lib/activities/interest-recommendations';
import {
  initialRecommendationBrowse,
  recommendationBrowseControl,
  reduceRecommendationBrowse,
} from '@/lib/activities/recommendation-browse';

const FILTERS: { value: RecommendationCategoryFilter; label: string; empty: string }[] = [
  { value: 'all', label: 'All', empty: '' },
  { value: 'clubs', label: 'Clubs', empty: 'No personalized club recommendations yet.' },
  { value: 'events', label: 'Events', empty: 'No personalized event recommendations yet.' },
  { value: 'organizations', label: 'Organizations', empty: 'No personalized organization recommendations yet.' },
];

export default function RecommendationCategoryFilters({
  recommendations,
  filters,
}: {
  recommendations: InterestRecommendation[];
  filters?: RecommendationCategoryFilter[];
}) {
  const choices = FILTERS.filter((item) => !filters || filters.includes(item.value));
  const [browse, setBrowse] = useState(initialRecommendationBrowse);
  const filtered = recommendations.filter((item) => matchesRecommendationFilter(item.activity, browse.filter));
  const visible = filtered.slice(0, browse.visibleCount);
  const control = recommendationBrowseControl(filtered.length, browse.visibleCount);
  const empty = choices.find((item) => item.value === browse.filter)?.empty ?? '';

  function selectFilter(filter: RecommendationCategoryFilter) {
    setBrowse((current) => reduceRecommendationBrowse(current, { type: 'filter', filter }));
  }

  function move(current: HTMLButtonElement, direction: 1 | -1) {
    const buttons = [...current.parentElement?.querySelectorAll<HTMLButtonElement>('[data-recommendation-filter]') ?? []];
    const index = buttons.indexOf(current);
    if (index < 0 || buttons.length === 0) return;
    const next = buttons[(index + direction + buttons.length) % buttons.length];
    next.focus();
    const value = next.dataset.recommendationFilter;
    if (value === 'all' || value === 'clubs' || value === 'events' || value === 'organizations') selectFilter(value);
  }

  return (
    <div className="mt-4">
      {choices.length > 1 ? <div
        role="group"
        aria-label="Filter recommendations"
        className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-5 px-5 sm:mx-0 sm:px-0"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          const current = event.target;
          if (!(current instanceof HTMLButtonElement)) return;
          event.preventDefault();
          move(current, event.key === 'ArrowRight' ? 1 : -1);
        }}
      >
        {choices.map((item) => {
          const selected = browse.filter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              data-recommendation-filter={item.value}
              aria-pressed={selected}
              onClick={() => selectFilter(item.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                selected
                  ? 'border-brand-600 bg-brand-600 text-white shadow-soft'
                  : 'border-cream-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div> : null}
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{empty || 'No personalized recommendations yet.'}</p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ activity, reason }) => (
            <div key={activity.id} className="flex min-w-0 flex-col gap-2">
              <p className="text-xs font-semibold text-brand-700">{reason}</p>
              <ActivityCard activity={activity} />
            </div>
          ))}
        </div>
      )}
      {control ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (control === 'less') {
                setBrowse((current) => reduceRecommendationBrowse(current, { type: 'less' }));
                const section = document.getElementById('recommended-for-you');
                if (section && section.getBoundingClientRect().top < 80) {
                  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
              }
              setBrowse((current) => reduceRecommendationBrowse(current, { type: 'more', total: filtered.length }));
            }}
            className="min-h-11 rounded-full border border-brand-600 bg-white px-5 py-2 text-sm font-semibold text-brand-700 shadow-soft transition-colors hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {control === 'less' ? 'Show less' : 'Show more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
