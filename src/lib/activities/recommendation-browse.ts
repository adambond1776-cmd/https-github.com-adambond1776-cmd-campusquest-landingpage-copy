import { RECOMMENDATION_PAGE_SIZE, type RecommendationCategoryFilter } from '@/lib/activities/interest-recommendations';

export type RecommendationBrowseState = {
  filter: RecommendationCategoryFilter;
  visibleCount: number;
};

export function initialRecommendationBrowse(): RecommendationBrowseState {
  return { filter: 'all', visibleCount: RECOMMENDATION_PAGE_SIZE };
}

export function reduceRecommendationBrowse(
  state: RecommendationBrowseState,
  action:
    | { type: 'filter'; filter: RecommendationCategoryFilter }
    | { type: 'more'; total: number }
    | { type: 'less' },
): RecommendationBrowseState {
  if (action.type === 'filter') {
    if (state.filter === action.filter) return state;
    return { filter: action.filter, visibleCount: RECOMMENDATION_PAGE_SIZE };
  }
  if (action.type === 'less') {
    return { ...state, visibleCount: RECOMMENDATION_PAGE_SIZE };
  }
  const total = Number.isFinite(action.total) ? Math.max(0, action.total) : 0;
  return { ...state, visibleCount: Math.min(total, state.visibleCount + RECOMMENDATION_PAGE_SIZE) };
}

/** Null hides the control. More and less share one button. */
export function recommendationBrowseControl(total: number, visibleCount: number): 'more' | 'less' | null {
  if (!Number.isFinite(total) || total <= RECOMMENDATION_PAGE_SIZE) return null;
  return visibleCount >= total ? 'less' : 'more';
}
