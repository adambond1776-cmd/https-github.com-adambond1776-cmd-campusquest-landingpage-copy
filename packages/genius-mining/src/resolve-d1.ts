import type { D1Resolution, Verb, VerbTag, WorkingWord } from './types';

/**
 * D2 is a fixed lookup from D1. Not a student choice, not a judgement call.
 * The paper form has the student read it off a printed table; the app computes it.
 */
export const VERB_TO_WORKING_WORD: Record<Verb, WorkingWord> = {
  EXPLAINED: 'TEACHER',
  BUILT: 'BUILDER',
  SORTED: 'ORGANIZER',
  NOTICED: 'ANALYST',
  CONNECTED: 'CONNECTOR',
  REPAIRED: 'FIXER',
  PROTECTED: 'PROTECTOR',
  PERFORMED: 'PERFORMER',
};

/**
 * D1: the modal verb across the Section B tags. On a tie, restrict to the verbs
 * sitting on the two instances the student circled in C1.
 *
 * Six tags spread across eight verbs means ties are common and the modal verb is
 * often circled only twice, so this tally is mathematically thin by design. That
 * is why the analysis prompt ranks C3 above Section B, and why an UNRESOLVED
 * result is a normal outcome rather than an error.
 *
 * When the count ties *and* the two C1 instances carry two different tied verbs,
 * the form's rule does not resolve and there is no arithmetic left to do. That
 * case returns UNRESOLVED with the candidates, and the caller asks the student.
 * GM-001 — the only validated run in existence — is this case.
 */
export function resolveD1(B: VerbTag[], C1: number[]): D1Resolution {
  const counts = new Map<Verb, number>();
  for (const tag of B) {
    counts.set(tag.verb, (counts.get(tag.verb) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return { computed_verb: null, resolution: 'UNRESOLVED', candidates: [] };
  }

  const top = Math.max(...counts.values());
  const tied = [...counts.entries()]
    .filter(([, count]) => count === top)
    .map(([verb]) => verb)
    .sort();

  if (tied.length === 1) {
    return { computed_verb: tied[0], resolution: 'modal' };
  }

  const c1Verbs = [
    ...new Set(B.filter((tag) => C1.includes(tag.instance)).map((tag) => tag.verb)),
  ]
    .filter((verb) => tied.includes(verb))
    .sort();

  if (c1Verbs.length === 1) {
    return { computed_verb: c1Verbs[0], resolution: 'tie_broken_by_C1' };
  }

  return {
    computed_verb: null,
    resolution: 'UNRESOLVED',
    candidates: c1Verbs.length > 0 ? c1Verbs : tied,
  };
}

/**
 * The verb D1 settled on, for display and for the engine payload.
 *
 * On UNRESOLVED this is the student's own tiebreak pick, which is a real answer
 * and belongs on the profile. It deliberately does not become `computed_verb`:
 * the record has to keep saying the tally was thin rather than dress a coin flip
 * as arithmetic.
 */
export function effectiveVerb(resolution: D1Resolution): Verb | null {
  return resolution.computed_verb ?? resolution.student_tiebreak_choice ?? null;
}

export function resolveD2(resolution: D1Resolution): WorkingWord | null {
  const verb = effectiveVerb(resolution);
  return verb ? VERB_TO_WORKING_WORD[verb] : null;
}

/**
 * Records the student's pick without disturbing how the count actually came out.
 * Rejects a pick that was not one of the tied candidates.
 */
export function applyStudentTiebreak(resolution: D1Resolution, choice: Verb): D1Resolution {
  if (resolution.resolution !== 'UNRESOLVED') {
    throw new Error(
      `Refusing to apply a student tiebreak to a ${resolution.resolution} resolution.`
    );
  }

  if (!resolution.candidates?.includes(choice)) {
    throw new Error(
      `${choice} is not one of the tied candidates (${resolution.candidates?.join(', ') || 'none'}).`
    );
  }

  return { ...resolution, student_tiebreak_choice: choice };
}

export function needsStudentTiebreak(resolution: D1Resolution): boolean {
  return resolution.resolution === 'UNRESOLVED' && !resolution.student_tiebreak_choice;
}
