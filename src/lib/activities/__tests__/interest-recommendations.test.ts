import { describe, expect, it } from 'vitest';
import { recommendByInterests } from '../interest-recommendations';
import type { Activity } from '../types';
import { applyOverlay, CURATED_DIRECTORIES } from '../sources/curated';
import { type InterestProfile } from '@/lib/interests';

const now = new Date('2026-09-19T12:00:00Z');
function row(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'one', campus_id: 'uri', name: 'Robotics Club', summary: 'Robotics and engineering projects.',
    categories: ['Academic & Professional'], kind: 'organization', scope: 'on_campus',
    location: null, url: null, image_url: null, starts_at: null, ends_at: null,
    all_day: false, athletics: null, source: 'curated', source_ref: 'one',
    first_seen: now.toISOString(), last_seen: now.toISOString(), status: 'verified',
    verified_at: now.toISOString(), verified_by: 'fixture', working_words: [],
    low_commitment_entry: null, ...overrides,
  };
}

describe('simple interest recommendations', () => {
  it('matches without Genius Mining tags and explains the match', () => {
    expect(recommendByInterests([row()], ['Tech', 'Academic'], 'uri', now)[0].matchedInterests)
      .toEqual(['Academic interests & study groups', 'Science, technology & making']);
  });
  it.each(['listed', 'pending', 'hidden', 'stale'] as const)('excludes %s rows', (status) => {
    expect(recommendByInterests([row({ status })], ['Tech'], 'uri', now)).toEqual([]);
  });
  it('isolates campuses', () => {
    expect(recommendByInterests([row({ campus_id: 'jwu' })], ['Tech'], 'uri', now)).toEqual([]);
  });
  it.each([
    { kind: 'event' as const },
    { kind: 'game' as const },
    { starts_at: 'bad-date' },
    { starts_at: '2026-09-20', ends_at: 'bad-date' },
    { starts_at: '2026-09-20', ends_at: '2026-09-19' },
    { starts_at: '2026-09-18', ends_at: '2026-09-18' },
    { ends_at: '2026-09-25' },
  ])('excludes past, undated events and malformed dates: %j', (dates) => {
    expect(recommendByInterests([row(dates)], ['Tech'], 'uri', now)).toEqual([]);
  });
  it('includes ongoing and upcoming events', () => {
    expect(recommendByInterests([
      row({ id: 'ongoing', kind: 'event', starts_at: '2026-09-19T10:00:00Z', ends_at: '2026-09-19T14:00:00Z' }),
      row({ id: 'next', kind: 'event', starts_at: '2026-09-20T10:00:00Z' }),
    ], ['Tech'], 'uri', now)).toHaveLength(2);
  });
  it('matches whole words rather than art inside party', () => {
    expect(recommendByInterests([row({ name: 'Party Club', summary: null, categories: [] })],
      ['Arts & Photography'], 'uri', now)).toEqual([]);
  });
  it('uses legacy interests and category-only matches', () => {
    const result = recommendByInterests([row({ name: 'Studio', summary: null, categories: ['Visual Arts'] })], ['Art'], 'uri', now);
    expect(result[0].matchedInterests).toEqual(['Art, photography & film']);
  });
  it('does not confuse broad campus categories with a specific interest', () => {
    expect(recommendByInterests([
      row({ name: 'Chamber Music', summary: 'Students perform chamber music.', categories: ['Arts & Creativity'] }),
    ], ['Art'], 'uri', now)).toEqual([]);
    expect(recommendByInterests([
      row({ name: 'Outing Club', summary: 'Hiking and camping trips.', categories: ['Environment & Outdoors'] }),
    ], { version: 1, selections: [{ id: 'environment', priority: 2, details: [] }] }, 'uri', now)).toEqual([]);
  });
  it('does not treat martial arts as visual art, including detail preferences', () => {
    const activity = row({ name: 'Judo & Jiujitsu Club', summary: 'Martial-arts club for fitness and training.', categories: ['Sports & Recreation'] });
    expect(recommendByInterests([activity], ['Art'], 'uri', now)).toEqual([]);
    expect(recommendByInterests([activity], {
      version: 1, selections: [{ id: 'arts', priority: 3, details: ['Art & design'] }],
    }, 'uri', now)).toEqual([]);
  });
  it('ranks more matches first, then sooner events, then club names', () => {
    const rows = [
      row({ id: 'club', name: 'Z Robotics', categories: [] }),
      row({ id: 'later', starts_at: '2026-09-22', categories: [] }),
      row({ id: 'sooner', starts_at: '2026-09-20', categories: [] }),
      row({ id: 'both' }),
    ];
    expect(recommendByInterests(rows, ['Tech', 'Academic'], 'uri', now).map((r) => r.activity.id))
      .toEqual(['both', 'sooner', 'later', 'club']);
  });
  it('deduplicates, limits, and does not mutate the input', () => {
    const rows = [row(), row(), row({ id: 'two' })];
    const before = JSON.stringify(rows);
    expect(recommendByInterests(rows, ['Tech'], 'uri', now, 1)).toHaveLength(1);
    expect(recommendByInterests(rows, ['Tech'], 'uri', now)).toHaveLength(2);
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('returns no invented suggestions for missing interests, no matches or invalid limits', () => {
    for (const interests of [[], null, ['Travel']]) {
      expect(recommendByInterests([row()], interests, 'uri', now)).toEqual([]);
    }
    for (const limit of [0, -1, NaN, Infinity]) {
      expect(recommendByInterests([row()], ['Tech'], 'uri', now, limit)).toEqual([]);
    }
  });
  it('can use the existing URI directory without calling an AI or scraper', () => {
    const drafts = applyOverlay([], CURATED_DIRECTORIES.uri, now).added;
    const activities = drafts.map((draft) => row({ ...draft, status: 'verified' }));
    expect(activities).toHaveLength(109);
    for (const interest of ['Music', 'Theater', 'Art', 'Sports', 'Tech', 'Gaming', 'Academic', 'Social', 'Volunteering']) {
      const matches = recommendByInterests(activities, [interest], 'uri', now);
      expect(matches.length, interest).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(6);
    }
  });
  it('puts a priority above many lower-weight matches', () => {
    const profile: InterestProfile = { version: 1, selections: [
      { id: 'arts', priority: 3, details: [] },
      { id: 'technology', priority: 2, details: [] },
      { id: 'academic', priority: 2, details: [] },
      { id: 'career', priority: 2, details: [] },
    ] };
    const result = recommendByInterests([
      row({ id: 'many', summary: 'Engineering and career development for professional scientists.' }),
      row({ id: 'favorite', name: 'Painting', summary: 'Art and painting.', categories: [] }),
    ], profile, 'uri', now);
    expect(result.map((r) => r.activity.id)).toEqual(['favorite', 'many']);
    expect(result[0].reason).toContain('you prioritized');
  });
  it('prefers a specific selected detail without excluding all broader matches', () => {
    const profile: InterestProfile = { version: 1, selections: [{ id: 'arts', priority: 3, details: ['Photography'] }] };
    const result = recommendByInterests([
      row({ id: 'art', name: 'A Art', summary: 'Painting and art.', categories: [] }),
      row({ id: 'photo', name: 'Z Photography', summary: 'Learn photography.', categories: [] }),
    ], profile, 'uri', now);
    expect(result.map((r) => r.activity.id)).toEqual(['photo', 'art']);
    expect(result[0].reason).toBe('Because you prioritized Photography.');
  });
  it('separates playing sports from watching games', () => {
    const game = row({ id: 'game', kind: 'game', name: 'Basketball', summary: 'Basketball home game.', starts_at: '2026-09-21' });
    const club = row({ id: 'club', name: 'Basketball Club', summary: 'Play basketball.', categories: ['Sports & Recreation'] });
    const playing = { version: 1, selections: [{ id: 'play-sports', priority: 3, details: [] }] };
    const watching = { version: 1, selections: [{ id: 'watch-sports', priority: 3, details: [] }] };
    expect(recommendByInterests([game, club], playing, 'uri', now).map((r) => r.activity.id)).toEqual(['club']);
    expect(recommendByInterests([game, club], watching, 'uri', now).map((r) => r.activity.id)).toEqual(['game']);
  });
  it('does not classify an ambiguous music acronym from the name alone', () => {
    expect(recommendByInterests([row({
      name: 'MUSIC', summary: 'Multicultural unity and student involvement council.', categories: ['Culture & Community'],
    })], ['Music'], 'uri', now)).toEqual([]);
  });
  it('shows a curiosity explanation and never treats an unselected interest as a match', () => {
    const profile = { version: 1, selections: [{ id: 'technology', priority: 1, details: [] }] };
    expect(recommendByInterests([row()], profile, 'uri', now)[0].reason).toContain('you are curious about');
    expect(recommendByInterests([row()], { version: 1, selections: [] }, 'uri', now)).toEqual([]);
  });
});
