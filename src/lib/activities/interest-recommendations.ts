import { interestOption, normalizeInterestProfile, type InterestId } from '@/lib/interests';
import type { Activity } from './types';

type Rule = { categories?: string[]; words: string[] };
const RULES: Record<InterestId, Rule> = {
  music: { words: ['music', 'musical', 'concert', 'choir', 'band', 'singing'] },
  performance: { words: ['dance', 'dancing', 'theater', 'theatre', 'comedy', 'performing'] },
  arts: { categories: ['Visual Arts', 'Photography', 'Film', 'Media & Communication'], words: ['art', 'arts', 'design', 'photography', 'painting', 'crafts', 'writing', 'film'] },
  gaming: { words: ['gaming', 'gamers', 'esports', 'anime', 'chess', 'tabletop', 'video games', 'board games'] },
  'play-sports': { categories: ['Sports & Recreation'], words: ['intramural', 'recreational sports', 'sport club', 'sports club', 'basketball', 'soccer', 'football', 'volleyball', 'tennis', 'hockey', 'swimming'] },
  'watch-sports': { words: ['watch party', 'spectator', 'cheer on', 'fan club'] },
  wellbeing: { categories: ['Health & Wellness'], words: ['fitness', 'wellbeing', 'wellness', 'yoga', 'meditation', 'exercise'] },
  outdoors: { words: ['outdoor', 'outdoors', 'hiking', 'camping', 'outing', 'wildlife', 'nature', 'sailing', 'surfing'] },
  travel: { words: ['travel', 'study abroad', 'trips', 'exploring', 'excursion'] },
  academic: { categories: ['Academic & Professional'], words: ['academic', 'research', 'study group', 'scholarship'] },
  technology: { words: ['science', 'technology', 'tech', 'engineering', 'coding', 'programming', 'robotics', 'computer', 'hackathon', 'makers'] },
  career: { words: ['career', 'careers', 'professional', 'business', 'entrepreneurship', 'entrepreneur', 'startup'] },
  service: { words: ['volunteer', 'volunteering', 'service', 'mentoring', 'fundraising'] },
  leadership: { categories: ['Civic & Advocacy'], words: ['leadership', 'advocacy', 'civic', 'activism', 'student government'] },
  environment: { words: ['environment', 'environmental', 'sustainability', 'conservation'] },
  culture: { categories: ['Culture & Community'], words: ['culture', 'cultural', 'language', 'languages', 'international'] },
  faith: { categories: ['Faith & Spirituality'], words: ['faith', 'spirituality', 'religious', 'interfaith'] },
  social: { categories: ['Social & Hobbies'], words: ['social', 'meetup', 'hobbies', 'crafts', 'food', 'campus traditions'] },
};

const DETAIL_WORDS: Record<string, string[]> = {
  'Live music': ['concert', 'live music'], Singing: ['singing', 'choir', 'choral', 'a cappella'],
  'Making music': ['music production', 'band', 'instrument', 'orchestra'],
  Dance: ['dance', 'dancing'], Theater: ['theater', 'theatre'], Comedy: ['comedy', 'improv'],
  Photography: ['photography', 'photographer'], Film: ['film', 'cinema'],
  'Art & design': ['art', 'arts', 'design', 'painting'], Writing: ['writing', 'poetry', 'literary'],
  'Video games': ['gaming', 'esports', 'video games'], Anime: ['anime'],
  'Board games': ['board games', 'tabletop'], Chess: ['chess'],
  'Team sports': ['basketball', 'soccer', 'football', 'volleyball', 'hockey'],
  'Individual sports': ['tennis', 'golf', 'running', 'swimming', 'archery'],
  'Recreational sports': ['intramural', 'recreational'],
  Basketball: ['basketball'], Football: ['football'], Soccer: ['soccer'], Hockey: ['hockey'],
  Fitness: ['fitness', 'exercise', 'training'], Yoga: ['yoga'],
  Wellbeing: ['wellbeing', 'wellness', 'meditation'],
  Hiking: ['hiking', 'outing'], 'Nature & wildlife': ['nature', 'wildlife', 'animals'],
  'Water activities': ['surfing', 'sailing', 'kayaking', 'rowing'],
  'Study abroad': ['study abroad'], 'Local trips': ['local trips', 'excursion'], Travel: ['travel', 'trips'],
  Coding: ['coding', 'programming', 'computer', 'hackathon'],
  'Engineering & robotics': ['engineering', 'robotics'], Science: ['science', 'research'],
  Careers: ['career', 'careers', 'professional'], Business: ['business'],
  Entrepreneurship: ['entrepreneurship', 'entrepreneur', 'startup'],
  Leadership: ['leadership', 'student government'], Advocacy: ['advocacy', 'activism'],
  'Civic involvement': ['civic', 'voting', 'public service'],
  Languages: ['language', 'languages'], 'Cultural activities': ['cultural', 'culture'],
  'International community': ['international'],
  'Social meetups': ['social', 'meetup'], 'Food & crafts': ['food', 'cooking', 'crafts', 'crochet'],
  'Campus traditions': ['campus traditions', 'homecoming', 'greek life', 'fraternity', 'sorority'],
};
const tokens = (value: string) => ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
const contains = (text: string, words: string[]) => words.some((word) => text.includes(tokens(word)));

