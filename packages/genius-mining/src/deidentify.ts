import type {
  D1Resolution,
  QuestionnaireResponses,
  WorkingWord,
} from './types';

/**
 * How much of a response set survives into the instrument-development corpus.
 *
 * `structured` keeps the countable parts — verb tags, the C1 picks, how D1
 * resolved, how long each answer was — and drops every word the student wrote.
 * `full` additionally keeps the free text.
 *
 * At pilot scale only `structured` is honest. A student who writes two hundred
 * words about the night their team fell apart is identifiable to anyone on that
 * campus who was there, no matter what the key on the row is, and the consent
 * screen calls this corpus anonymous. Removing a name from a story is not the
 * same as anonymising it. Structured fields have no such problem: `["notice",
 * "steady", "notice"]` describes hundreds of people.
 */
export type CorpusMode = 'structured' | 'full';

/**
 * Cohort size at which free text stops pointing at one identifiable person.
 *
 * Not a magic number and not a k-anonymity proof — it is the point at which a
 * narrative stops being traceable by elimination within a campus. Revisit it
 * with whoever reviews the study rather than raising it here because a model
 * would like more text to learn from.
 */
export const CORPUS_FREE_TEXT_MIN_COHORT = 500;

export function corpusModeFor(cohortSize: number): CorpusMode {
  return cohortSize >= CORPUS_FREE_TEXT_MIN_COHORT ? 'full' : 'structured';
}

/** The free text a student writes, kept only once the cohort is large enough. */
export type CorpusFreeText = {
  A1: { index: number; text: string }[];
  A2: string;
  A3: string;
  C2: string;
  C3: string;
  D3: string;
  E1?: string;
};

/**
 * A response set stripped of everything that points back at a person, ready for
 * the instrument-development corpus.
 *
 * The corpus outlives the student's account on purpose — the consent copy says
 * so plainly, and it says so because it is true. What makes that defensible is
 * that the record genuinely cannot be walked back to them, so this shape carries
 * a fresh random `corpus_id` and not the participant code. The participant code
 * is the join key to the student's account row; keeping it would make the corpus
 * pseudonymous while the consent screen calls it anonymous.
 */
export type CorpusRecord = {
  corpus_id: string;
  mode: CorpusMode;
  instrument_version: string;

  /** How many moments the student produced, out of the three the form asks for. */
  A1_count: number;

  /**
   * Character counts per free-text field.
   *
   * This is what most of the instrument questions actually need answering — does
   * a thin C3 predict a LOW confidence, does A2 length fall off across sittings
   * — and none of it carries a word the student wrote.
   */
  lengths: {
    A1: number[];
    A2: number;
    A3: number;
    C2: number;
    C3: number;
    D3: number;
    E1: number;
  };

  /** A4 keeps its three tags. The activity free text is dropped in both modes. */
  A4_tags: { mode: string; social: string; setting: string }[];
  B: { instance: number; verb: string }[];
  C1: number[];
  D1: string | null;
  D2: string | null;

  primary_working_word: WorkingWord;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  d1_resolution: D1Resolution;
  thin_spots: string[];

  /** Present only in `full` mode. */
  text?: CorpusFreeText;
};

export class DeidentificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeidentificationError';
  }
}

/**
 * Field ids that must not survive into the corpus, in either mode.
 *
 * E2 is the student admitting what they skipped or fudged, and E3 is what they
 * had never said out loud. Neither is identifying on its own, but E3 is the
 * reason the support-resources block is not optional, and it is not the kind of
 * thing to keep in a corpus that outlives consent.
 */
const DROPPED_FIELDS = ['name', 'date', 'participant_code', 'A4', 'A4_consent', 'E2', 'E3'];

function randomCorpusId(): string {
  return `gmc_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
}

export type DeidentifyInput = {
  responses: QuestionnaireResponses;
  primaryWorkingWord: WorkingWord;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  d1Resolution: D1Resolution;
  thinSpots: string[];
  /**
   * Defaults to `structured`, which is the safe answer. A caller wanting free
   * text has to say so, and should have consulted `corpusModeFor` first.
   */
  mode?: CorpusMode;
};

/**
 * Builds the corpus record. Throws rather than returning a partial one.
 *
 * The caller must treat a throw as "do not purge, alert a human". Losing the
 * corpus copy is worse than a late deletion, so a failure here has to stop the
 * purge rather than be swallowed and retried on a schedule nobody is watching.
 */
export function deidentify(input: DeidentifyInput): CorpusRecord {
  const { responses, primaryWorkingWord, confidence, d1Resolution, thinSpots } = input;
  const mode = input.mode ?? 'structured';

  if (!responses.A1?.length || !responses.C3) {
    throw new DeidentificationError(
      'Response set is missing A1 or C3; refusing to write a corpus record that cannot inform the instrument.'
    );
  }

  const record: CorpusRecord = {
    corpus_id: randomCorpusId(),
    mode,
    instrument_version: responses.instrument_version,
    A1_count: responses.A1.length,
    lengths: {
      A1: responses.A1.map((item) => item.text.length),
      A2: responses.A2?.length ?? 0,
      A3: responses.A3?.length ?? 0,
      C2: responses.C2?.length ?? 0,
      C3: responses.C3.length,
      D3: responses.D3?.length ?? 0,
      E1: responses.E1?.length ?? 0,
    },
    A4_tags: (responses.A4 ?? []).map((entry) => ({
      mode: entry.mode,
      social: entry.social,
      setting: entry.setting,
    })),
    B: responses.B.map((tag) => ({ instance: tag.instance, verb: tag.verb })),
    C1: responses.C1,
    D1: responses.D1 ?? null,
    D2: responses.D2 ?? null,
    primary_working_word: primaryWorkingWord,
    confidence,
    d1_resolution: d1Resolution,
    thin_spots: thinSpots,
  };

  if (mode === 'full') {
    record.text = {
      A1: responses.A1.map((item) => ({ index: item.index, text: item.text })),
      A2: responses.A2,
      A3: responses.A3,
      C2: responses.C2,
      C3: responses.C3,
      D3: responses.D3,
      E1: responses.E1,
    };
  }

  assertDeidentified(record);
  return record;
}

/** Verifies the corpus record before it is written. */
export function assertDeidentified(record: CorpusRecord): void {
  const keys = Object.keys(record);
  for (const dropped of DROPPED_FIELDS) {
    if (keys.includes(dropped)) {
      throw new DeidentificationError(`\`${dropped}\` must not survive de-identification.`);
    }
  }

  if (!record.corpus_id.startsWith('gmc_')) {
    throw new DeidentificationError('Corpus record is missing its random corpus id.');
  }

  if (record.mode === 'structured' && record.text !== undefined) {
    throw new DeidentificationError(
      'A structured corpus record carried free text. That is the one thing this mode exists to prevent.'
    );
  }
}
