import { describe, expect, it } from 'vitest';
import expected from '../../assets/fixtures/gm001_expected.json';
import { assembleProfile } from '../engine';
import {
  citesThinSpot,
  parseAnalysisResponse,
  stripCodeFences,
  validateProfile,
} from '../validate';
import type { AnalysisResult } from '../types';

const validAnalysis: AnalysisResult = {
  primary_working_word: 'FIXER',
  evidence:
    'You wrote that you kept "muttering the signal path out loud" while tracing the board, and that you started over from the power supply each time.',
  secondary_pattern: { word: 'BUILDER', note: 'Two of the six instances were things you made exist.' },
  disagreement_with_self_tally: { value: false, reason: 'Your own tally landed on REPAIRED too.' },
  body_signal_read: 'Chest tightening on the transmitter instance confirms the reading.',
  confidence: 'HIGH',
  thin_spots: [],
  for_the_mentor: 'Ask him about a time he walked away from something broken.',
};

describe('stripCodeFences', () => {
  it('leaves bare JSON alone', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });

  it('removes the fences models add anyway', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe('parseAnalysisResponse', () => {
  it('accepts a well-formed analysis', () => {
    const result = parseAnalysisResponse(JSON.stringify(validAnalysis));
    expect(result.ok).toBe(true);
  });

  it('accepts one wrapped in markdown fences', () => {
    const result = parseAnalysisResponse('```json\n' + JSON.stringify(validAnalysis) + '\n```');
    expect(result.ok).toBe(true);
  });

  it('rejects a non-JSON response instead of guessing at it', () => {
    const result = parseAnalysisResponse("Here's the profile you asked for!");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/not JSON/);
  });

  it('rejects a working word outside the eight', () => {
    const result = parseAnalysisResponse(
      JSON.stringify({ ...validAnalysis, primary_working_word: 'LEADER' })
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a missing key rather than defaulting it', () => {
    const { for_the_mentor: _omitted, ...incomplete } = validAnalysis;
    const result = parseAnalysisResponse(JSON.stringify(incomplete));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/for_the_mentor/);
  });

  it('rejects commentary smuggled in as an extra key', () => {
    const result = parseAnalysisResponse(
      JSON.stringify({ ...validAnalysis, note_to_reader: 'Great answers!' })
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a confidence value outside the three', () => {
    const result = parseAnalysisResponse(
      JSON.stringify({ ...validAnalysis, confidence: 'VERY HIGH' })
    );
    expect(result.ok).toBe(false);
  });
});

describe('assembleProfile', () => {
  it('stamps the provenance an advisor needs and validates against the contract', () => {
    const profile = assembleProfile({
      participantCode: 'GM-100',
      analysis: validAnalysis,
      d1Resolution: { computed_verb: 'REPAIRED', resolution: 'tie_broken_by_C1' },
      runAt: new Date('2026-09-06T18:00:00.000Z'),
    });

    expect(profile.participant_code).toBe('GM-100');
    expect(profile.instrument_version).toBe('1.3');
    expect(profile.engine_version).toBe('analysis-1.2');
    expect(profile.model).toBe('claude-sonnet-4-6');
    expect(profile.run_at).toBe('2026-09-06T18:00:00.000Z');
    expect(profile.status).toBe('draft');
  });

  it('rejects a participant code that is not in GM-### form', () => {
    expect(() =>
      assembleProfile({
        participantCode: 'nick',
        analysis: validAnalysis,
        d1Resolution: { computed_verb: 'REPAIRED', resolution: 'modal' },
      })
    ).toThrow(/contract/);
  });

  it('carries an UNRESOLVED d1_resolution through onto the profile', () => {
    const profile = assembleProfile({
      participantCode: 'GM-001',
      analysis: { ...validAnalysis, primary_working_word: 'BUILDER', confidence: 'MEDIUM' },
      d1Resolution: {
        computed_verb: null,
        resolution: 'UNRESOLVED',
        candidates: ['BUILT', 'SORTED'],
        student_tiebreak_choice: 'BUILT',
      },
    });

    expect(profile.d1_resolution?.resolution).toBe('UNRESOLVED');
    expect(profile.d1_resolution?.computed_verb).toBeNull();
  });
});

describe('the GM-001 expectations', () => {
  // Corrected 12 Sept 2026 against the handwritten original: instance 5 is
  // PERFORMED, not SORTED. BUILT wins outright. This is not a tiebreak case.
  it('describes a clean modal D1, not the unresolved tiebreak path', () => {
    expect(expected.d1_resolution.resolution).toBe('modal');
    expect(expected.d1_resolution.computed_verb).toBe('BUILT');
    expect(expected.d1_resolution.candidates).toEqual([]);
    expect(expected._assertions.d1_resolution_must_equal).toBe('modal');
  });

  it('records BUILDER at MEDIUM confidence', () => {
    expect(expected.primary_working_word).toBe('BUILDER');
    expect(expected.confidence).toBe('MEDIUM');
    expect(expected.confidence).not.toBe('LOW');
  });

  it('is a v1.1 run and so cannot validate the current instrument', () => {
    expect(expected.instrument_version).toBe('1.1');
  });
});

describe('citesThinSpot', () => {
  it('catches a rendering about to quote back a discounted answer', () => {
    expect(citesThinSpot('Your answer to C2 shows this clearly.', ['C2', 'E2'])).toBe('C2');
  });

  it('matches an indexed thin spot on its field id', () => {
    expect(citesThinSpot('Evidence from A1 backs this up.', ['A1#6'])).toBe('A1#6');
  });

  it('does not fire on a longer field id that merely starts the same', () => {
    expect(citesThinSpot('See C22 for detail.', ['C2'])).toBeNull();
  });

  it('passes text that cites nothing thin', () => {
    expect(citesThinSpot('Your C3 answer carries the reading.', ['C2', 'E2'])).toBeNull();
  });
});

describe('validateProfile', () => {
  it('rejects an unknown status', () => {
    const result = validateProfile({
      ...validAnalysis,
      participant_code: 'GM-100',
      instrument_version: '1.3',
      engine_version: 'analysis-1.2',
      model: 'claude-sonnet-4-6',
      run_at: new Date().toISOString(),
      status: 'published',
    });

    expect(result.ok).toBe(false);
  });
});
