import { describe, expect, it } from 'vitest';
import {
  MIN_VERIFIED_PER_WORKING_WORD,
  coverageReport,
  engine2Enabled,
  verifiedPathwaysFor,
} from '../pathways';

describe('verified rows only', () => {
  it('never returns an unverified row', () => {
    const all = coverageReport('uri');
    expect(all.rows.every((row) => row.verifiedCount >= 0)).toBe(true);

    // The URI set carries a PLACEHOLDER row for TEACHER awaiting the URInvolved
    // export. It must not surface.
    expect(verifiedPathwaysFor('uri', 'TEACHER')).toHaveLength(0);
  });

  it('returns the seeded BUILDER rows', () => {
    const builder = verifiedPathwaysFor('uri', 'BUILDER');

    expect(builder).toHaveLength(4);
    expect(builder.map((entry) => entry.id)).toContain('uri-makerspace');
    expect(builder.every((entry) => entry.verified)).toBe(true);
  });

  it('throws on a campus with no pathway set rather than returning nothing', () => {
    expect(() => verifiedPathwaysFor('unknown-campus', 'BUILDER')).toThrow(/No pathway set/);
  });
});

describe('the coverage gate', () => {
  it('requires three verified entries per working word', () => {
    expect(MIN_VERIFIED_PER_WORKING_WORD).toBe(3);
  });

  it('does not pass for URI yet', () => {
    // Seven of eight words are below the gate pending the URInvolved export.
    // When this test starts failing, the gate has been cleared and Engine 2 can
    // be switched on for the cohort.
    const report = coverageReport('uri');

    expect(report.passes).toBe(false);
    expect(report.blockedWords).toContain('TEACHER');
    expect(report.blockedWords).toContain('PROTECTOR');
  });

  it('reports BUILDER as the one word currently clearing the gate', () => {
    const report = coverageReport('uri');
    const passing = report.rows.filter((row) => row.meetsGate).map((row) => row.workingWord);

    expect(passing).toEqual(['BUILDER']);
  });

  it('covers all eight working words in the report', () => {
    expect(coverageReport('uri').rows).toHaveLength(8);
  });
});

describe('engine2Enabled', () => {
  it('is on per working word, so BUILDER need not wait for the rest', () => {
    expect(engine2Enabled('uri', 'BUILDER')).toBe(true);
  });

  it('is off for a word that would land the student on an empty page', () => {
    expect(engine2Enabled('uri', 'PROTECTOR')).toBe(false);
    expect(engine2Enabled('uri', 'TEACHER')).toBe(false);
  });
});
