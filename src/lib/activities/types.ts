/**
 * The one activity model.
 *
 * Clubs, campus events, home games, facilities, and eventually places off
 * campus are all the same shape. Keeping them in one table rather than four is
 * the whole point: a student browsing "what is happening Thursday" does not
 * care that the hackathon came from the events calendar and the volleyball game
 * came from the athletics feed, and a recommendation engine that has to union
 * four schemas will drift out of sync with the directory within a semester.
 *
 * `working_words` is the join to Genius Mining. The pathway file that Engine 2
 * reads is a view over verified rows here, not a second copy of the data.
 */

/** Where a row came from. Every row has exactly one origin. */
export type SourceId =
  /** Posted by a club owner; independently reviewed before publication. */
  | 'club'
  /** The university events calendar. Localist, public read-only JSON API. */
  | 'localist'
  /** The student organization directory. Anthology Engage. */
  | 'engage'
  /** The athletics department schedule. Sidearm Sports, published iCal. */
  | 'athletics'
  /** Hand-entered and confirmed by a person. */
  | 'curated'
  /** Suggested by a student. Never public before review. */
  | 'submitted';

export type ActivityKind =
  | 'organization'
  | 'event'
  | 'game'
  | 'facility'
  | 'place';

/**
 * Publication state, which is mostly a statement about how much we trust the row.
 *
 * Stale rows are the thing that kills a campus directory. A student who shows up
 * to a club that folded last spring does not file a bug, they stop opening the
 * app. So ingested rows start at `listed`, a person moves them to `verified`,
 * and anything that stops appearing in its source decays to `stale` on its own
 * without waiting for someone to notice.
 */
export type ActivityStatus =
  /** Ingested from a source and not yet confirmed by a person. */
  | 'listed'
  /** A person checked it. Only these are eligible for recommendations. */
  | 'verified'
  /** Missing from its source for longer than the grace window. */
  | 'stale'
  /** Awaiting review. Never rendered publicly. */
  | 'pending'
  /** Withheld by an operator, or declined at review. */
  | 'hidden';

export type WorkingWord =
  | 'BUILDER'
  | 'FIXER'
  | 'ANALYST'
  | 'TEACHER'
  | 'CONNECTOR'
  | 'PERFORMER'
  | 'ORGANIZER'
  | 'CARETAKER';

export const WORKING_WORDS: WorkingWord[] = [
  'BUILDER',
  'FIXER',
  'ANALYST',
  'TEACHER',
  'CONNECTOR',
  'PERFORMER',
  'ORGANIZER',
  'CARETAKER',
];

/** Athletics-specific detail, present only on `game` rows. */
export type AthleticsDetail = {
  sport: string;
  /** Home games are the ones the athletics department wants seats filled at. */
  home: boolean;
  opponent: string | null;
  /** Sidearm marks finished games with a result prefix. */
  result: 'W' | 'L' | 'T' | null;
};

export type Activity = {
  /** Stable and source-prefixed, e.g. `athletics:uri:vcal_11981`. */
  id: string;
  campus_id: string;
  kind: ActivityKind;

  name: string;
  /** One or two sentences. What a student reads in the list. */
  summary: string | null;
  categories: string[];
  scope: 'on_campus' | 'off_campus';
  location: string | null;
  /** Always links back to the source, because our copy can be wrong. */
  url: string | null;
  image_url: string | null;

  /** ISO 8601. Null on organizations and facilities, which have no start time. */
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;

  athletics: AthleticsDetail | null;

  source: SourceId;
  /** The identifier the source uses, for re-matching on the next sync. */
  source_ref: string;
  first_seen: string;
  last_seen: string;

  status: ActivityStatus;
  verified_at: string | null;
  verified_by: string | null;

  /** Genius Mining tags. Empty until someone assigns them. */
  working_words: WorkingWord[];
  /**
   * Whether a nervous first-timer can turn up once without committing.
   * Null means nobody has judged it yet, which is different from false.
   */
  low_commitment_entry: boolean | null;
};

/** What an ingest adapter returns: everything except the bookkeeping. */
export type ActivityDraft = Omit<
  Activity,
  'first_seen' | 'last_seen' | 'status' | 'verified_at' | 'verified_by' | 'working_words' | 'low_commitment_entry'
> & {
  working_words?: WorkingWord[];
  low_commitment_entry?: boolean | null;
  /**
   * The adapter saw something that should stop this going public on its own,
   * such as a registrar note that the organization may no longer be recognised.
   */
  needs_review?: boolean;
  /**
   * Set when the row arrives already confirmed by a person, as the hand-compiled
   * directory does. Everything ingested from a feed leaves this unset.
   */
  verified_by?: string;
};

/**
 * How long a row can go missing from its source before it decays.
 *
 * Deliberately not one sync. Feeds hiccup, and demoting the entire directory
 * because a calendar returned a 502 once would be worse than the staleness it
 * guards against.
 */
export const STALE_AFTER_DAYS = 10;

/** Rows a signed-out visitor may see. */
export const PUBLIC_STATUSES: ActivityStatus[] = ['listed', 'verified'];

export function isPublic(activity: Activity): boolean {
  return PUBLIC_STATUSES.includes(activity.status);
}

/** Only human-confirmed rows are allowed to become recommendations. */
export function isRecommendable(activity: Activity): boolean {
  return activity.status === 'verified' && activity.working_words.length > 0;
}

export function sourceLabel(source: SourceId): string {
  switch (source) {
    case 'club':
      return 'Club-maintained · reviewed by CampusQuest';
    case 'localist':
      return 'University events calendar';
    case 'engage':
      return 'Student organization directory';
    case 'athletics':
      return 'Athletics department';
    case 'curated':
      return 'Confirmed by CampusQuest';
    case 'submitted':
      return 'Submitted by a student';
  }
}
