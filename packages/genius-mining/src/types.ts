/**
 * Genius Mining — data shapes.
 *
 * These mirror `assets/questionnaire_schema_v1_3.json` and
 * `assets/profile_output_contract.schema.json`. The schema files are the
 * authority; when they disagree with these types, the schema wins and these
 * types are the bug.
 */

export const VERBS = [
  'EXPLAINED',
  'BUILT',
  'SORTED',
  'NOTICED',
  'CONNECTED',
  'REPAIRED',
  'PROTECTED',
  'PERFORMED',
] as const;

export type Verb = (typeof VERBS)[number];

export const WORKING_WORDS = [
  'TEACHER',
  'BUILDER',
  'ORGANIZER',
  'ANALYST',
  'CONNECTOR',
  'FIXER',
  'PROTECTOR',
  'PERFORMER',
] as const;

export type WorkingWord = (typeof WORKING_WORDS)[number];

/**
 * One Section B tag, bound to the A1 instance it describes.
 *
 * The binding is the point. A flat `Verb[]` or a `{ BUILT: 2 }` tally both
 * discard the index, and D1's tiebreak reads the index.
 */
export type VerbTag = {
  instance: number;
  verb: Verb;
};

export type A1Instance = {
  index: number;
  text: string;
};

export type A4Entry = {
  activity: string;
  mode: 'do' | 'watch';
  social: 'alone' | 'few friends' | 'crowd';
  setting: 'indoors' | 'outside';
};

export type E3Response = {
  answer: 'YES' | 'NO';
  which_question?: string | null;
};

/**
 * Everything a student wrote, as stored.
 *
 * `name` is present here only because the header block collects it. It is
 * stripped by `buildEnginePayload` and never reaches a model.
 */
export type QuestionnaireResponses = {
  participant_code: string;
  instrument_version: string;
  name?: string | null;
  date?: string | null;

  A1: A1Instance[];
  A2: string;
  A3: string;
  A4?: A4Entry[];
  A4_consent?: boolean;

  B: VerbTag[];

  C1: number[];
  C2: string;
  C3: string;

  D1: Verb | null;
  D2: WorkingWord | null;
  D3: string;

  E1?: string;
  E2?: string;
  E3?: E3Response | null;
};

export type D1ResolutionKind = 'modal' | 'tie_broken_by_C1' | 'UNRESOLVED';

export type D1Resolution = {
  computed_verb: Verb | null;
  resolution: D1ResolutionKind;
  candidates?: Verb[];
  /** Only set when `resolution` is UNRESOLVED and the student picked. */
  student_tiebreak_choice?: Verb | null;
};

export type ProfileStatus = 'draft' | 'returned_to_student' | 'edited' | 'accepted' | 'filed';

export type MembershipStatus = 'active' | 'lapsed' | 'cancelled' | 'purged';

export type RetentionState = {
  membership_status: MembershipStatus;
  lapsed_at: string | null;
  purge_due_at: string | null;
  warning_7_sent_at: string | null;
  warning_25_sent_at: string | null;
  deidentified_copy_retained: boolean;
};

/** What Engine 1 returns, before the host stamps provenance onto it. */
export type AnalysisResult = {
  primary_working_word: WorkingWord;
  evidence: string;
  secondary_pattern: { word: WorkingWord | null; note: string };
  disagreement_with_self_tally: { value: boolean; reason: string };
  body_signal_read: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  thin_spots: string[];
  for_the_mentor: string;
};

export type RecommendationItem = {
  activity_id: string;
  why_this_fits: string;
  first_step: string;
};

export type CrossOver = {
  found: boolean;
  headline?: string | null;
  body?: string | null;
  interest_used?: string | null;
};

export type Recommendations = {
  items: RecommendationItem[];
  cross_over: CrossOver;
  gap_noted?: string | null;
  engine_version?: string;
  run_at?: string;
};

export type StudentEdit = {
  field: string;
  original: string;
  revised: string;
  edited_at: string;
};

export type Profile = AnalysisResult & {
  participant_code: string;
  instrument_version: string;
  engine_version: string;
  model: string;
  run_at: string;
  status: ProfileStatus;
  d1_resolution?: D1Resolution;
  recommendations?: Recommendations;
  student_edits?: StudentEdit[];
  retention?: Partial<RetentionState>;
};

export type PathwayEntry = {
  id: string;
  working_words: WorkingWord[];
  scope: string;
  name: string;
  location: string;
  category: string;
  what_it_is: string;
  how_to_join: string;
  low_commitment_entry: boolean | null;
  fills_gap?: string;
  /** Phase 2 groundwork. Never shown to a Phase 1 student. */
  adjacent_fields: string[];
  verified: boolean;
  source: string;
};

export type PathwaySet = {
  campus_id: string;
  campus_name: string;
  last_verified: string;
  source: string;
  entries: PathwayEntry[];
};
