import { engineVisibleFieldIds, piiFieldIds } from './schema';
import { effectiveVerb, resolveD2 } from './resolve-d1';
import type {
  A4Entry,
  D1Resolution,
  PathwayEntry,
  QuestionnaireResponses,
  WorkingWord,
} from './types';

/**
 * Field ids Engine 2 must never see, on top of the `sent_to_engine` filter.
 *
 * C2 and C3 are body signals. E2 and E3 are what the student admits to skipping
 * and what they have never said out loud. Engine 1 gets that material and no A4;
 * Engine 2 gets A4 and a role and none of this. The whole point of running two
 * engines is that these two sets never sit in the same model context.
 */
const ENGINE_2_FORBIDDEN = ['C2', 'C3', 'E2', 'E3'] as const;

export type AnalysisPayload = Record<string, unknown>;

export class PayloadLeakError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadLeakError';
  }
}

/**
 * The Engine 1 payload: every field flagged `sent_to_engine`, and nothing else.
 *
 * The filter reads the flag off the instrument schema instead of a list written
 * out here, because a list written out here is a list that stops matching the
 * schema the first time a field is added.
 */
export function buildAnalysisPayload(
  responses: QuestionnaireResponses,
  d1Resolution: D1Resolution
): AnalysisPayload {
  const allowed = new Set(engineVisibleFieldIds());
  const payload: AnalysisPayload = {};

  for (const id of allowed) {
    const value = (responses as unknown as Record<string, unknown>)[id];
    if (value !== undefined) payload[id] = value;
  }

  // D1 and D2 are derived, so send what the resolution actually settled on
  // rather than whatever happens to be denormalized onto the response row.
  // On an UNRESOLVED tally that is the student's own tiebreak pick, and the
  // engine is told the tally was thin so it does not read the word as arithmetic.
  const verb = effectiveVerb(d1Resolution);
  payload.D1 = verb;
  payload.D2 = resolveD2(d1Resolution);
  payload.D1_resolution = d1Resolution.resolution;

  assertNoIdentifiers(payload);
  return payload;
}

export type RecommendationInputs = {
  workingWord: WorkingWord;
  d3Sentence: string;
  a4Entries: A4Entry[];
  pathways: PathwayEntry[];
};

/**
 * The Engine 2 payload. A4 reaches a *recommendation* engine and never an
 * *analysis* engine — the single narrow exception to "A4 never reaches an
 * engine", and narrow on purpose.
 *
 * Only verified pathway rows are passed. Engine 2 is instructed not to invent
 * activities, so passing an unverified row is how a folded club gets recommended.
 */
export function buildRecommendationInputs(
  workingWord: WorkingWord,
  responses: QuestionnaireResponses,
  pathways: PathwayEntry[]
): RecommendationInputs {
  const unverified = pathways.filter((entry) => !entry.verified);
  if (unverified.length > 0) {
    throw new PayloadLeakError(
      `Refusing to send unverified pathway rows to Engine 2: ${unverified
        .map((entry) => entry.id)
        .join(', ')}.`
    );
  }

  const inputs: RecommendationInputs = {
    workingWord,
    d3Sentence: responses.D3,
    a4Entries: responses.A4 ?? [],
    pathways,
  };

  const serialized = JSON.stringify(inputs);
  for (const id of ENGINE_2_FORBIDDEN) {
    if (serialized.includes(`"${id}"`)) {
      throw new PayloadLeakError(`${id} must never reach Engine 2.`);
    }
  }

  assertNoIdentifiers(inputs as unknown as AnalysisPayload);
  return inputs;
}

/**
 * Last line of defence before a payload leaves for a third-party model.
 *
 * Everything upstream is already supposed to have handled this. That is exactly
 * why it is worth checking again here: this is the only place where being wrong
 * is unrecoverable.
 */
export function assertNoIdentifiers(payload: AnalysisPayload): void {
  const keys = new Set(Object.keys(payload));

  for (const id of piiFieldIds()) {
    if (keys.has(id)) {
      throw new PayloadLeakError(`${id} is flagged pii and must be stripped before any engine call.`);
    }
  }

  for (const forbidden of ['name', 'email', 'participant_code', 'date']) {
    if (keys.has(forbidden)) {
      throw new PayloadLeakError(`\`${forbidden}\` must be stripped before any engine call.`);
    }
  }
}

/** Drops `name` and the other header identifiers from a stored response row. */
export function stripIdentifiers(
  responses: QuestionnaireResponses
): Omit<QuestionnaireResponses, 'name' | 'date'> {
  const { name: _name, date: _date, ...rest } = responses;
  return rest;
}
