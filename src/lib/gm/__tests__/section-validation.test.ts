import { describe, expect, it } from 'vitest';
import type { QuestionnaireResponses } from '@hiddengeniuslabs/genius-mining';
import { validateSection } from '@/lib/gm/section-validation';

const sixInstances = Array.from({ length: 6 }, (_, index) => ({
  index: index + 1,
  text: `instance ${index + 1}`,
}));

const sectionA: Partial<QuestionnaireResponses> = {
  A1: sixInstances,
  A2: 'Marching band. I was glad to stop having to be somewhere at 6am.',
  A3: 'Basement of the engineering building at 2am with Marcus.',
};

describe('Section A', () => {
  it('accepts six filled instances', () => {
    expect(validateSection('A', sectionA).ok).toBe(true);
  });

  it('rejects a short A1 and says how many are missing', () => {
    const result = validateSection('A', { ...sectionA, A1: sixInstances.slice(0, 4) });

    expect(result.ok).toBe(false);
    expect(result.errors.A1).toMatch(/You have 4/);
  });

  it('treats whitespace as unfilled', () => {
    const withBlank = [...sixInstances];
    withBlank[2] = { index: 3, text: '   ' };

    expect(validateSection('A', { ...sectionA, A1: withBlank }).ok).toBe(false);
  });

  it('requires A2 and A3', () => {
    expect(validateSection('A', { ...sectionA, A2: '' }).errors.A2).toBeDefined();
    expect(validateSection('A', { ...sectionA, A3: '' }).errors.A3).toBeDefined();
  });

  it('leaves A4 optional', () => {
    expect(validateSection('A', { ...sectionA, A4: [] }).ok).toBe(true);
    expect(validateSection('A', sectionA).ok).toBe(true);
  });

  it('catches an A4 row that was started but not tagged', () => {
    const result = validateSection('A', {
      ...sectionA,
      A4: [{ activity: 'pickup basketball', mode: 'do' } as never],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.A4).toMatch(/all three tags/);
  });

  it('never requires the A4 contact consent box', () => {
    expect(validateSection('A', { ...sectionA, A4_consent: false }).ok).toBe(true);
  });
});

describe('Section B', () => {
  it('needs a verb on every instance', () => {
    const result = validateSection('B', {
      B: [
        { instance: 1, verb: 'BUILT' },
        { instance: 2, verb: 'REPAIRED' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.B).toMatch(/tagged 2/);
  });

  it('accepts six tags with repeats', () => {
    const result = validateSection('B', {
      B: [
        { instance: 1, verb: 'BUILT' },
        { instance: 2, verb: 'REPAIRED' },
        { instance: 3, verb: 'EXPLAINED' },
        { instance: 4, verb: 'SORTED' },
        { instance: 5, verb: 'REPAIRED' },
        { instance: 6, verb: 'BUILT' },
      ],
    });

    expect(result.ok).toBe(true);
  });
});

describe('Section C', () => {
  const longC3 =
    'Hands were doing almost everything, holding a meter probe in one hand and tracing the board with the other, swapping between them constantly. Eyes went back and forth between the schematic and the board maybe fifty times. Mouth was mostly shut except I kept muttering the signal path out loud to myself.';

  const sectionC: Partial<QuestionnaireResponses> = {
    C1: [2, 5],
    C2: 'Chest tightens a little thinking about the transmitter one.',
    C3: longC3,
  };

  it('accepts exactly two C1 picks', () => {
    expect(validateSection('C', sectionC).ok).toBe(true);
  });

  it('rejects one pick and rejects three', () => {
    expect(validateSection('C', { ...sectionC, C1: [2] }).errors.C1).toBe('Pick exactly two.');
    expect(validateSection('C', { ...sectionC, C1: [1, 2, 3] }).errors.C1).toBe(
      'Pick exactly two.'
    );
  });

  it('accepts "nothing happens" for C2 as a real answer', () => {
    const result = validateSection('C', { ...sectionC, C2: 'nothing happens' });
    expect(result.ok).toBe(true);
    expect(result.errors.C2).toBeUndefined();
  });

  it('soft-warns on a thin C3 without blocking', () => {
    const result = validateSection('C', { ...sectionC, C3: 'I was fixing it.' });

    // A thin C3 degrades the whole reading, but the students most likely to write
    // one are the students a hard block would push out of the instrument.
    expect(result.ok).toBe(true);
    expect(result.errors.C3).toBeUndefined();
    expect(result.warnings.C3).toMatch(/leans on hardest|thin answer/i);
  });

  it('drops the warning once C3 is substantial', () => {
    expect(validateSection('C', sectionC).warnings.C3).toBeUndefined();
  });

  it('still requires C3 to say something', () => {
    const result = validateSection('C', { ...sectionC, C3: '   ' });
    expect(result.ok).toBe(false);
    expect(result.errors.C3).toBeDefined();
  });
});

describe('Section D', () => {
  it('requires D3 but never asks the student to type D1 or D2', () => {
    const result = validateSection('D', {});

    expect(result.errors.D3).toBeDefined();
    expect(result.errors.D1).toBeUndefined();
    expect(result.errors.D2).toBeUndefined();
  });

  it('passes once D3 is written', () => {
    expect(validateSection('D', { D3: "I won't leave a broken thing alone." }).ok).toBe(true);
  });
});

describe('Section E', () => {
  it('is entirely optional — these questions are about the form, not the student', () => {
    expect(validateSection('E', {}).ok).toBe(true);
  });

  it('nudges for the follow-up on a YES without blocking', () => {
    const result = validateSection('E', { E3: { answer: 'YES', which_question: '' } });

    expect(result.ok).toBe(true);
    expect(result.warnings.E3).toBeDefined();
  });

  it('does not nudge on a NO', () => {
    const result = validateSection('E', { E3: { answer: 'NO', which_question: null } });
    expect(result.warnings.E3).toBeUndefined();
  });
});
