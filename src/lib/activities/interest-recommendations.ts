import { interestOption, normalizeInterestProfile, type Interest, type InterestId } from '@/lib/interests';
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
  activity: Activity; matchedInterests: Interest[]; matchedDetails: string[]; score: number; reason: string;
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
