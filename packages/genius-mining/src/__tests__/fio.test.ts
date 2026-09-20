import { describe, expect, it, vi } from 'vitest';
import { checkFioRules, parseFioResponse, validateFioAnalysis } from '../fio-validate';
import { FIO_CALL_CEILING, FioOrderingError, assembleFioResult, runFioAnalysis } from '../fio-engine';
import { cipCoverage } from '../cip-pathways';
import type { FioAnalysisResult } from '../fio-types';

/**
 * There is deliberately NO golden test here.
 *
 * No validated domain run exists for any participant — GM-001 validates the
 * working-word half only. A fixture written against a guessed expectation is
 * worse than no fixture, because it will be trusted. These tests exercise the
 * contract and the rules, which are knowable; they do not assert that any
 * particular domain read is correct, which is not.
 */

const valid: FioAnalysisResult = {
  domains: [
    {
      domain_family: 'DIGITAL_SOFTWARE',
      raw_subject: "Coding a website for my uncle's business",
      source_items: ['A1.1', 'C1', 'C3'],
      weight: 'PRIMARY',
    },
  ],
  domain_confidence: 'MEDIUM',
  domain_evidence_thin: false,
  thin_reason: '',
  spectator_only: [],
  for_the_mentor: 'Would he still choose this if nobody had asked him to?',
};

describe('FIO output contract', () => {
  it('accepts a well-formed result', () => {
    expect(validateFioAnalysis(valid).ok).toBe(true);
  });

  it('rejects a domain family outside the sixteen', () => {
    const drifted = {
      ...valid,
      domains: [{ ...valid.domains[0], domain_family: 'ROBOTICS' }],
    };
    expect(validateFioAnalysis(drifted).ok).toBe(false);
  });

  it('rejects more than three domains', () => {
    const tooMany = {
      ...valid,
      domains: Array.from({ length: 4 }, () => ({ ...valid.domains[0], weight: 'TRACE' as const })),
    };
    expect(validateFioAnalysis(tooMany).ok).toBe(false);
  });

  it('strips code fences before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(valid) + '\n```';
    expect(parseFioResponse(fenced).ok).toBe(true);
  });
});

describe('rules enforced in code, not documentation', () => {
  it('allows at most one PRIMARY', () => {
    const two = {
      ...valid,
      domains: [valid.domains[0], { ...valid.domains[0], domain_family: 'BUILT_ENVIRONMENT' as const }],
    };
    expect(checkFioRules(two)).toContainEqual(expect.stringContaining('At most one domain'));
  });

  it('requires C1 or C3 support for a PRIMARY', () => {
    const unsupported = {
      ...valid,
      domains: [{ ...valid.domains[0], source_items: ['A1.1', 'D3'] }],
    };
    expect(checkFioRules(unsupported)).toContainEqual(expect.stringContaining('requires a C1-circled'));
  });

  it('forces LOW confidence when there is no PRIMARY', () => {
    const noPrimary = {
      ...valid,
      domains: [{ ...valid.domains[0], weight: 'SECONDARY' as const }],
      domain_confidence: 'HIGH' as const,
    };
    expect(checkFioRules(noPrimary)).toContainEqual(expect.stringContaining('must report domain_confidence LOW'));
  });

  it('treats A4 in source_items as a build failure', () => {
    const leaked = {
      ...valid,
      domains: [{ ...valid.domains[0], source_items: ['C3', 'A4.1'] }],
    };
    expect(checkFioRules(leaked)).toContainEqual(expect.stringContaining('build failure'));
  });

  it('rejects output that names a working word', () => {
    const drifted = { ...valid, for_the_mentor: 'Does BUILDER really fit him?' };
    expect(checkFioRules(drifted)).toContainEqual(expect.stringContaining('prompt has drifted'));
  });

  it('requires a reason when evidence is flagged thin', () => {
    const thin = { ...valid, domain_evidence_thin: true, thin_reason: '  ' };
    expect(checkFioRules(thin)).toContainEqual(expect.stringContaining('thin_reason is empty'));
  });
});

describe('ordering and cost', () => {
  const responses = { participant_code: 'GM-001' } as never;
  const d1 = { computed_verb: 'BUILT', resolution: 'modal' } as never;

  it('refuses to run Call 2 before Call 1 has produced a working word', async () => {
    const transport = vi.fn();
    await expect(
      runFioAnalysis(responses, d1, {} as never, transport)
    ).rejects.toBeInstanceOf(FioOrderingError);
    expect(transport).not.toHaveBeenCalled();
  });

  it('spends no more than the FIO call ceiling on malformed output', async () => {
    const transport = vi.fn().mockResolvedValue('not json');
    const profile = { primary_working_word: 'BUILDER' } as never;

    const result = await runFioAnalysis(responses, d1, profile, transport);

    expect(result.ok).toBe(false);
    expect(transport).toHaveBeenCalledTimes(FIO_CALL_CEILING);
  });
});

describe('assembly', () => {
  it('stamps provenance and copies the working word rather than re-deriving it', () => {
    const result = assembleFioResult({
      participantCode: 'GM-001',
      analysis: valid,
      workingWordRef: 'BUILDER',
      runAt: new Date('2026-09-12T00:00:00Z'),
    });

    expect(result.fio_engine_version).toBe('fio-1.0');
    expect(result.working_word_ref).toBe('BUILDER');
    expect(result.status).toBe('draft');
  });
});

describe('CIP coverage gate', () => {
  it('blocks a cohort while the table is empty and the edition is unpinned', () => {
    const coverage = cipCoverage();
    expect(coverage.readyForCohort).toBe(false);
    expect(coverage.blocking.length).toBeGreaterThan(0);
  });
});

