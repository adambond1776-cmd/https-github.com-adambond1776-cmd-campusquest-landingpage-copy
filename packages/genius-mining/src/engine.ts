import { ANALYSIS_CALL_CEILING } from './credits';
import { buildAnalysisPayload } from './payload';
import { ENGINE_1, MAX_TOKENS, MODEL, TEMPERATURE, renderAnalysisPrompt } from './prompts';
import { INSTRUMENT_VERSION } from './schema';
import { parseAnalysisResponse, validateProfile } from './validate';
import type {
  AnalysisResult,
  D1Resolution,
  Profile,
  QuestionnaireResponses,
} from './types';

export type EngineRequest = {
  model: string;
  maxTokens: number;
  temperature: number;
  prompt: string;
};

/**
 * The transport is injected rather than implemented here. This package decides
 * what to send, how to validate it, and when to stop; the host owns the network
 * call, the API key, and the logging. That split is also what lets a second
 * licensee drop this directory in unchanged.
 */
export type EngineTransport = (request: EngineRequest) => Promise<string>;

export type AnalysisAttempt = {
  raw: string;
  errors: string[];
};

export type AnalysisRunResult =
  | { ok: true; analysis: AnalysisResult; callsMade: number; attempts: AnalysisAttempt[] }
  | { ok: false; callsMade: number; attempts: AnalysisAttempt[]; errors: string[] };

/**
 * Runs Engine 1 against a filtered payload.
 *
 * One call, and one retry only when the response fails contract validation.
 * Malformed output is never hand-repaired — a patched profile is one nobody can
 * trace back to what the model actually said — so a second failure is returned
 * as a failure for an operator to look at.
 */
export async function runAnalysis(
  responses: QuestionnaireResponses,
  d1Resolution: D1Resolution,
  transport: EngineTransport
): Promise<AnalysisRunResult> {
  const payload = buildAnalysisPayload(responses, d1Resolution);
  const prompt = renderAnalysisPrompt(payload);

  const attempts: AnalysisAttempt[] = [];

  for (let call = 1; call <= ANALYSIS_CALL_CEILING; call += 1) {
    const raw = await transport({
      model: MODEL,
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      prompt,
    });

    const parsed = parseAnalysisResponse(raw);
    if (parsed.ok) {
      return { ok: true, analysis: parsed.value, callsMade: call, attempts };
    }

    attempts.push({ raw, errors: parsed.errors });
  }

  return {
    ok: false,
    callsMade: ANALYSIS_CALL_CEILING,
    attempts,
    errors: [
      `Engine 1 output failed contract validation on ${ANALYSIS_CALL_CEILING} attempts.`,
      ...attempts.flatMap((attempt, index) =>
        attempt.errors.map((error) => `attempt ${index + 1}: ${error}`)
      ),
    ],
  };
}

/**
 * Assembles the stored profile from an analysis result, stamping the provenance
 * an advisor needs in order to read it correctly.
 */
export function assembleProfile(options: {
  participantCode: string;
  analysis: AnalysisResult;
  d1Resolution: D1Resolution;
  model?: string;
  runAt?: Date;
}): Profile {
  const { participantCode, analysis, d1Resolution } = options;

  const profile: Profile = {
    ...analysis,
    participant_code: participantCode,
    instrument_version: INSTRUMENT_VERSION,
    engine_version: ENGINE_1.engineVersion,
    model: options.model ?? MODEL,
    run_at: (options.runAt ?? new Date()).toISOString(),
    d1_resolution: d1Resolution,
    status: 'draft',
  };

  const validated = validateProfile(profile);
  if (!validated.ok) {
    throw new Error(`Assembled profile violates the output contract: ${validated.errors.join('; ')}`);
  }

  return validated.value;
}
