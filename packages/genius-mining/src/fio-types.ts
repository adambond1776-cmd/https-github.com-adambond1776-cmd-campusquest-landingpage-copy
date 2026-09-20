/**
 * Figuring It Out — data shapes.
 *
 * These mirror `assets/fio_output_contract.schema.json`. The schema file is the
 * authority; when it disagrees with these types, the schema wins and these types
 * are the bug. Same rule as `types.ts`.
 *
 * FIO is the second half of the read: Call 1 finds the ROLE, Call 2 finds the
 * SUBJECT MATTER. They are separate calls because Analysis Prompt v1.2 discards
 * subject matter on purpose, and FIO needs exactly what it discards.
 */

export const DOMAIN_FAMILIES = [
  'MECHANICAL_SYSTEMS',
  'DIGITAL_SOFTWARE',
  'BUILT_ENVIRONMENT',
  'LAND_ANIMALS_NATURE',
  'HEALTH_BODY',
  'COMMERCE_MONEY',
  'FOOD',
  'MEDIA_STORYTELLING',
  'VISUAL_DESIGN',
  'MUSIC_PERFORMANCE',
  'LANGUAGE_TEXT',
  'COMMUNITY_SERVICE',
  'EDUCATION_YOUTH',
  'SPORT_COMPETITION',
  'LOGISTICS_OPERATIONS',
  'SAFETY_ORDER',
] as const;

export type DomainFamily = (typeof DOMAIN_FAMILIES)[number];

/**
 * The sixteen are a join key to the CIP pathways table, not a vocabulary that
 * can drift. A seventeenth family invalidates every FIO profile produced before
 * it, because the join silently stops covering the same ground.
 */
export type DomainWeight = 'PRIMARY' | 'SECONDARY' | 'TRACE';

export type DomainRead = {
  domain_family: DomainFamily;
  /** The student's own words, quoted. Never a summary — a mentor reads this aloud. */
  raw_subject: string;
  source_items: string[];
  weight: DomainWeight;
};

/** The keys the FIO call is asked to return. Everything else is stamped by the host. */
export type FioAnalysisResult = {
  domains: DomainRead[];
  domain_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  domain_evidence_thin: boolean;
  thin_reason: string;
  spectator_only: string[];
  for_the_mentor: string;
};

export type FioResult = FioAnalysisResult & {
  participant_code: string;
  instrument_version: string;
  fio_engine_version: string;
  model: string;
  run_at: string;
  /** Copied from the Call 1 profile. Never re-derived here. */
  working_word_ref?: string;
  cip_matches?: CipMatch[];
  status: 'draft' | 'returned_to_student' | 'edited' | 'accepted' | 'filed';
  student_edits?: Record<string, unknown>[];
};

/**
 * One CIP pathways row.
 *
 * `road` is what ties this table back to the book's four roads. Every row is
 * exactly one of college, trade or work — "figuring it out" is the state the
 * student is in, not a destination, so it is not a road value.
 */
export type Road = 'college' | 'trade' | 'work';

export type CipPathwayEntry = {
  id: string;
  working_words: string[];
  domain_families: DomainFamily[];
  /** Internal join key and institutional reconciliation field. Never shown to a student. */
  cip_code: string;
  cip_title: string;
  student_facing_label: string;
  road: Road;
  typical_credential: string;
  why_this_fits: string;
  first_step: string;
  verified: boolean;
  source: string;
};

export type CipPathwaySet = {
  table_id: string;
  cip_edition: string;
  last_verified: string;
  entries: CipPathwayEntry[];
};

export type CipMatch = {
  id: string;
  cip_code: string;
  cip_title: string;
  student_facing_label: string;
  road: Road;
  typical_credential: string;
  why_this_fits: string;
  first_step: string;
};