function current(activity: Activity, now: number): boolean {
  if (!activity.starts_at) return !activity.ends_at && activity.kind !== 'event' && activity.kind !== 'game';
  const start = Date.parse(activity.starts_at);
  const end = Date.parse(activity.ends_at ?? activity.starts_at);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start && end >= now;
}

export type InterestRecommendation = {
  activity: Activity; matchedInterests: string[]; matchedDetails: string[]; score: number; reason: string;
};

/**
 * Priority is dominant: a 3 always beats a 2, however many broad tags match.
 * Detail and secondary-interest bonuses are bounded, never compatibility %s.
 * Only human-confirmed, current listings from this campus are eligible.
 */
export function recommendByInterests(
  activities: Activity[], preferences: unknown, campusId: string, now = new Date(), limit = 6,
): InterestRecommendation[] {
  const profile = Array.isArray(preferences)
    ? normalizeInterestProfile(undefined, preferences) : normalizeInterestProfile(preferences);
  if (!profile.selections.length || !Number.isFinite(now.getTime()) || !Number.isFinite(limit) || limit <= 0) return [];
  const seen = new Set<string>();
  return activities.flatMap((activity): InterestRecommendation[] => {
    if (activity.campus_id !== campusId || activity.status !== 'verified' || !current(activity, now.getTime())) return [];
    if (seen.has(activity.id)) return [];
    seen.add(activity.id);
    // Prefer descriptive content over ambiguous club-name acronyms.
    const text = tokens(activity.summary || activity.name);
    const matches = profile.selections.flatMap((selection) => {
      const rule = RULES[selection.id];
      const matchingText = selection.id === 'arts' ? text.replace(/\bmartial arts?\b/g, ' ') : text;
      const details = selection.details.filter((detail) => contains(matchingText, DETAIL_WORDS[detail] ?? []));
      let matching = contains(matchingText, rule.words) || details.length > 0
        || rule.categories?.some((category) => activity.categories.some((value) => tokens(value) === tokens(category)));
      if (selection.id === 'watch-sports') matching = activity.kind === 'game' || contains(text, rule.words);
      if (selection.id === 'play-sports' && (activity.kind === 'game' || contains(text, RULES['watch-sports'].words))) matching = false;
      return matching ? [{ ...selection, details, label: interestOption(selection.id)!.label }] : [];
    }).sort((a, b) => b.priority - a.priority || b.details.length - a.details.length || a.id.localeCompare(b.id));
    if (!matches.length) return [];
    const strongest = matches[0];
    const score = strongest.priority + (strongest.details.length ? 0.2 : 0) + Math.min(matches.length - 1, 3) * 0.05;
    const intent = strongest.priority === 3 ? 'you prioritized' : strongest.priority === 1 ? 'you are curious about' : 'you chose';
    return [{
      activity, score, matchedInterests: matches.map((item) => item.label),
      matchedDetails: matches.flatMap((item) => item.details),
      reason: `Because ${intent} ${strongest.details[0] ?? strongest.label}.`,
    }];
  }).sort((a, b) => b.score - a.score
    || (a.activity.starts_at ? Date.parse(a.activity.starts_at) : Infinity) - (b.activity.starts_at ? Date.parse(b.activity.starts_at) : Infinity)
    || a.activity.name.localeCompare(b.activity.name) || a.activity.id.localeCompare(b.activity.id)
  ).slice(0, Math.floor(limit));
}

