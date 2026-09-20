import { describe, expect, it } from 'vitest';
import fixture from '../../assets/fixtures/example_response_GM000.json';
import {
  PayloadLeakError,
  buildAnalysisPayload,
  buildRecommendationInputs,
  stripIdentifiers,
} from '../payload';
import { resolveD1 } from '../resolve-d1';
import { engineVisibleFieldIds } from '../schema';
import type { PathwayEntry, QuestionnaireResponses } from '../types';

const responses = {
  ...(fixture as unknown as QuestionnaireResponses),
  name: 'Nick Delvecchio',
  date: '2026-09-01',
  instrument_version: '1.3',
};

const d1 = resolveD1(responses.B, responses.C1);

describe('the engine payload is driven by the schema flag', () => {
  it('sends exactly the fields flagged sent_to_engine, plus the derived resolution', () => {
    const payload = buildAnalysisPayload(responses, d1);
    const expected = new Set([...engineVisibleFieldIds(), 'D1_resolution']);

    expect(new Set(Object.keys(payload))).toEqual(expected);
  });

  it('includes the intimate material Engine 1 is meant to see', () => {
    const payload = buildAnalysisPayload(responses, d1);

    expect(payload.C2).toBe(responses.C2);
    expect(payload.C3).toBe(responses.C3);
    expect(payload.E3).toEqual(responses.E3);
  });
});

describe('what never reaches Engine 1', () => {
  it('strips the name', () => {
    const payload = buildAnalysisPayload(responses, d1);

    expect(payload).not.toHaveProperty('name');
    expect(JSON.stringify(payload)).not.toContain('Delvecchio');
  });

  it('withholds A4 and its consent flag', () => {
    const payload = buildAnalysisPayload(responses, d1);

    expect(payload).not.toHaveProperty('A4');
    expect(payload).not.toHaveProperty('A4_consent');
    expect(JSON.stringify(payload)).not.toContain('Mackal');
  });

  it('withholds the participant code and the date', () => {
    const payload = buildAnalysisPayload(responses, d1);

    expect(payload).not.toHaveProperty('participant_code');
    expect(payload).not.toHaveProperty('date');
  });
});

describe('the derived D1 values', () => {
  it('sends what the resolution settled on, not what is denormalized on the row', () => {
    const payload = buildAnalysisPayload({ ...responses, D1: 'BUILT', D2: 'BUILDER' }, d1);

    expect(payload.D1).toBe('REPAIRED');
    expect(payload.D2).toBe('FIXER');
    expect(payload.D1_resolution).toBe('tie_broken_by_C1');
  });

  it('tells the engine the tally was unresolved rather than hiding it', () => {
    const unresolved = resolveD1(
      [
        { instance: 1, verb: 'BUILT' },
        { instance: 2, verb: 'SORTED' },
        { instance: 3, verb: 'BUILT' },
        { instance: 4, verb: 'SORTED' },
      ],
      [1, 4]
    );
    const payload = buildAnalysisPayload(responses, unresolved);

    expect(payload.D1).toBeNull();
    expect(payload.D1_resolution).toBe('UNRESOLVED');
  });
});

describe('the Engine 2 payload', () => {
  const verified: PathwayEntry[] = [
    {
      id: 'uri-makerspace',
      working_words: ['BUILDER', 'FIXER'],
      scope: 'on_campus',
      name: 'MakerspaceURI',
      location: 'Carothers Library, Room 165',
      category: 'facility',
      what_it_is: 'Free to every student.',
      how_to_join: 'Walk in.',
      low_commitment_entry: true,
      adjacent_fields: ['Mechanical Engineering'],
      verified: true,
      source: 'Confirmed 27 August 2026',
    },
  ];

  it('carries A4 and the working word but none of the body signals', () => {
    const inputs = buildRecommendationInputs('FIXER', responses, verified);
    const serialized = JSON.stringify(inputs);

    expect(inputs.a4Entries).toHaveLength(3);
    expect(inputs.d3Sentence).toBe(responses.D3);
    expect(serialized).not.toContain(responses.C2);
    expect(serialized).not.toContain(responses.C3);
  });

  it('refuses to pass an unverified pathway row', () => {
    const unverified = [{ ...verified[0], id: 'PLACEHOLDER', verified: false }];

    expect(() => buildRecommendationInputs('FIXER', responses, unverified)).toThrow(
      PayloadLeakError
    );
  });

  it('never sends the student name', () => {
    const inputs = buildRecommendationInputs('FIXER', responses, verified);
    expect(JSON.stringify(inputs)).not.toContain('Delvecchio');
  });
});

describe('stripIdentifiers', () => {
  it('drops the header identifiers from a stored row', () => {
    const stripped = stripIdentifiers(responses);

    expect(stripped).not.toHaveProperty('name');
    expect(stripped).not.toHaveProperty('date');
    expect(stripped.participant_code).toBe('GM-000');
  });
});
