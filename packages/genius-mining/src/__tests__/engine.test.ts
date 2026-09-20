import { describe, expect, it, vi } from 'vitest';
import fixture from '../../assets/fixtures/example_response_GM000.json';
import { runAnalysis, type EngineTransport } from '../engine';
import { resolveD1 } from '../resolve-d1';
import type { AnalysisResult, QuestionnaireResponses } from '../types';

const responses: QuestionnaireResponses = {
  ...(fixture as unknown as QuestionnaireResponses),
  name: 'Nick Delvecchio',
  instrument_version: '1.3',
};

const d1 = resolveD1(responses.B, responses.C1);

const goodAnalysis: AnalysisResult = {
  primary_working_word: 'FIXER',
  evidence:
    'You wrote that you kept "muttering the signal path out loud" and would "start over from the power supply".',
  secondary_pattern: { word: 'BUILDER', note: 'Two instances were things you made exist.' },
  disagreement_with_self_tally: { value: false, reason: 'Your own tally landed on REPAIRED too.' },
  body_signal_read: 'Chest tightening on the transmitter instance confirms it.',
  confidence: 'HIGH',
  thin_spots: ['E2'],
  for_the_mentor: 'Ask about a time he walked away from something broken.',
};

describe('runAnalysis', () => {
  it('returns the analysis on a clean first call', async () => {
    const transport = vi.fn<EngineTransport>().mockResolvedValue(JSON.stringify(goodAnalysis));
    const result = await runAnalysis(responses, d1, transport);

    expect(result.ok).toBe(true);
    expect(result.callsMade).toBe(1);
    expect(transport).toHaveBeenCalledTimes(1);
    if (result.ok) expect(result.analysis.primary_working_word).toBe('FIXER');
  });

  it('sends the pinned model and sampling settings', async () => {
    const transport = vi.fn<EngineTransport>().mockResolvedValue(JSON.stringify(goodAnalysis));
    await runAnalysis(responses, d1, transport);

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6', temperature: 0.1, maxTokens: 1200 })
    );
  });

  it('never puts the student name in the prompt', async () => {
    const transport = vi.fn<EngineTransport>().mockResolvedValue(JSON.stringify(goodAnalysis));
    await runAnalysis(responses, d1, transport);

    const { prompt } = transport.mock.calls[0][0];
    expect(prompt).not.toContain('Delvecchio');
    expect(prompt).not.toContain('Mackal');
  });

  it('retries exactly once when the first response fails validation', async () => {
    const transport = vi
      .fn<EngineTransport>()
      .mockResolvedValueOnce('Sure! Here is the analysis:')
      .mockResolvedValueOnce(JSON.stringify(goodAnalysis));

    const result = await runAnalysis(responses, d1, transport);

    expect(result.ok).toBe(true);
    expect(result.callsMade).toBe(2);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('stops at two calls and reports the failure rather than a third attempt', async () => {
    const transport = vi.fn<EngineTransport>().mockResolvedValue('{"primary_working_word":"LEADER"}');
    const result = await runAnalysis(responses, d1, transport);

    expect(result.ok).toBe(false);
    expect(transport).toHaveBeenCalledTimes(2);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/failed contract validation on 2 attempts/);
      // The raw responses are kept so an operator can see what the model said,
      // rather than hand-repairing it into something untraceable.
      expect(result.attempts).toHaveLength(2);
    }
  });

  it('accepts a response wrapped in the fences models add anyway', async () => {
    const transport = vi
      .fn<EngineTransport>()
      .mockResolvedValue('```json\n' + JSON.stringify(goodAnalysis) + '\n```');

    const result = await runAnalysis(responses, d1, transport);
    expect(result.ok).toBe(true);
    expect(result.callsMade).toBe(1);
  });
});
