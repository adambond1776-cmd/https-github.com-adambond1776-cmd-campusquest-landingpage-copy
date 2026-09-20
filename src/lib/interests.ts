/**
 * Stable IDs keep saved choices independent of display copy. No model calls,
 * new database tables or sensitive-identity inference are needed for this.
 */
export const INTEREST_OPTIONS = [
  { id: 'music', label: 'Music & concerts', group: 'Creative expression', details: ['Live music', 'Singing', 'Making music'] },
  { id: 'performance', label: 'Dance & theater', group: 'Creative expression', details: ['Dance', 'Theater', 'Comedy'] },
  { id: 'arts', label: 'Art, photography & film', group: 'Creative expression', details: ['Photography', 'Film', 'Art & design', 'Writing'] },
  { id: 'gaming', label: 'Gaming, anime & tabletop', group: 'Play & competition', details: ['Video games', 'Anime', 'Board games', 'Chess'] },
  { id: 'play-sports', label: 'Playing sports', group: 'Play & competition', details: ['Team sports', 'Individual sports', 'Recreational sports'] },
  { id: 'watch-sports', label: 'Watching sports', group: 'Play & competition', details: ['Basketball', 'Football', 'Soccer', 'Hockey'] },
  { id: 'wellbeing', label: 'Fitness & wellbeing', group: 'Wellbeing & exploration', details: ['Fitness', 'Yoga', 'Wellbeing'] },
  { id: 'outdoors', label: 'Outdoors & nature', group: 'Wellbeing & exploration', details: ['Hiking', 'Nature & wildlife', 'Water activities'] },
  { id: 'travel', label: 'Travel & local exploration', group: 'Wellbeing & exploration', details: ['Study abroad', 'Local trips', 'Travel'] },
  { id: 'academic', label: 'Academic interests & study groups', group: 'Learning & opportunity', details: [] },
  { id: 'technology', label: 'Science, technology & making', group: 'Learning & opportunity', details: ['Coding', 'Engineering & robotics', 'Science'] },
  { id: 'career', label: 'Careers, business & entrepreneurship', group: 'Learning & opportunity', details: ['Careers', 'Business', 'Entrepreneurship'] },
  { id: 'service', label: 'Volunteering & service', group: 'Purpose & participation', details: [] },
  { id: 'leadership', label: 'Leadership, advocacy & civic involvement', group: 'Purpose & participation', details: ['Leadership', 'Advocacy', 'Civic involvement'] },
  { id: 'environment', label: 'Environment & sustainability', group: 'Purpose & participation', details: [] },
  { id: 'culture', label: 'Culture, languages & international activities', group: 'People & community', details: ['Languages', 'Cultural activities', 'International community'] },
  { id: 'faith', label: 'Faith & spirituality', group: 'People & community', details: [] },
  { id: 'social', label: 'Social meetups, hobbies & campus traditions', group: 'People & community', details: ['Social meetups', 'Food & crafts', 'Campus traditions'] },
] as const;

export type InterestId = (typeof INTEREST_OPTIONS)[number]['id'];
export type Interest = (typeof INTEREST_OPTIONS)[number]['label'];
export const INTERESTS: Interest[] = INTEREST_OPTIONS.map((option) => option.label);
export const INTEREST_GROUPS = [...new Set(INTEREST_OPTIONS.map((option) => option.group))];
export const PRIORITIES = [
  { value: 3, label: 'Prioritize this' },
  { value: 2, label: 'Interested' },
  { value: 1, label: 'Curious to try' },
] as const;
export type InterestSelection = { id: InterestId; priority: 1 | 2 | 3; details: string[] };
export type InterestProfile = { version: 1; selections: InterestSelection[] };
export type InterestSaveResult =
  | { ok: true; interests: Interest[]; profile: InterestProfile }
  | { ok: false; message: string };

const LEGACY: Record<string, InterestId[]> = {
  Music: ['music'], Theater: ['performance'], 'Music & Performance': ['music', 'performance'],
  Art: ['arts'], Photography: ['arts'], 'Arts & Photography': ['arts'],
  Sports: ['play-sports', 'watch-sports'], Volunteering: ['service'], Gaming: ['gaming'],
  Academic: ['academic'], Social: ['social'], Outdoors: ['outdoors'], Tech: ['technology'], Travel: ['travel'],
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function interestOption(id: string) {
  return INTEREST_OPTIONS.find((option) => option.id === id);
}

function idsFor(value: unknown): InterestId[] {
  if (typeof value !== 'string') return [];
  const option = INTEREST_OPTIONS.find((option) => option.label === value || option.id === value);
  if (option) return [option.id];
  return Object.hasOwn(LEGACY, value) ? LEGACY[value] : [];
}

export function interestLabels(profile: InterestProfile): Interest[] {
  return profile.selections.map((selection) => interestOption(selection.id)!.label);
}

/** Tolerant reads migrate old labels but never invent priority or identity. */
export function normalizeInterestProfile(value: unknown, legacy?: unknown): InterestProfile {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.selections)) {
    const selected = new Set(Array.isArray(legacy) ? legacy.flatMap(idsFor) : []);
    return { version: 1, selections: INTEREST_OPTIONS.filter((option) => selected.has(option.id))
      .map((option) => ({ id: option.id, priority: 2, details: [] })) };
  }
  const selections: InterestSelection[] = [];
  for (const option of INTEREST_OPTIONS) {
    const raw = value.selections.find((item: unknown) => record(item) && item.id === option.id);
    if (!record(raw)) continue;
    selections.push({
      id: option.id,
      priority: raw.priority === 1 || raw.priority === 3 ? raw.priority : 2,
      details: (option.details as readonly string[]).filter((detail) =>
        Array.isArray(raw.details) && raw.details.includes(detail)),
    });
  }
  return { version: 1, selections };
}

export function normalizeInterests(value: unknown): Interest[] {
  return interestLabels(normalizeInterestProfile(undefined, value));
}

/** Strict writes reject arbitrary fields and oversized/invalid selections. */
export function validateInterestProfile(value: unknown): InterestSaveResult {
  const invalid = { ok: false as const, message: 'Choose valid interests and one of the three priority levels.' };
  if (!record(value) || value.version !== 1 || !Array.isArray(value.selections)
    || value.selections.length > INTEREST_OPTIONS.length
    || Object.keys(value).some((key) => !['version', 'selections'].includes(key))) return invalid;
  const seen = new Set<string>();
  for (const item of value.selections) {
    if (!record(item) || typeof item.id !== 'string') return invalid;
    const option = interestOption(item.id);
    if (!option || seen.has(item.id) || ![1, 2, 3].includes(item.priority as number)
      || !Array.isArray(item.details) || item.details.length > option.details.length
      || item.details.some((detail) => typeof detail !== 'string' || !(option.details as readonly string[]).includes(detail))
      || Object.keys(item).some((key) => !['id', 'priority', 'details'].includes(key))) return invalid;
    seen.add(item.id);
  }
  const profile = normalizeInterestProfile(value);
  return { ok: true, interests: interestLabels(profile), profile };
}

/** Compatibility with the existing signup payload and old clients. */
export function validateInterests(value: unknown): InterestSaveResult {
  if (!Array.isArray(value) || value.length > 18 || value.some((item) => idsFor(item).length === 0)) {
    return { ok: false, message: 'Choose interests from the available options.' };
  }
  const profile = normalizeInterestProfile(undefined, value);
  return { ok: true, interests: interestLabels(profile), profile };
}
