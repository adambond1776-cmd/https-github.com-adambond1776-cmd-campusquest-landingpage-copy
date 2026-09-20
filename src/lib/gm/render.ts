import { citesThinSpot } from '@hiddengeniuslabs/genius-mining';

export type SafeText = {
  text: string | null;
  /** Set when the line was withheld because it cited a discounted answer. */
  suppressedBecauseThin: string | null;
};

/**
 * Gate for anything the profile is about to quote back at the student.
 *
 * If the engine discounted an answer as too sparse to use, the rendering must not
 * turn around and cite it as evidence. Both renderings go through this, so a line
 * that would quote a thin spot is dropped rather than shown with a caveat.
 */
export function safeText(text: string | null | undefined, thinSpots: string[]): SafeText {
  if (!text?.trim()) return { text: null, suppressedBecauseThin: null };

  const cited = citesThinSpot(text, thinSpots);
  if (cited) return { text: null, suppressedBecauseThin: cited };

  return { text, suppressedBecauseThin: null };
}

/** Long-form label for a thin spot id, for the advisor printout. */
export function describeThinSpot(id: string): string {
  const [field, instance] = id.split('#');

  const labels: Record<string, string> = {
    A1: 'the six instances',
    A2: 'the thing they were relieved to stop',
    A3: 'losing track of time',
    B: 'the verb tagging',
    C1: 'the two instances they chose',
    C2: 'the body-signal question',
    C3: 'what their hands and eyes were doing',
    D3: 'their own sentence',
    E1: 'which question was hardest',
    E2: 'what they skipped or fudged',
    E3: 'whether anything was said for the first time',
  };

  const label = labels[field] ?? field;
  return instance ? `${label} (item ${instance})` : label;
}

export const CONFIDENCE_NOTE: Record<string, string> = {
  HIGH: 'The answers were detailed and pointed the same way.',
  MEDIUM: 'The reading holds, but it rests on fewer answers than it could.',
  LOW: 'Treat this as a first guess. The answers were too thin to say more.',
};
