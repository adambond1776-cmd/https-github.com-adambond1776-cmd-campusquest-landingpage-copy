import { describe, expect, it } from 'vitest';
import {
  VERB_TO_WORKING_WORD,
  applyStudentTiebreak,
  effectiveVerb,
  needsStudentTiebreak,
  resolveD1,
  resolveD2,
} from '../resolve-d1';
import type { VerbTag } from '../types';

const tags = (...pairs: [number, VerbTag['verb']][]): VerbTag[] =>
  pairs.map(([instance, verb]) => ({ instance, verb }));

describe('resolveD1 — modal', () => {
  it('returns the outright modal verb without consulting C1', () => {
    const B = tags(
      [1, 'BUILT'],
      [2, 'BUILT'],
      [3, 'BUILT'],
      [4, 'SORTED'],
      [5, 'EXPLAINED'],
      [6, 'NOTICED']
    );

    expect(resolveD1(B, [4, 5])).toEqual({ computed_verb: 'BUILT', resolution: 'modal' });
  });

  it('resolves a modal verb circled only twice, which is the common case', () => {
    const B = tags(
      [1, 'PROTECTED'],
      [2, 'PROTECTED'],
      [3, 'EXPLAINED'],
      [4, 'SORTED'],
      [5, 'NOTICED'],
      [6, 'PERFORMED']
    );

    expect(resolveD1(B, [1, 3])).toEqual({ computed_verb: 'PROTECTED', resolution: 'modal' });
  });
});

describe('resolveD1 — tie broken by C1', () => {
  it('restricts a tie to the verbs on the two C1 instances', () => {
    // The GM-000 fixture shape: BUILT x2, REPAIRED x2, C1 on instances 2 and 5,
    // both of which are REPAIRED.
    const B = tags(
      [1, 'BUILT'],
      [2, 'REPAIRED'],
      [3, 'EXPLAINED'],
      [4, 'SORTED'],
      [5, 'REPAIRED'],
      [6, 'BUILT']
    );

    expect(resolveD1(B, [2, 5])).toEqual({
      computed_verb: 'REPAIRED',
      resolution: 'tie_broken_by_C1',
    });
  });

  it('breaks the tie when only one of the two C1 instances carries a tied verb', () => {
    const B = tags(
      [1, 'BUILT'],
      [2, 'BUILT'],
      [3, 'SORTED'],
      [4, 'SORTED'],
      [5, 'NOTICED'],
      [6, 'PERFORMED']
    );

    // Instance 5 is NOTICED, which is not tied, so it drops out and BUILT stands.
    expect(resolveD1(B, [1, 5])).toEqual({
      computed_verb: 'BUILT',
      resolution: 'tie_broken_by_C1',
    });
  });
});

describe('resolveD1 — UNRESOLVED', () => {
  it('returns UNRESOLVED when a tie has one tied verb on each C1 instance', () => {
    // Synthetic tally for the unresolved path. GM-001 is not this case — the
    // handwritten original is BUILT plurality, not a BUILT/SORTED tie.
    const B = tags(
      [1, 'BUILT'],
      [2, 'SORTED'],
      [3, 'NOTICED'],
      [4, 'SORTED'],
      [5, 'BUILT']
    );

    const resolution = resolveD1(B, [1, 4]);

    expect(resolution).toEqual({
      computed_verb: null,
      resolution: 'UNRESOLVED',
      candidates: ['BUILT', 'SORTED'],
    });
    expect(needsStudentTiebreak(resolution)).toBe(true);
  });

  it('falls back to every tied verb when C1 lands entirely outside the tie', () => {
    const B = tags(
      [1, 'BUILT'],
      [2, 'BUILT'],
      [3, 'SORTED'],
      [4, 'SORTED'],
      [5, 'NOTICED'],
      [6, 'PERFORMED']
    );

    expect(resolveD1(B, [5, 6])).toEqual({
      computed_verb: null,
      resolution: 'UNRESOLVED',
      candidates: ['BUILT', 'SORTED'],
    });
  });

  it('treats an empty tally as unresolved rather than throwing', () => {
    expect(resolveD1([], [1, 2])).toEqual({
      computed_verb: null,
      resolution: 'UNRESOLVED',
      candidates: [],
    });
  });
});

describe('student tiebreak', () => {
  const unresolved = resolveD1(
    tags([1, 'BUILT'], [2, 'SORTED'], [3, 'NOTICED'], [4, 'SORTED'], [5, 'BUILT']),
    [1, 4]
  );

  it('records the pick without overwriting how the count came out', () => {
    const withChoice = applyStudentTiebreak(unresolved, 'BUILT');

    expect(withChoice.student_tiebreak_choice).toBe('BUILT');
    // The record still has to say the tally was thin.
    expect(withChoice.computed_verb).toBeNull();
    expect(withChoice.resolution).toBe('UNRESOLVED');
    expect(needsStudentTiebreak(withChoice)).toBe(false);
  });

  it('uses the student pick as the effective verb so the profile shows a real answer', () => {
    const withChoice = applyStudentTiebreak(unresolved, 'SORTED');

    expect(effectiveVerb(withChoice)).toBe('SORTED');
    expect(resolveD2(withChoice)).toBe('ORGANIZER');
  });

  it('rejects a pick that was not one of the tied candidates', () => {
    expect(() => applyStudentTiebreak(unresolved, 'PERFORMED')).toThrow(/not one of the tied/);
  });

  it('refuses to apply a tiebreak to a resolution that did not need one', () => {
    const modal = resolveD1(tags([1, 'BUILT'], [2, 'BUILT'], [3, 'SORTED']), [1, 2]);
    expect(() => applyStudentTiebreak(modal, 'SORTED')).toThrow(/Refusing/);
  });
});

describe('resolveD2', () => {
  it('maps every verb to a working word', () => {
    expect(Object.keys(VERB_TO_WORKING_WORD)).toHaveLength(8);
    expect(new Set(Object.values(VERB_TO_WORKING_WORD)).size).toBe(8);
  });

  it('returns null when D1 never resolved and the student has not picked', () => {
    expect(resolveD2({ computed_verb: null, resolution: 'UNRESOLVED', candidates: [] })).toBeNull();
  });
});
