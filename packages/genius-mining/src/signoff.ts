import type { ProfileStatus, StudentEdit } from './types';

/**
 * Sign-off state machine: draft → returned_to_student → edited → accepted → filed.
 *
 * Nothing is filed until the student says it is finished, which is a promise the
 * consent screen makes in those words. A profile can loop through `edited` as
 * many times as the student wants; the paid tier includes refining it.
 */
const TRANSITIONS: Record<ProfileStatus, ProfileStatus[]> = {
  draft: ['returned_to_student'],
  returned_to_student: ['edited', 'accepted'],
  edited: ['edited', 'accepted'],
  accepted: ['edited', 'filed'],
  filed: [],
};

export function canTransition(from: ProfileStatus, to: ProfileStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(from: ProfileStatus, to: ProfileStatus): ProfileStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal sign-off transition: ${from} → ${to}.`);
  }
  return to;
}

/** Only a student-accepted profile counts in reporting. */
export function entersReporting(status: ProfileStatus): boolean {
  return status === 'accepted' || status === 'filed';
}

/** Whether the student may still change the profile. */
export function isEditable(status: ProfileStatus): boolean {
  return status !== 'filed';
}

export function recordEdit(
  edits: StudentEdit[],
  field: string,
  original: string,
  revised: string,
  now: Date = new Date()
): StudentEdit[] {
  if (original === revised) return edits;
  return [...edits, { field, original, revised, edited_at: now.toISOString() }];
}
