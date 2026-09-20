import { describe, expect, it } from 'vitest';
import {
  A1_COUNT,
  INSTRUMENT_VERSION,
  SECTION_IDS,
  engineVisibleFieldIds,
  getField,
  piiFieldIds,
  questionnaire,
} from '../schema';
import {
  FIRST_DIGITAL_CODE,
  isPaperCode,
  isValidParticipantCode,
  nextDigitalCode,
} from '../participant-code';
import { VERB_TO_WORKING_WORD } from '../resolve-d1';

describe('the instrument', () => {
  it('is v1.3 and owned by Hidden Genius Labs', () => {
    expect(INSTRUMENT_VERSION).toBe('1.3');
    expect(questionnaire.owner).toBe('Hidden Genius Labs LLC');
  });

  it('runs A through E across two sittings', () => {
    expect(SECTION_IDS).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(questionnaire.sittings).toBe(2);
  });

  it('is sequential with no backtracking, and hides D until A-C are done', () => {
    expect(questionnaire.rules.sequential_only).toBe(true);
    expect(questionnaire.rules.allow_backtrack).toBe(false);
    expect(questionnaire.rules.reveal_section_D_before_ABC_complete).toBe(false);
  });

  it('always renders the support resources block and never collapses it', () => {
    expect(questionnaire.rules.support_resources_block_always_rendered).toBe(true);
    expect(questionnaire.support_resources.may_be_collapsed).toBe(false);
    expect(questionnaire.support_resources.entries.length).toBeGreaterThan(0);
  });

  it('asks for six A1 instances, which B and C1 are bound to', () => {
    expect(A1_COUNT).toBe(6);
    expect(getField('B').count).toBe(6);
    expect(getField('C1').index_range).toEqual([1, 6]);
  });
});

describe('the analysis weighting', () => {
  it('ranks C3 heaviest and Section B fourth', () => {
    expect(questionnaire.analysis_weighting).toEqual(['C3', 'C1', 'D3', 'B', '*']);
    expect(getField('C3').analysis_weight).toBe(1);
    expect(getField('C1').analysis_weight).toBe(2);
    expect(getField('D3').analysis_weight).toBe(3);
    expect(getField('B').analysis_weight).toBe(4);
  });
});

describe('the verb vocabulary', () => {
  it('holds eight verbs, fixed', () => {
    expect(questionnaire.verb_vocabulary).toHaveLength(8);
    expect(getField('B').options_are_fixed).toBe(true);
  });

  it('is post-v1.3, so CONNECTED replaced PERSUADED', () => {
    const verbs = questionnaire.verb_vocabulary.map((entry) => entry.verb);

    expect(verbs).toContain('CONNECTED');
    expect(verbs).not.toContain('PERSUADED');
  });

  it('agrees with the D2 lookup table', () => {
    for (const entry of questionnaire.verb_vocabulary) {
      expect(VERB_TO_WORKING_WORD[entry.verb]).toBe(entry.maps_to_working_word);
    }
    expect(getField('D2').lookup_table).toEqual(VERB_TO_WORKING_WORD);
  });
});

describe('the engine visibility flags', () => {
  it('lets Engine 1 see the analysis fields', () => {
    expect(engineVisibleFieldIds()).toEqual([
      'A1',
      'A2',
      'A3',
      'B',
      'C1',
      'C2',
      'C3',
      'D1',
      'D2',
      'D3',
      'E1',
      'E2',
      'E3',
    ]);
  });

  it('withholds the name, the date, the participant code, A4 and its consent flag', () => {
    const visible = engineVisibleFieldIds();

    for (const withheld of ['name', 'date', 'participant_code', 'A4', 'A4_consent']) {
      expect(visible).not.toContain(withheld);
    }
  });

  it('flags the name and A4 as pii', () => {
    expect(piiFieldIds()).toEqual(['name', 'A4']);
  });

  it('defaults the A4 consent checkbox to unchecked', () => {
    const consent = getField('A4_consent');

    expect(consent.default).toBe(false);
    expect(consent.required).toBe(false);
  });

  it('gates A4 on that checkbox', () => {
    expect(getField('A4').gated_by).toBe('A4_consent');
  });
});

describe('participant codes', () => {
  it('accepts GM-### and rejects anything else', () => {
    expect(isValidParticipantCode('GM-001')).toBe(true);
    expect(isValidParticipantCode('GM-1000')).toBe(true);
    expect(isValidParticipantCode('GM-1')).toBe(false);
    expect(isValidParticipantCode('gm-001')).toBe(false);
    expect(isValidParticipantCode('100')).toBe(false);
  });

  it('reserves GM-001 to GM-099 for the paper runs', () => {
    expect(isPaperCode('GM-001')).toBe(true);
    expect(isPaperCode('GM-099')).toBe(true);
    expect(isPaperCode('GM-100')).toBe(false);
  });

  it('starts digital sign-ups at GM-100 even on an empty table', () => {
    expect(nextDigitalCode(null)).toBe('GM-100');
    expect(nextDigitalCode(0)).toBe('GM-100');
    expect(FIRST_DIGITAL_CODE).toBe(100);
  });

  it('never allocates back into the paper range', () => {
    expect(nextDigitalCode(42)).toBe('GM-100');
  });

  it('continues past GM-100', () => {
    expect(nextDigitalCode(100)).toBe('GM-101');
    expect(nextDigitalCode(999)).toBe('GM-1000');
  });
});