/**
 * Internal keyword map for official CampusQuest interests.
 * The visible reason always uses the saved label, never these words.
 * A single weak word is not enough to recommend a listing.
 */
const DIRECTORY_RULES: Record<InterestId, { strong: string[]; weak: string[]; categories: string[] }> = {
  music: { strong: ['music', 'musical', 'concert', 'choir', 'singing'], weak: ['band'], categories: [] },
  performance: { strong: ['dance', 'dancing', 'theater', 'theatre', 'theatrical', 'comedy', 'improv', 'choreography', 'ballet'], weak: ['performing', 'performance'], categories: [] },
  arts: { strong: ['photography', 'photographer', 'film', 'cinema', 'painting', 'design'], weak: ['art', 'arts', 'writing'], categories: ['Film / Media Screenings', 'Student Media'] },
  gaming: { strong: ['gaming', 'esports', 'anime', 'chess', 'tabletop'], weak: ['gamers'], categories: [] },
  'play-sports': {
    strong: ['intramural', 'intramurals', 'recreation', 'recreational', 'athletics', 'basketball', 'soccer', 'football', 'volleyball', 'tennis', 'hockey', 'swimming', 'baseball', 'softball', 'lacrosse', 'rugby', 'rowing', 'wrestling', 'gymnastics', 'golf'],
    weak: ['sport', 'sports', 'team'],
    categories: ['Athletics', 'Athletics / Recreation', 'Club Sport'],
  },
  'watch-sports': { strong: ['watch party', 'spectator'], weak: [], categories: [] },
  wellbeing: { strong: ['fitness', 'wellbeing', 'wellness', 'yoga', 'meditation'], weak: ['exercise'], categories: [] },
  outdoors: { strong: ['outdoor', 'outdoors', 'hiking', 'camping', 'wildlife', 'nature', 'trail', 'kayak', 'kayaking', 'sailing', 'surfing', 'climbing'], weak: ['outing'], categories: [] },
  travel: { strong: ['study abroad', 'travel'], weak: ['trips', 'excursion'], categories: [] },
  academic: {
    strong: ['academic', 'economics', 'finance', 'engineering', 'science', 'research', 'tutoring', 'tutor', 'study group', 'lecture', 'seminar', 'scholarship', 'laboratory'],
    weak: ['study'],
    categories: ['Academic'],
  },
  technology: { strong: ['technology', 'coding', 'programming', 'robotics', 'hackathon', 'computer'], weak: ['tech'], categories: [] },
  career: {
    strong: ['career', 'careers', 'internship', 'recruiting', 'job fair', 'entrepreneurship', 'entrepreneur', 'startup', 'business'],
    weak: ['professional'],
    categories: ['Careers / Job Fairs', 'Business Enterprise'],
  },
  service: { strong: ['volunteer', 'volunteering', 'community service', 'service learning', 'mentoring', 'fundraiser', 'fundraising'], weak: ['service'], categories: ['Service', 'Community Engagement'] },
  leadership: { strong: ['leadership', 'advocacy', 'student government', 'civic'], weak: ['activism'], categories: ['Governance'] },
  environment: { strong: ['environment', 'environmental', 'sustainability', 'conservation'], weak: [], categories: [] },
  culture: { strong: ['culture', 'cultural', 'language', 'languages', 'international', 'multicultural', 'intercultural'], weak: [], categories: ['Multicultural'] },
  faith: { strong: ['faith', 'spirituality', 'religious', 'interfaith'], weak: [], categories: ['Religious/Spiritual'] },
  social: { strong: ['meetup', 'homecoming'], weak: ['social', 'hobby', 'hobbies'], categories: ['Social / Gatherings'] },
};

