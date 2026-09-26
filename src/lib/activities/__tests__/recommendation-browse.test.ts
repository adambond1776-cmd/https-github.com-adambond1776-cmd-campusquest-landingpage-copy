import { describe, expect, it } from 'vitest';
import {
  initialRecommendationBrowse,
  recommendationBrowseControl,
  reduceRecommendationBrowse,
} from '../recommendation-browse';

describe('recommendation show more', () => {
  it('shows 6 recommendations by default', () => {
    expect(initialRecommendationBrowse().visibleCount).toBe(6);
    expect(recommendationBrowseControl(14, 6)).toBe('more');
  });

  it('reveals the next 6 on Show more', () => {
    const start = initialRecommendationBrowse();
    const next = reduceRecommendationBrowse(start, { type: 'more', total: 14 });
    expect(next.visibleCount).toBe(12);
    expect(recommendationBrowseControl(14, next.visibleCount)).toBe('more');
    const rest = reduceRecommendationBrowse(next, { type: 'more', total: 14 });
    expect(rest.visibleCount).toBe(14);
    expect(recommendationBrowseControl(14, rest.visibleCount)).toBe('less');
  });

  it('resets to 6 when the filter changes', () => {
    const expanded = reduceRecommendationBrowse(initialRecommendationBrowse(), { type: 'more', total: 20 });
    const filtered = reduceRecommendationBrowse(expanded, { type: 'filter', filter: 'events' });
    expect(filtered).toEqual({ filter: 'events', visibleCount: 6 });
  });

  it('hides the button when the active filter has 6 or fewer results', () => {
    expect(recommendationBrowseControl(6, 6)).toBeNull();
    expect(recommendationBrowseControl(3, 6)).toBeNull();
  });

  it('returns to the first 6 on Show less', () => {
    const expanded = reduceRecommendationBrowse(
      reduceRecommendationBrowse(initialRecommendationBrowse(), { type: 'more', total: 18 }),
      { type: 'more', total: 18 },
    );
    expect(expanded.visibleCount).toBe(18);
    expect(reduceRecommendationBrowse(expanded, { type: 'less' }).visibleCount).toBe(6);
    expect(recommendationBrowseControl(18, 6)).toBe('more');
  });
});
