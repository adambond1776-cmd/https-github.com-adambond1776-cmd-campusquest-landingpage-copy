import { describe, expect, it } from 'vitest';
import { interestsForRecommendations } from '@/lib/saved-interests';

describe('interests for recommendations', () => {
  it('uses the interest picker selections instead of older onboarding slugs', () => {
    const profile = {
      version: 1,
      selections: [
        { id: 'performance', priority: 2, details: [] },
        { id: 'play-sports', priority: 2, details: [] },
        { id: 'outdoors', priority: 2, details: [] },
        { id: 'academic', priority: 2, details: [] },
        { id: 'service', priority: 2, details: [] },
        { id: 'culture', priority: 2, details: [] },
      ],
    };
    expect(interestsForRecommendations(
      ['academics', 'career', 'clubs'],
      profile,
      [
        'Dance & theater',
        'Playing sports',
        'Outdoors & nature',
        'Academic interests & study groups',
        'Volunteering & service',
        'Culture, languages & international activities',
      ],
    )).toEqual([
      'Dance & theater',
      'Playing sports',
      'Outdoors & nature',
      'Academic interests & study groups',
      'Volunteering & service',
      'Culture, languages & international activities',
    ]);
  });

  it('reads the onboarding column when the picker has not saved a selection', () => {
    expect(interestsForRecommendations(['academics', 'career', 'clubs'], undefined, undefined))
      .toEqual(['academics', 'career', 'clubs']);
  });
});
