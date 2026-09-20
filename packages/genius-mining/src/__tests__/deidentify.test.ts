import { describe, expect, it } from 'vitest';
import fixture from '../../assets/fixtures/example_response_GM000.json';
import {
  CORPUS_FREE_TEXT_MIN_COHORT,
  DeidentificationError,
  assertDeidentified,
  corpusModeFor,
  deidentify,
} from '../deidentify';
import { resolveD1 } from '../resolve-d1';
import type { QuestionnaireResponses } from '../types';

const responses: QuestionnaireResponses = {
  ...(fixture as unknown as QuestionnaireResponses),
  name: 'Nick Delvecchio',
  date: '2026-09-01',
  instrument_version: '1.3',
};

const input = {
  responses,
  primaryWorkingWord: 'FIXER' as const,
  confidence: 'HIGH' as const,
  d1Resolution: resolveD1(responses.B, responses.C1),
  thinSpots: ['E2'],
};

describe('choosing a corpus mode', () => {
  it('keeps free text out of a pilot-sized corpus', () => {
    expect(corpusModeFor(0)).toBe('structured');
    expect(corpusModeFor(24)).toBe('structured');
    expect(corpusModeFor(CORPUS_FREE_TEXT_MIN_COHORT - 1)).toBe('structured');
  });

  it('allows free text once the cohort is large enough to hide in', () => {
    expect(corpusModeFor(CORPUS_FREE_TEXT_MIN_COHORT)).toBe('full');
  });

  it('defaults to structured when the caller does not say', () => {
    expect(deidentify(input).mode).toBe('structured');
  });
});

describe('what the corpus keeps', () => {
  it('keeps the structure the instrument needs to be improved', () => {
    const record = deidentify(input);

    expect(record.A1_count).toBe(6);
    expect(record.B).toHaveLength(6);
    expect(record.C1).toEqual(responses.C1);
    expect(record.instrument_version).toBe('1.3');
  });

  it('keeps how long each answer was, which is most of what the questions ask', () => {
    const record = deidentify(input);

    expect(record.lengths.C3).toBe(responses.C3.length);
    expect(record.lengths.D3).toBe(responses.D3.length);
    expect(record.lengths.A1).toEqual(responses.A1.map((item) => item.text.length));
  });

  it('keeps the finding alongside the structure that produced it', () => {
    const record = deidentify(input);

    expect(record.primary_working_word).toBe('FIXER');
    expect(record.confidence).toBe('HIGH');
    expect(record.d1_resolution.resolution).toBe('tie_broken_by_C1');
    expect(record.thin_spots).toEqual(['E2']);
  });

  it("keeps A4's three tags but not the activity the student named", () => {
    const record = deidentify(input);

    expect(record.A4_tags).toEqual([
      { mode: 'do', social: 'few friends', setting: 'indoors' },
      { mode: 'watch', social: 'crowd', setting: 'indoors' },
      { mode: 'do', social: 'alone', setting: 'outside' },
    ]);
    expect(JSON.stringify(record)).not.toContain('Mackal');
    expect(JSON.stringify(record)).not.toContain('Celtics');
  });
});

describe('what a pilot-sized corpus drops', () => {
  it('drops every word the student wrote', () => {
    const record = deidentify(input);
    const serialized = JSON.stringify(record);

    expect(record.text).toBeUndefined();
    expect(serialized).not.toContain(responses.C3.slice(0, 40));
    expect(serialized).not.toContain(responses.A2.slice(0, 40));
    expect(serialized).not.toContain(responses.D3.slice(0, 40));
  });

  it('drops the name and the date', () => {
    const record = deidentify(input);

    expect(record).not.toHaveProperty('name');
    expect(record).not.toHaveProperty('date');
    expect(JSON.stringify(record)).not.toContain('Delvecchio');
  });

  it('drops the participant code, which is the join key back to the account', () => {
    const record = deidentify(input);

    expect(record).not.toHaveProperty('participant_code');
    expect(JSON.stringify(record)).not.toContain('GM-000');
  });

  it('drops E3, which is what the student had never said out loud', () => {
    const record = deidentify(input);

    expect(record).not.toHaveProperty('E3');
    // E3 is stored as { answer, which_question }; neither key survives.
    expect(JSON.stringify(record)).not.toContain('which_question');
    expect(JSON.stringify(record)).not.toContain('"answer"');
  });

  it('drops E2, where the student admits what they fudged', () => {
    const record = deidentify(input);
    expect(record).not.toHaveProperty('E2');
  });
});

describe('the full-text corpus', () => {
  it('keeps the narrative once the caller asks for it explicitly', () => {
    const record = deidentify({ ...input, mode: 'full' });

    expect(record.mode).toBe('full');
    expect(record.text?.C3).toBe(responses.C3);
    expect(record.text?.A1).toHaveLength(6);
  });

  it('still drops E2, E3 and the identifiers', () => {
    const serialized = JSON.stringify(deidentify({ ...input, mode: 'full' }));

    expect(serialized).not.toContain('Delvecchio');
    expect(serialized).not.toContain('GM-000');
    expect(serialized).not.toContain('which_question');
  });
});

describe('the corpus identifier', () => {
  it('is random, so the retained copy is anonymous rather than pseudonymous', () => {
    const first = deidentify(input);
    const second = deidentify(input);

    expect(first.corpus_id).toMatch(/^gmc_[0-9a-f]{32}$/);
    expect(first.corpus_id).not.toBe(second.corpus_id);
  });
});

describe('failing loudly', () => {
  // The purge must not proceed when this throws. Losing the corpus copy is worse
  // than a late deletion, so a failure here alerts a human instead of retrying
  // on a schedule nobody is watching.
  it('refuses to write a record with no C3 to learn from', () => {
    expect(() => deidentify({ ...input, responses: { ...responses, C3: '' } })).toThrow(
      DeidentificationError
    );
  });

  it('refuses to write a record with no instances', () => {
    expect(() => deidentify({ ...input, responses: { ...responses, A1: [] } })).toThrow(
      DeidentificationError
    );
  });

  it('refuses a structured record that somehow carries free text', () => {
    const record = deidentify({ ...input, mode: 'full' });
    expect(() => assertDeidentified({ ...record, mode: 'structured' })).toThrow(
      /structured corpus record carried free text/
    );
  });
});
