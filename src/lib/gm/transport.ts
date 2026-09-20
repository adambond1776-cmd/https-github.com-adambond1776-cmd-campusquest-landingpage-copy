import {
  VERB_TO_WORKING_WORD,
  effectiveVerb,
  type AnalysisResult,
  type D1Resolution,
  type EngineRequest,
  type EngineTransport,
  type QuestionnaireResponses,
  type WorkingWord,
} from '@hiddengeniuslabs/genius-mining';
import { anthropicApiKey, engineMode } from '@/lib/env';

export const MOCK_MODEL = 'mock-engine';

/**
 * Real Engine 1 transport.
 *
 * The brief's snippet omits the auth and version headers; the API rejects the
 * call without them.
 */
export const ANTHROPIC_TIMEOUT_MS = 60_000;

export function anthropicTransport(apiKey: string): EngineTransport {
  return async (request: EngineRequest): Promise<string> => {
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          messages: [{ role: 'user', content: request.prompt }],
        }),
        signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new Error('The analysis timed out before it finished.');
      }
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Anthropic returned ${response.status}: ${detail.slice(0, 500)}`);
    }

    const payload = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };

    const text = payload.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
      .trim();

    if (!text) throw new Error('Anthropic returned no text content.');
    return text;
  };
}

/** Sentence-ish fragment of a student answer, for quoting back as evidence. */
function fragment(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/[\s,.;:]+\S*$/, '')}…`;
}

function tallyWorkingWord(responses: QuestionnaireResponses): WorkingWord {
  const counts = new Map<WorkingWord, number>();
  for (const tag of responses.B) {
    const word = VERB_TO_WORKING_WORD[tag.verb];
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? 'BUILDER';
}

/**
 * Offline stand-in for Engine 1.
 *
 * It reads the student's actual answers rather than returning a fixed blob, so
 * the review screen, the thin-spot suppression and both renderings can be
 * exercised end to end without spending a credit. It is not an analysis: the
 * profile it produces is stamped with the `mock-engine` model, which the advisor
 * printout shows, so nobody mistakes it for a reading.
 */
export function mockAnalysis(
  responses: QuestionnaireResponses,
  d1Resolution: D1Resolution
): AnalysisResult {
  const verb = effectiveVerb(d1Resolution);
  const primary = verb ? VERB_TO_WORKING_WORD[verb] : tallyWorkingWord(responses);

  const thinSpots: string[] = [];
  if ((responses.C3?.trim().length ?? 0) < 200) thinSpots.push('C3');
  if ((responses.C2?.trim().length ?? 0) < 20) thinSpots.push('C2');
  if ((responses.A2?.trim().length ?? 0) < 40) thinSpots.push('A2');
  if ((responses.A3?.trim().length ?? 0) < 40) thinSpots.push('A3');
  if (!responses.E1?.trim()) thinSpots.push('E1');
  if (!responses.E2?.trim()) thinSpots.push('E2');

  const c3Thin = thinSpots.includes('C3');
  const confidence: AnalysisResult['confidence'] = c3Thin
    ? 'LOW'
    : d1Resolution.resolution === 'UNRESOLVED'
      ? 'MEDIUM'
      : 'HIGH';

  const circled = responses.C1.map(
    (index) => responses.A1.find((item) => item.index === index)?.text
  ).filter(Boolean) as string[];

  const evidence = c3Thin
    ? `There is not much to go on here. Your account of what you were doing minute to minute is short, so this reading leans on the two instances you circled — ${fragment(circled.join('; '), 90)} — rather than on the detail that usually carries it.`
    : `You described your hands and eyes as ${fragment(responses.C3, 150)} The two instances you were willing to talk about for an hour were ${fragment(circled.join('; '), 90)}, and both are the same kind of work.`;

  const secondaryWord = [...new Set(responses.B.map((tag) => VERB_TO_WORKING_WORD[tag.verb]))].find(
    (word) => word !== primary
  );

  return {
    primary_working_word: primary,
    evidence,
    secondary_pattern: {
      word: secondaryWord ?? null,
      note: secondaryWord
        ? `${secondaryWord} shows up in your tags too, but on fewer of the instances you chose to talk about.`
        : 'Nothing else in the tally showed up often enough to name.',
    },
    disagreement_with_self_tally: {
      value: d1Resolution.resolution === 'UNRESOLVED',
      reason:
        d1Resolution.resolution === 'UNRESOLVED'
          ? `Your count tied between ${d1Resolution.candidates?.join(' and ')}, so the tally did not settle this on its own and the word rests on what you wrote rather than on arithmetic.`
          : 'Your own tally and this reading point the same way.',
    },
    body_signal_read: responses.C2?.trim()
      ? `You wrote ${fragment(responses.C2, 100)} — that is consistent with the reading rather than against it.`
      : 'Nothing recorded here, which neither confirms nor complicates the reading.',
    confidence,
    thin_spots: thinSpots,
    for_the_mentor: `Ask about a time ${primary === 'BUILDER' ? 'they left something unfinished' : 'this pattern did not hold'}, and whether the account still fits.`,
  };
}

export function mockTransport(
  responses: QuestionnaireResponses,
  d1Resolution: D1Resolution
): EngineTransport {
  return async () => {
    // A touch of latency so the review screen's loading state is real in dev.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return JSON.stringify(mockAnalysis(responses, d1Resolution));
  };
}

export type ResolvedEngine = {
  transport: EngineTransport;
  model: string;
  isMock: boolean;
};

/**
 * Thrown instead of returning a stand-in profile to a real student.
 *
 * A mock analysis is indistinguishable from a real one once it is on the page.
 * In development that is the point; in production it would mean handing someone
 * a description of how they think that was produced by a fixture. Refusing is
 * recoverable — their answers are saved and they can run it once the key is
 * there. A fabricated profile is not.
 */
export class EngineUnavailableError extends Error {
  constructor() {
    super(
      'The analysis engine is not configured. Your answers are saved and nothing is lost; we will email you the moment it can run.'
    );
    this.name = 'EngineUnavailableError';
  }
}

export function resolveEngine(
  responses: QuestionnaireResponses,
  d1Resolution: D1Resolution
): ResolvedEngine {
  const key = anthropicApiKey();

  if (engineMode() === 'anthropic' && key) {
    return { transport: anthropicTransport(key), model: 'claude-sonnet-4-6', isMock: false };
  }

  if (process.env.NODE_ENV === 'production' && process.env.GM_ALLOW_MOCK_IN_PRODUCTION !== 'true') {
    throw new EngineUnavailableError();
  }

  return {
    transport: mockTransport(responses, d1Resolution),
    model: MOCK_MODEL,
    isMock: true,
  };
}
