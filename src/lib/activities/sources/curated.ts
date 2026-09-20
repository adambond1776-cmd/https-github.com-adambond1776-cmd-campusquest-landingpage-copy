/**
 * The hand-compiled club directory, applied as a verification overlay.
 *
 * The Engage feed knows which organizations are *registered*. This list is the
 * human judgement about which ones are actually running this year, which is a
 * different and more valuable fact. So it does not create a parallel set of
 * rows — it reaches into the ingested ones and promotes the matches to
 * `verified`, which is the status that makes a row eligible to be recommended.
 *
 * Registered organizations absent from this list are left at `listed`, not
 * hidden. Not being on a hand-compiled list is not evidence a club is dead; it
 * is only an absence of evidence that it is alive.
 */

import type { Activity, ActivityDraft } from '@/lib/activities/types';
import uriClubs from '@/lib/activities/data/uri-clubs-2026-27.json';

export type CuratedClub = {
  category: string;
  name: string;
  description: string;
};

export type CuratedDirectory = {
  campus_id: string;
  academic_year: string;
  source: string;
  compiled: string;
  count: number;
  clubs: CuratedClub[];
};

export const CURATED_DIRECTORIES: Record<string, CuratedDirectory> = {
  uri: uriClubs as CuratedDirectory,
};

/**
 * Reduce a club name to something two sources can agree on.
 *
 * Every rewrite here is a mechanical equivalence — an ampersand for the word
 * "and", a plural for a singular, a spelled-out number for a digit. None of
 * them is a similarity judgement, and that restraint is the point. Running a
 * fuzzy matcher over this data pairs the African Student Association with the
 * Asian Student Association, Cricket Club with Crochet Club, and Golf Club with
 * Geology Club. Those are not near misses to be tuned away; they are the reason
 * approximate matching has no place here. A row we verify is one we are willing
 * to recommend to a first-year, so an unmatched real club is a much cheaper
 * mistake than a confidently wrong one.
 */
const GENERIC_TAIL = /\b(club|association|society|organization|organisation)\b\s*$/;

const NUMBER_WORDS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
};

export function normalizeName(name: string): string {
  let out = name
    // Parentheticals are acronyms or registrar labels, never distinguishing.
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(?:the\s+)?university of rhode island\b/g, ' ')
    .replace(/\bof uri\b/g, ' ')
    .replace(/\buri\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  out = out
    .split(' ')
    .map((word) => NUMBER_WORDS[word] ?? word)
    // Fold plurals so "Economics Students Association" meets "Economic Student
    // Association". Both sides get the same treatment, so this cannot make two
    // genuinely different names collide that were not already one letter apart.
    .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
    .join(' ')
    .trim();

  // One trailing generic noun only. "Chamber Music" should meet "URI Chamber
  // Music Club", but stripping repeatedly would turn distinct names to mush.
  return out.replace(GENERIC_TAIL, '').trim() || out;
}

/**
 * Names the two sources genuinely disagree on, resolved by hand.
 *
 * Only for cases where no mechanical rule connects them and a person has
 * confirmed they are the same club. Keys and values are both normalized.
 */
export const NAME_ALIASES: Record<string, Record<string, string>> = {
  uri: {
    'african student': 'african student',
    wriu: 'wriu 90 3 fm radio',
    'national marrow donor program': 'nmdp',
    'national organization for rare disorder': 'nord student for rare',
    'influence campu ministrie': 'influence campu ministry',
    'sankofa campu ministry': 'sankofa christian ministry',
  },
};

/** Any acronym the list gives us in brackets, as a second way in. */
export function acronymsIn(name: string): string[] {
  return [...name.matchAll(/\(([A-Z][A-Za-z0-9&.\- ]{1,18})\)/g)]
    .map((match) => normalizeName(match[1]))
    .filter(Boolean);
}

type Keyed = { club: CuratedClub; keys: string[] };

function index(directory: CuratedDirectory): Keyed[] {
  const aliases = NAME_ALIASES[directory.campus_id] ?? {};

  return directory.clubs.map((club) => {
    const primary = normalizeName(club.name);
    const alias = aliases[primary];

    return {
      club,
      keys: [primary, alias, ...acronymsIn(club.name)].filter(
        (key): key is string => Boolean(key)
      ),
    };
  });
}

