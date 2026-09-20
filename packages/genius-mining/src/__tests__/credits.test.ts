import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_CALL_CEILING,
  canEditProfile,
  canRetryAfterValidationFailure,
  canRunAnalysis,
  initialAnalysisLedger,
  recordCall,
  settleRun,
} from '../credits';

describe('the included analysis', () => {
  it('lets a subscriber run their first complete analysis', () => {
    const decision = canRunAnalysis({
      ledger: initialAnalysisLedger(),
      kind: 'initial',
      subscriptionActive: true,
    });

    expect(decision).toMatchObject({ allowed: true, consumesIncluded: true });
  });

  it('marks the included analysis spent once it has run', () => {
    const ledger = initialAnalysisLedger();
    const decision = canRunAnalysis({ ledger, kind: 'initial', subscriptionActive: true });
    const settled = settleRun(ledger, decision);

    expect(settled.included_analysis_used).toBe(true);
    expect(settled.calls_used_this_run).toBe(0);
  });

  it('refuses a second initial run and points at the paid restart', () => {
    const decision = canRunAnalysis({
      ledger: { ...initialAnalysisLedger(), included_analysis_used: true },
      kind: 'initial',
      subscriptionActive: true,
    });

    expect(decision).toMatchObject({ allowed: false, remedy: 'purchase_restart' });
  });

  it('refuses any run without an active subscription', () => {
    const decision = canRunAnalysis({
      ledger: initialAnalysisLedger(),
      kind: 'initial',
      subscriptionActive: false,
    });

    expect(decision).toMatchObject({ allowed: false, remedy: 'resubscribe' });
  });
});

describe('editing an existing profile', () => {
  it('is free for as long as the subscription is active', () => {
    expect(canEditProfile(true)).toBe(true);
  });

  it('stops when the subscription does', () => {
    expect(canEditProfile(false)).toBe(false);
  });
});

describe('paid restarts', () => {
  it('is refused with no restart credit banked', () => {
    const decision = canRunAnalysis({
      ledger: { ...initialAnalysisLedger(), included_analysis_used: true },
      kind: 'restart',
      subscriptionActive: true,
    });

    expect(decision).toMatchObject({ allowed: false, remedy: 'purchase_restart' });
    if (!decision.allowed) expect(decision.reason).toMatch(/USD 25/);
  });

  it('spends a purchased restart credit', () => {
    const ledger = { included_analysis_used: true, restart_credits: 1, calls_used_this_run: 0 };
    const decision = canRunAnalysis({ ledger, kind: 'restart', subscriptionActive: true });

    expect(decision).toMatchObject({ allowed: true, consumesRestartCredit: true });
    expect(settleRun(ledger, decision).restart_credits).toBe(0);
  });
});

describe('admin override', () => {
  it('allows a run without spending the included analysis or a credit', () => {
    const decision = canRunAnalysis({
      ledger: { included_analysis_used: true, restart_credits: 0, calls_used_this_run: 0 },
      kind: 'restart',
      subscriptionActive: true,
      adminOverride: { grantedBy: 'adam@campusquestapp.com', reason: 'support: corrupted C3 save' },
    });

    expect(decision).toMatchObject({
      allowed: true,
      consumesIncluded: false,
      consumesRestartCredit: false,
    });
    if (decision.allowed) expect(decision.reason).toMatch(/adam@campusquestapp\.com/);
  });

  it('works even for a student whose subscription has ended, for support cases', () => {
    const decision = canRunAnalysis({
      ledger: initialAnalysisLedger(),
      kind: 'initial',
      subscriptionActive: false,
      adminOverride: { grantedBy: 'ops', reason: 'regression testing' },
    });

    expect(decision.allowed).toBe(true);
  });
});

describe('the two-call ceiling', () => {
  it('is two: one Engine 1 call plus one retry on validation failure', () => {
    expect(ANALYSIS_CALL_CEILING).toBe(2);
  });

  it('allows a retry after the first call fails validation', () => {
    const afterFirst = recordCall(initialAnalysisLedger());
    expect(afterFirst.calls_used_this_run).toBe(1);
    expect(canRetryAfterValidationFailure(afterFirst)).toBe(true);
  });

  it('refuses a third call', () => {
    const afterRetry = recordCall(recordCall(initialAnalysisLedger()));
    expect(canRetryAfterValidationFailure(afterRetry)).toBe(false);
    expect(() => recordCall(afterRetry)).toThrow(/ceiling/);
  });

  it('will not start a second run while one is in flight', () => {
    const decision = canRunAnalysis({
      ledger: { included_analysis_used: false, restart_credits: 0, calls_used_this_run: 1 },
      kind: 'initial',
      subscriptionActive: true,
    });

    expect(decision).toMatchObject({ allowed: false, remedy: 'wait_for_run' });
  });
});