const CAREER_CATEGORIES = new Set(['careers / job fairs', 'business enterprise']);
const MEANINGFUL_MATCH_SCORE = 3;

const PUBLIC_RECOMMENDATION_STATUSES = new Set(['listed', 'verified']);

function isClubListing(activity: Activity): boolean {
  return activity.kind === 'organization' && contains(recommendationText(activity), ['club', 'clubs']);
}

export const RECOMMENDATION_PAGE_SIZE = 6;
/** Qualified matches available to Show more. The match threshold is unchanged. */
export const RECOMMENDATION_POOL_LIMIT = 60;

export type RecommendationCategoryFilter = 'all' | 'clubs' | 'events' | 'organizations';

/** Clubs, events (including athletics), or other organizations. Matching scores are unchanged. */
export function recommendationCategory(activity: Activity): Exclude<RecommendationCategoryFilter, 'all'> | null {
  if (activity.kind === 'event' || activity.kind === 'game') return 'events';
  if (isClubListing(activity)) return 'clubs';
  if (activity.kind === 'organization') return 'organizations';
  return null;
}

export function matchesRecommendationFilter(activity: Activity, filter: RecommendationCategoryFilter): boolean {
  if (filter === 'all') return true;
  return recommendationCategory(activity) === filter;
}

/**
 * Personalized clubs and organizations require an active Basic window.
 * Public events stay visible. The caller must pass the server-read entitlement.
 */
export function recommendationsForBasicAccess<T extends { activity: Activity }>(
  recommendations: T[],
  basicActive: boolean,
): T[] {
  if (basicActive) return recommendations;
  return recommendations.filter((item) => recommendationCategory(item.activity) === 'events');
}

const MIX_SLOTS: Array<(activity: Activity) => boolean> = [
  (activity) => activity.kind === 'event',
  (activity) => isClubListing(activity),
  (activity) => activity.kind === 'organization' && !isClubListing(activity),
  (activity) => activity.kind === 'game',
];

function savedInterest(value: string): { label: string; id: InterestId | null; strong: string[]; weak: string[]; categories: string[] } | null {
  const label = value.trim();
  if (!label) return null;
  const option = interestOption(label) ?? INTEREST_OPTIONS_BY_LABEL.get(label);
  if (!option) {
    return { label, id: null, strong: [label], weak: [], categories: [] };
  }
  const rule = DIRECTORY_RULES[option.id];
  return { label: option.label, id: option.id, strong: rule.strong, weak: rule.weak, categories: rule.categories };
}

const INTEREST_OPTIONS_BY_LABEL = new Map<string, NonNullable<ReturnType<typeof interestOption>>>();
for (const id of ['music', 'performance', 'arts', 'gaming', 'play-sports', 'watch-sports', 'wellbeing', 'outdoors', 'travel', 'academic', 'technology', 'career', 'service', 'leadership', 'environment', 'culture', 'faith', 'social'] as const) {
  const option = interestOption(id);
  if (option) INTEREST_OPTIONS_BY_LABEL.set(option.label, option);
}

function recommendationText(activity: Activity): string {
  return tokens([
    activity.name,
    activity.summary ?? '',
    activity.organization_name ?? '',
    activity.categories.join(' '),
    activity.athletics?.sport ?? '',
    activity.athletics?.opponent ?? '',
  ].join(' ')).replace(/\bmartial arts?\b/g, ' ');
}

