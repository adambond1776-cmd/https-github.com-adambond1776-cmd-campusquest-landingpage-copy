import { PARTICIPANT_CODE_PATTERN } from './schema';

/**
 * GM-001 through GM-099 are reserved for paper runs, so the transcribed pages
 * keep the codes already written on them. Digital sign-ups start at GM-100.
 */
export const PAPER_RANGE = { first: 1, last: 99 } as const;
export const FIRST_DIGITAL_CODE = 100;

export function isValidParticipantCode(code: string): boolean {
  return PARTICIPANT_CODE_PATTERN.test(code);
}

export function formatParticipantCode(sequence: number): string {
  return `GM-${String(sequence).padStart(3, '0')}`;
}

export function parseParticipantCode(code: string): number | null {
  if (!isValidParticipantCode(code)) return null;
  return Number.parseInt(code.slice(3), 10);
}

export function isPaperCode(code: string): boolean {
  const sequence = parseParticipantCode(code);
  return sequence !== null && sequence >= PAPER_RANGE.first && sequence <= PAPER_RANGE.last;
}

/**
 * Next digital code, given the highest sequence already allocated.
 *
 * Never returns into the paper range, even on an empty table, so a digital
 * student cannot collide with one of Adam's photographed forms.
 */
export function nextDigitalCode(highestAllocated: number | null): string {
  const next = Math.max(FIRST_DIGITAL_CODE, (highestAllocated ?? 0) + 1);
  return formatParticipantCode(next);
}
