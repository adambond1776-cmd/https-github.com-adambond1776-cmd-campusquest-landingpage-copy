import uri from '../assets/pathways/uri.json';
import { WORKING_WORDS } from './types';
import type { PathwayEntry, PathwaySet, WorkingWord } from './types';

export const MIN_VERIFIED_PER_WORKING_WORD = 3;

const CAMPUSES: Record<string, PathwaySet> = {
  uri: uri as unknown as PathwaySet,
};

export function pathwaySet(campusId: string): PathwaySet {
  const set = CAMPUSES[campusId];
  if (!set) throw new Error(`No pathway set for campus "${campusId}".`);
  return set;
}

export function availableCampuses(): { id: string; name: string }[] {
  return Object.values(CAMPUSES).map((set) => ({ id: set.campus_id, name: set.campus_name }));
}

/**
 * Verified rows for a working word on a campus.
 *
 * Only `verified: true` rows are ever shown to a student or sent to Engine 2. An
 * unverified row is how a club that folded last spring ends up recommended to a
 * freshman.
 */
export function verifiedPathwaysFor(campusId: string, workingWord: WorkingWord): PathwayEntry[] {
  return pathwaySet(campusId).entries.filter(
    (entry) => entry.verified && entry.working_words.includes(workingWord)
  );
}

export type CoverageRow = {
  workingWord: WorkingWord;
  verifiedCount: number;
  meetsGate: boolean;
};

export type CoverageReport = {
  campusId: string;
  campusName: string;
  lastVerified: string;
  rows: CoverageRow[];
  /** Working words that would leave a student on an empty page. */
  blockedWords: WorkingWord[];
  passes: boolean;
};

/**
 * Coverage gate: every working word needs at least three verified entries before
 * a cohort runs.
 *
 * A student who returns PROTECTOR and lands on an empty page has had a worse
 * experience than if they had never taken the form, so this blocks launch rather
 * than warning about it. The admin view surfaces the report.
 */
export function coverageReport(campusId: string): CoverageReport {
  const set = pathwaySet(campusId);

  const rows: CoverageRow[] = WORKING_WORDS.map((workingWord) => {
    const verifiedCount = set.entries.filter(
      (entry) => entry.verified && entry.working_words.includes(workingWord)
    ).length;
    return {
      workingWord,
      verifiedCount,
      meetsGate: verifiedCount >= MIN_VERIFIED_PER_WORKING_WORD,
    };
  });

  const blockedWords = rows.filter((row) => !row.meetsGate).map((row) => row.workingWord);

  return {
    campusId: set.campus_id,
    campusName: set.campus_name,
    lastVerified: set.last_verified,
    rows,
    blockedWords,
    passes: blockedWords.length === 0,
  };
}

/**
 * Whether Engine 2 may run for this student.
 *
 * Adam's call is to leave Engine 2 off until coverage is there. The gate is per
 * working word rather than per campus so that turning it on does not have to be
 * all-or-nothing later: BUILDER already has four verified rows, and the moment a
 * word clears three it can start recommending without waiting for the rest.
 */
export function engine2Enabled(campusId: string, workingWord: WorkingWord): boolean {
  return verifiedPathwaysFor(campusId, workingWord).length >= MIN_VERIFIED_PER_WORKING_WORD;
}