function mixRecommendations(ranked: InterestRecommendation[], limit: number): InterestRecommendation[] {
  const picked: InterestRecommendation[] = [];
  const used = new Set<string>();
  const usedInterests = new Set<string>();
  const take = (item: InterestRecommendation) => {
    picked.push(item);
    used.add(item.activity.id);
    usedInterests.add(item.matchedInterests[0] ?? '');
  };
  for (const matchesSlot of MIX_SLOTS) {
    const unusedInterest = ranked.find((item) =>
      matchesSlot(item.activity) && !used.has(item.activity.id) && !usedInterests.has(item.matchedInterests[0] ?? ''));
    const next = unusedInterest ?? ranked.find((item) => matchesSlot(item.activity) && !used.has(item.activity.id));
    if (next) take(next);
  }
  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (used.has(item.activity.id) || usedInterests.has(item.matchedInterests[0] ?? '')) continue;
    take(item);
  }
  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (used.has(item.activity.id)) continue;
    take(item);
  }
  return picked.slice(0, limit);
}

/**
 * Personalized directory picks from the public canonical listings.
 * Listed and verified rows are eligible. Hidden, stale, pending, cancelled,
 * and duplicate aliases are not, because those never reach this list as public.
 */
export function recommendDirectoryByInterests(
  activities: Activity[],
  savedInterests: unknown,
  campusId: string,
  now = new Date(),
  limit = 6,
): InterestRecommendation[] {
  const raw = Array.isArray(savedInterests) ? savedInterests : [];
  const interests = raw.flatMap((value) => {
    if (typeof value !== 'string') return [];
    const described = savedInterest(value);
    return described ? [described] : [];
  });
  if (!interests.length || !Number.isFinite(now.getTime()) || !Number.isFinite(limit) || limit <= 0) return [];

  const seen = new Set<string>();
  const ranked = activities.flatMap((activity): InterestRecommendation[] => {
    if (seen.has(activity.id)) return [];
    seen.add(activity.id);
    if (activity.campus_id !== campusId) return [];
    if (!PUBLIC_RECOMMENDATION_STATUSES.has(activity.status)) return [];
    if (!current(activity, now.getTime())) return [];

    const text = recommendationText(activity);
    const careerCategory = activity.categories.some((category) => CAREER_CATEGORIES.has(category.toLowerCase()));
    const careerPhrase = text.includes(tokens('career'))
      || text.includes(tokens('careers'))
      || text.includes(tokens('job fair'));
    const matches = interests.flatMap((interest) => {
      const strongHits = interest.strong.filter((word) => text.includes(tokens(word))).length;
      const weakHits = interest.weak.filter((word) => text.includes(tokens(word))).length;
      const categoryHit = interest.categories.some((category) =>
        activity.categories.some((value) => value.toLowerCase() === category.toLowerCase())) ? 1 : 0;
      const incidentalCareer = interest.id !== 'career'
        && (careerCategory || (careerPhrase && categoryHit === 0 && strongHits < 2));
      if (incidentalCareer) return [];
      const matchScore = strongHits * 3 + categoryHit * 4 + weakHits;
      if (matchScore < MEANINGFUL_MATCH_SCORE) return [];
      return [{ ...interest, matchScore, strongHits }];
    }).sort((a, b) => b.matchScore - a.matchScore || b.strongHits - a.strongHits || a.label.localeCompare(b.label));
    if (!matches.length) return [];

    const strongest = matches[0];
    const upcoming = Boolean(activity.starts_at);
    return [{
      activity,
      score: strongest.matchScore + (upcoming ? 0.2 : 0),
      matchedInterests: [strongest.label],
      matchedDetails: [],
      reason: `Because you’re interested in “${strongest.label}”`,
    }];
  }).sort((a, b) => b.score - a.score
    || (a.activity.starts_at ? Date.parse(a.activity.starts_at) : Infinity) - (b.activity.starts_at ? Date.parse(b.activity.starts_at) : Infinity)
    || a.activity.name.localeCompare(b.activity.name)
    || a.activity.id.localeCompare(b.activity.id));

  const uniqueNames: InterestRecommendation[] = [];
  const names = new Set<string>();
  for (const item of ranked) {
    const nameKey = item.activity.name.trim().toLowerCase();
    if (names.has(nameKey)) continue;
    names.add(nameKey);
    uniqueNames.push(item);
  }

  return mixRecommendations(uniqueNames, Math.floor(limit));
}
