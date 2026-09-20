import cip from '../assets/pathways/cip.json';
import { WORKING_WORDS } from './types';
import type { WorkingWord } from './types';
import type { CipMatch, CipPathwayEntry, CipPathwaySet, DomainFamily, Road } from './fio-types';

/**
 * CIP pathways answer "which field of study, anywhere." Campus pathways answer
 * "which club, here." Same engine, different table, different buyer — which is
 * the licensing structure the engine spec already describes, expressed in code.
 */
export const ROADS: Road[] = ['college', 'trade', 'work'];

export const MIN_VERIFIED_CIP_PER_WORKING_WORD = 3;

const TABLE = cip as unknown as CipPathwaySet;

export function cipPathwaySet(): CipPathwaySet {
  return TABLE;
}

/**
 * Verified rows matching a working word AND a domain family.
 *
 * The join is on both. A row matching only the working word is the base
 * instrument's job, not FIO's — the whole point of the second call is that the
 * recommendation changes when the subject matter changes.
 */
export function verifiedCipFor(
  workingWord: WorkingWord,
  domainFamily: DomainFamily
): CipPathwayEntry[] {
  return TABLE.entries.filter(
    (entry) =>
      entry.verified &&
      entry.working_words.includes(workingWord) &&
      entry.domain_families.includes(domainFamily)
  );
}

/** The student-facing projection. The code and the official title are stripped out. */
export function toStudentFacing(entry: CipPathwayEntry): Omit<CipMatch, 'cip_code' | 'cip_title'> {
  return {
    id: entry.id,
    student_facing_label: entry.student_facing_label,
    road: entry.road,
    typical_credential: entry.typical_credential,
    why_this_fits: entry.why_this_fits,
    first_step: entry.first_step,
  };
}

/** The institution-facing projection. The codes are what they are paying for. */
export function toInstitutionFacing(entry: CipPathwayEntry): CipMatch {
  return {
    id: entry.id,
    cip_code: entry.cip_code,
    cip_title: entry.cip_title,
    student_facing_label: entry.student_facing_label,
    road: entry.road,
    typical_credential: entry.typical_credential,
    why_this_fits: entry.why_this_fits,
    first_step: entry.first_step,
  };
}

export type CipCoverageRow = {
  workingWord: WorkingWord;
  verifiedCount: number;
  roadsCovered: Road[];
  meetsGate: boolean;
};

export type CipCoverageReport = {
  cipEdition: string;
  lastVerified: string;
  rows: CipCoverageRow[];
  /** Working words that would leave a student on an empty or college-only page. */
  blocking: WorkingWord[];
  readyForCohort: boolean;
};

/**
 * The coverage gate, adapted from the campus resolver and tightened.
 *
 * No cohort runs until every working word has at least three verified rows AND
 * at least one row on each of the three roads. A student who returns PROTECTOR
 * and is shown only four-year degrees has been told something false about their
 * options — trade and work rows are not a lesser tier, and this is the check
 * that keeps that from being a slogan.
 */
export function cipCoverage(): CipCoverageReport {
  const rows: CipCoverageRow[] = WORKING_WORDS.map((workingWord) => {
    const entries = TABLE.entries.filter(
      (entry) => entry.verified && entry.working_words.includes(workingWord)
    );
    const roadsCovered = ROADS.filter((road) => entries.some((entry) => entry.road === road));

    return {
      workingWord,
      verifiedCount: entries.length,
      roadsCovered,
      meetsGate:
        entries.length >= MIN_VERIFIED_CIP_PER_WORKING_WORD &&
        roadsCovered.length === ROADS.length,
    };
  });

  const blocking = rows.filter((row) => !row.meetsGate).map((row) => row.workingWord);

  return {
    cipEdition: TABLE.cip_edition,
    lastVerified: TABLE.last_verified,
    rows,
    blocking,
    readyForCohort: blocking.length === 0 && !TABLE.cip_edition.includes('CONFIRM'),
  };
}

