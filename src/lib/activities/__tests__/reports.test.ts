import { describe, expect, it } from 'vitest';
import {
  MAX_FREE_MONTHS_PER_TERM,
  MAX_OPEN_REPORTS,
  REPORTS_PER_FREE_MONTH,
  canFileAnother,
  hashReporter,
  rewardStateFor,
  rewardsOwed,
  validateReport,
  type ActivityReport,
  type ReportInput,
} from '@/lib/activities/reports';

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    campus_id: 'uri',
    activity_id: 'engage:uri:332268',
    kind: 'defunct',
    detail: 'No meetings all semester and the officer email bounces.',
    email: 'student@uri.edu',
    notify: true,
    ...overrides,
  };
}

function report(overrides: Partial<ActivityReport> = {}): ActivityReport {
  return {
    id: 'rep_1',
    campus_id: 'uri',
    activity_id: 'engage:uri:332268',
    kind: 'defunct',
    detail: 'No meetings all semester.',
    suggested_name: null,
    reporter_hash: hashReporter('student@uri.edu'),
    reporter_email: 'student@uri.edu',
    created_at: '2026-09-01T00:00:00.000Z',
    status: 'confirmed',
    resolved_at: '2026-09-02T00:00:00.000Z',
    resolved_by: 'adam',
    resolution_note: null,
    credited: false,
    ...overrides,
  };
}

describe('validateReport', () => {
  it('accepts a report with a checkable observation', () => {
    expect(validateReport(input())).toEqual({ ok: true });
  });

  it('rejects a report too thin to check', () => {
    const result = validateReport(input({ detail: 'dead' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/what did you see/i);
  });

  it('rejects an essay', () => {
    expect(validateReport(input({ detail: 'x'.repeat(700) })).ok).toBe(false);
  });

  it('needs a name when nothing is being pointed at', () => {
    const result = validateReport(input({ kind: 'missing', activity_id: null }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/called/i);
  });

  it('accepts a missing-club report that names the club', () => {
    expect(
      validateReport(
        input({ kind: 'missing', activity_id: null, suggested_name: 'Rhody Rock Climbing' })
      )
    ).toEqual({ ok: true });
  });

  it('needs to know which listing an existing-row report is about', () => {
    expect(validateReport(input({ activity_id: null })).ok).toBe(false);
  });
});

describe('rewardStateFor', () => {
  it('counts only confirmed reports', () => {
    const state = rewardStateFor([
      report({ status: 'confirmed' }),
      report({ id: 'rep_2', status: 'pending' }),
      report({ id: 'rep_3', status: 'rejected' }),
      report({ id: 'rep_4', status: 'duplicate' }),
    ]);

    expect(state.unspent).toBe(1);
  });

  it('does not double-count a confirmation already paid out', () => {
    const state = rewardStateFor([
      report({ status: 'confirmed', credited: true }),
      report({ id: 'rep_2', status: 'confirmed', credited: false }),
    ]);

    expect(state.unspent).toBe(1);
  });

  it('reports how many more confirmations reach the next reward', () => {
    const state = rewardStateFor([report()]);

    expect(state.toNextReward).toBe(REPORTS_PER_FREE_MONTH - 1);
  });
});

describe('rewardsOwed', () => {
  it('pays nothing for a single confirmation', () => {
    // The whole point: one report is not one free month. A month for ten
    // seconds of clicking prices the reward above the work.
    expect(rewardsOwed(rewardStateFor([report()]))).toBe(0);
  });

  it('pays one month at the threshold', () => {
    const reports = Array.from({ length: REPORTS_PER_FREE_MONTH }, (_, i) =>
      report({ id: `rep_${i}` })
    );

    expect(rewardsOwed(rewardStateFor(reports))).toBe(1);
  });

  it('stops paying at the term ceiling', () => {
    const reports = Array.from({ length: REPORTS_PER_FREE_MONTH * 6 }, (_, i) =>
      report({ id: `rep_${i}` })
    );
    const state = rewardStateFor(reports, { earnedThisTerm: MAX_FREE_MONTHS_PER_TERM });

    expect(state.atCap).toBe(true);
    expect(rewardsOwed(state)).toBe(0);
  });

  it('pays only the remainder when close to the ceiling', () => {
    const reports = Array.from({ length: REPORTS_PER_FREE_MONTH * 3 }, (_, i) =>
      report({ id: `rep_${i}` })
    );
    const state = rewardStateFor(reports, { earnedThisTerm: MAX_FREE_MONTHS_PER_TERM - 1 });

    expect(rewardsOwed(state)).toBe(1);
  });
});

describe('canFileAnother', () => {
  it('allows a student with a clear queue', () => {
    expect(canFileAnother([])).toEqual({ ok: true });
  });

  it('stops a student who has flooded the queue', () => {
    const open = Array.from({ length: MAX_OPEN_REPORTS }, (_, i) =>
      report({ id: `rep_${i}`, status: 'pending' })
    );

    expect(canFileAnother(open).ok).toBe(false);
  });
});

describe('hashReporter', () => {
  it('is stable across case and whitespace, so one student is one reporter', () => {
    expect(hashReporter('  Student@URI.edu ')).toBe(hashReporter('student@uri.edu'));
  });

  it('does not store the address', () => {
    expect(hashReporter('student@uri.edu')).not.toContain('student');
  });
});
