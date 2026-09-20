import { PROMPT_TEXT } from './prompts.generated';
import type { A4Entry, PathwayEntry, WorkingWord } from './types';
import type { AnalysisPayload, RecommendationInputs } from './payload';

/**
 * The engines are the prompts. There is no scoring algorithm underneath them, so
 * a prompt edit is a change to the instrument and gets a version, exactly like a
 * question edit does. Both are selected by version here rather than pasted into
 * the call site.
 */
export const ENGINE_1 = {
  version: '1.2',
  promptKey: 'analysis_prompt_v1_2_json',
  /** Stamped onto every profile as `engine_version`. */
  engineVersion: 'analysis-1.2',
} as const;

export const ENGINE_2 = {
  version: '1.0',
  promptKey: 'recommendations_prompt_v1_0',
  engineVersion: 'recommendations-1.0',
} as const;

export const MODEL = 'claude-sonnet-4-6';
export const MAX_TOKENS = 1200;
/** Low but not zero: the reading should be stable across runs of the same answers. */
export const TEMPERATURE = 0.1;

function promptText(key: string): string {
  const text = PROMPT_TEXT[key];
  if (!text) throw new Error(`No prompt registered under "${key}".`);
  return text;
}

function substitute(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [token, value] of Object.entries(values)) {
    const placeholder = `{{${token}}}`;
    if (!out.includes(placeholder)) {
      throw new Error(`Prompt is missing the ${placeholder} placeholder.`);
    }
    out = out.replaceAll(placeholder, value);
  }

  const leftover = /\{\{([A-Z0-9_]+)\}\}/.exec(out);
  if (leftover) {
    throw new Error(`Prompt still contains an unsubstituted placeholder: {{${leftover[1]}}}.`);
  }

  return out;
}

/** Engine 1: the analysis prompt verbatim, with the filtered payload substituted in. */
export function renderAnalysisPrompt(payload: AnalysisPayload): string {
  return substitute(promptText(ENGINE_1.promptKey), {
    STUDENT_RESPONSES: JSON.stringify(payload, null, 2),
  });
}

function formatA4(entries: A4Entry[]): string {
  if (entries.length === 0) return 'None listed.';
  return entries
    .map(
      (entry) =>
        `- ${entry.activity} (${entry.mode.toUpperCase()}, ${entry.social.toUpperCase()}, ${entry.setting.toUpperCase()})`
    )
    .join('\n');
}

function formatPathways(entries: PathwayEntry[]): string {
  // adjacent_fields is deliberately withheld. It is Phase 2 groundwork for
  // academic direction, and Phase 1 does not promise a major.
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      location: entry.location,
      category: entry.category,
      what_it_is: entry.what_it_is,
      how_to_join: entry.how_to_join,
      low_commitment_entry: entry.low_commitment_entry,
      working_words: entry.working_words,
      fills_gap: entry.fills_gap,
    })),
    null,
    2
  );
}

export function renderRecommendationsPrompt(inputs: RecommendationInputs): string {
  return substitute(promptText(ENGINE_2.promptKey), {
    WORKING_WORD: inputs.workingWord satisfies WorkingWord,
    D3_SENTENCE: inputs.d3Sentence,
    A4_ENTRIES: formatA4(inputs.a4Entries),
    PATHWAYS: formatPathways(inputs.pathways),
  });
}