export type OverlayResult = {
  /** Ingested rows promoted to verified, with curated copy applied. */
  verified: Activity[];
  /** Clubs on the list that no feed knows about, added as curated rows. */
  added: ActivityDraft[];
  /** Registered organizations the list does not confirm. Left alone. */
  unconfirmed: number;
  /**
   * Curated clubs that matched nothing, with the registered names they share
   * the most words with.
   *
   * Surfaced rather than guessed at. Every one is either a club the feed really
   * does not carry or a name variation worth an alias, and a person can tell
   * those apart in seconds where a similarity score cannot.
   */
  review: { club: string; candidates: string[] }[];
};

/** Word overlap, only ever used to suggest a candidate to a human. */
function candidatesFor(name: string, pool: Map<string, string>): string[] {
  const words = new Set(normalizeName(name).split(' ').filter((w) => w.length > 3));
  if (words.size === 0) return [];

  return [...pool.entries()]
    .map(([key, display]) => {
      const other = key.split(' ').filter((w) => w.length > 3);
      const shared = other.filter((word) => words.has(word)).length;
      return { display, score: shared / Math.max(words.size, other.length || 1) };
    })
    .filter((entry) => entry.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((entry) => entry.display);
}

/**
 * Apply the overlay to whatever the feeds returned.
 *
 * Matching is exact on the normalized name or on a bracketed acronym. A fuzzy
 * match is deliberately not attempted: silently verifying the wrong club is
 * worse than leaving a real one unverified, because a verified row is one we
 * are willing to recommend to a first-year.
 */
export function applyOverlay(
  existing: Activity[],
  directory: CuratedDirectory,
  now: Date = new Date()
): OverlayResult {
  const iso = now.toISOString();
  const verifiedBy = `directory-${directory.academic_year}`;
  const entries = index(directory);

  const byKey = new Map<string, Keyed>();
  for (const entry of entries) {
    for (const key of entry.keys) if (!byKey.has(key)) byKey.set(key, entry);
  }

  const organizations = existing.filter((row) => row.kind === 'organization');
  const matched = new Set<CuratedClub>();
  const verified: Activity[] = [];

  for (const row of organizations) {
    const hit = byKey.get(normalizeName(row.name));
    if (!hit) continue;

    matched.add(hit.club);

    verified.push({
      ...row,
      // An operator's decision to hide a row outranks the list.
      status: row.status === 'hidden' ? 'hidden' : 'verified',
      verified_at: iso,
      verified_by: verifiedBy,
      // The hand-written description is better than the pasted Engage blurb,
      // and the categories are consistent across the whole list.
      summary: hit.club.description || row.summary,
      categories: [hit.club.category, ...row.categories.filter((c) => c !== hit.club.category)],
    });
  }

  const unmatchedRows = new Map<string, string>();
  for (const row of organizations) {
    if (!verified.some((v) => v.id === row.id)) unmatchedRows.set(normalizeName(row.name), row.name);
  }

  const review = entries
    .filter((entry) => !matched.has(entry.club))
    .map((entry) => ({
      club: entry.club.name,
      candidates: candidatesFor(entry.club.name, unmatchedRows),
    }))
    .filter((entry) => entry.candidates.length > 0);

  const added: ActivityDraft[] = entries
    .filter((entry) => !matched.has(entry.club))
    .map((entry) => ({
      id: `curated:${directory.campus_id}:${normalizeName(entry.club.name).replace(/ /g, '-')}`,
      campus_id: directory.campus_id,
      kind: 'organization' as const,
      name: entry.club.name,
      summary: entry.club.description,
      categories: [entry.club.category],
      scope: 'on_campus' as const,
      location: null,
      url: null,
      image_url: null,
      starts_at: null,
      ends_at: null,
      all_day: false,
      athletics: null,
      source: 'curated' as const,
      source_ref: normalizeName(entry.club.name),
      verified_by: `directory-${directory.academic_year}`,
    }));

  return {
    verified,
    added,
    unconfirmed: organizations.length - verified.length,
    review,
  };
}
