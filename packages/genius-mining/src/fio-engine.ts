import { buildAnalysisPayload } from './payload';
import { MODEL, TEMPERATURE } from './prompts';
import { PROMPT_TEXT } from './prompts.generated';
import { INSTRUMENT_VERSION } from './schema';
import { parseFioResponse, validateFioResult } from './fio-validate';
import type { EngineTransport } from './engine';
import type { D1Resolution, Profile, QuestionnaireResponses } from './types';
import type { FioAnalysisResult, FioResult } from './fio-types';

/**
 * Call 2. Versioned exactly like Engine 1 and Engine 2, and selected by key
 * rather than pasted into the call site — a prompt edit is an instrument change
 * and gets a version.
 */
export const FIO_ENGINE = {
  version: '1.0',
  promptKey: 'fio_analysis_prompt_v1_0',
  /** Stamped onto every FIO result as `fio_engine_version`. */
  engineVersion: 'fio-1.0',
} as const;

/** Shorter output than Call 1 by design. More headroom invites padding. */
export const FIO_MAX_TOKENS = 900;

/**
 * FIO is a SECOND charge, not a free rider on the base instrument.
 *
 * The Analysis Algorithm's two-credit-per-student ceiling covers Call 1 and its
 * one retry. FIO gets its own budget of the same shape. This is priced into the
 * $25 tier deliberately — deciding it here rather than discovering it on an
 * invoice is the whole point of the constant being in the source.
 */
export const FIO_CALL_CEILING = 2;

export class FioOrderingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FioOrderingError';
  }
}

export type FioRunResult =
  | { ok: true; analysis: FioAnalysisResult; callsMade: number; attempts: { raw: string; errors: string[] }[] }
  | { ok: false; callsMade: number; attempts: { raw: string; errors: string[] }[]; errors: string[] };

function renderFioPrompt(payload: Record<string, unknown>): string {
  const template = PROMPT_TEXT[FIO_ENGINE.promptKey];
  if (!template) throw new Error(`No prompt registered under "${FIO_ENGINE.promptKey}".`);

  const placeholder = '{{STUDENT_RESPONSES}}';
  if (!template.includes(placeholder)) {
    throw new Error(`FIO prompt is missing the ${placeholder} placeholder.`);
  }

  const out = template.replaceAll(placeholder, JSON.stringify(payload, null, 2));

  const leftover = /\{\{([A-Z0-9_]+)\}\}/.exec(out);
  if (leftover) {
    throw new Error(`FIO prompt still contains an unsubstituted placeholder: {{${leftover[1]}}}.`);
  }

  return out;
}

/**
 * Runs Call 2 against the same filtered payload Call 1 received.
 *
 * Call 1 must have validated first. A domain read hung off a failed working word
 * is meaningless, and running it anyway spends a credit to produce something no
 * advisor should be shown — so the ordering is enforced here rather than left to
 * the caller to remember.
 */
export async function runFioAnalysis(
  responses: QuestionnaireResponses,
  d1Resolution: D1Resolution,
  profile: Profile,
  transport: EngineTransport
): Promise<FioRunResult> {
  if (!profile?.primary_working_word) {
    throw new FioOrderingError(
      'Call 1 must validate before Call 2 is made. No primary_working_word on the profile.'
    );
  }

  // Same payload, same exclusions: no name, no participant metadata, no A4.
  // Reusing the Call 1 builder rather than writing a second filter is deliberate —
  // a second filter is a second thing to forget to update.
  const payload = buildAnalysisPayload(responses, d1Resolution);
  const prompt = renderFioPrompt(payload);

  const attempts: { raw: string; errors: string[] }[] = [];

  for (let call = 1; call <= FIO_CALL_CEILING; call += 1) {
    const raw = await transport({
      model: MODEL,
      maxTokens: FIO_MAX_TOKENS,
      temperature: TEMPERATURE,
      prompt,
    });

    const parsed = parseFioResponse(raw);
    if (parsed.ok) {
      return { ok: true, analysis: parsed.value, callsMade: call, attempts };
    }

    attempts.push({ raw, errors: parsed.errors });
  }

  return {
    ok: false,
    callsMade: FIO_CALL_CEILING,
    attempts,
    errors: [
      `FIO output failed contract validation on ${FIO_CALL_CEILING} attempts.`,
      ...attempts.flatMap((attempt, index) =>
        attempt.errors.map((error) => `attempt ${index + 1}: ${error}`)
      ),
    ],
  };
}

export function assembleFioResult(options: {
  participantCode: string;
  analysis: FioAnalysisResult;
  workingWordRef: string;
  model?: string;
  runAt?: Date;
}): FioResult {
  const result: FioResult = {
    ...options.analysis,
    participant_code: options.participantCode,
    instrument_version: INSTRUMENT_VERSION,
    fio_engine_version: FIO_ENGINE.engineVersion,
    model: options.model ?? MODEL,
    run_at: (options.runAt ?? new Date()).toISOString(),
    working_word_ref: options.workingWordRef,
    status: 'draft',
  };

  const validated = validateFioResult(result);
  if (!validated.ok) {
    throw new Error(`Assembled FIO result violates the output contract: ${validated.errors.join('; ')}`);
  }

  return validated.value;
}

