/**
 * What a student is entitled to run, and how many model calls that is allowed
 * to cost.
 *
 * Two separate budgets live here and they are easy to confuse:
 *
 *   - The *entitlement*, in student-facing terms: one complete analysis is
 *     included with the subscription, editing is free, a full restart is paid.
 *   - The *call ceiling*, in engineering terms: a single analysis run may make
 *     at most two API calls. Cost is a standing constraint on this build, not a
 *     later optimization.
 */

/**
 * Hard ceiling on model calls per analysis run: one Engine 1 call, plus one
 * retry and only when the first response fails contract validation.
 *
 * A second failure is a real failure. It surfaces to an operator instead of
 * spending a third call, because output that fails the contract twice is a
 * prompt or model problem that retrying will not fix.
 */
export const ANALYSIS_CALL_CEILING = 2;

/**
 * Price of starting over from a blank form, once the included analysis is spent.
 *
 * Editing and refining an existing profile is free for as long as the
 * subscription is active — a student who wants to sharpen a thin C3 answer
 * should never hit a paywall to do it. This charge is only for discarding a
 * completed run and taking the instrument again from scratch, which means paying
 * for a second full analysis.
 */
export const FULL_RESTART_FEE = { amount: 25, currency: 'USD' } as const;

export type AnalysisLedger = {
  /** True once the one included complete analysis has been run. */
  included_analysis_used: boolean;
  /** Paid restarts bought and not yet spent. */
  restart_credits: number;
  /** Model calls spent on the run currently in flight. */
  calls_used_this_run: number;
};

export function initialAnalysisLedger(): AnalysisLedger {
  return {
    included_analysis_used: false,
    restart_credits: 0,
    calls_used_this_run: 0,
  };
}

export type RunKind = 'initial' | 'restart';

export type EntitlementRequest = {
  ledger: AnalysisLedger;
  kind: RunKind;
  /** Subscription currently includes Genius Mining. */
  subscriptionActive: boolean;
  /**
   * Operator escape hatch for support and testing. Every use is logged with the
   * operator who granted it, so this stays an audited exception rather than a
   * quiet way around the paywall.
   */
  adminOverride?: { grantedBy: string; reason: string };
};

export type EntitlementDecision =
  | { allowed: true; consumesIncluded: boolean; consumesRestartCredit: boolean; reason: string }
  | {
      allowed: false;
      reason: string;
      remedy: 'resubscribe' | 'purchase_restart' | 'admin_override' | 'wait_for_run';
    };

export function canRunAnalysis(request: EntitlementRequest): EntitlementDecision {
  const { ledger, kind, subscriptionActive, adminOverride } = request;

  if (adminOverride) {
    return {
      allowed: true,
      consumesIncluded: false,
      consumesRestartCredit: false,
      reason: `Admin override by ${adminOverride.grantedBy}: ${adminOverride.reason}`,
    };
  }

  if (!subscriptionActive) {
    return {
      allowed: false,
      reason: 'Genius Mining is part of the paid student tier.',
      remedy: 'resubscribe',
    };
  }

  if (ledger.calls_used_this_run > 0 && ledger.calls_used_this_run < ANALYSIS_CALL_CEILING) {
    return {
      allowed: false,
      reason: 'An analysis run is already in flight for this student.',
      remedy: 'wait_for_run',
    };
  }

  if (kind === 'initial') {
    if (ledger.included_analysis_used) {
      return {
        allowed: false,
        reason: 'The included analysis has already been run. Editing the existing profile is free.',
        remedy: 'purchase_restart',
      };
    }
    return {
      allowed: true,
      consumesIncluded: true,
      consumesRestartCredit: false,
      reason: 'One complete analysis is included with the subscription.',
    };
  }

  if (ledger.restart_credits < 1) {
    return {
      allowed: false,
      reason: `A full restart from scratch costs ${FULL_RESTART_FEE.currency} ${FULL_RESTART_FEE.amount}.`,
      remedy: 'purchase_restart',
    };
  }

  return {
    allowed: true,
    consumesIncluded: false,
    consumesRestartCredit: true,
    reason: 'Spending a purchased restart.',
  };
}

/**
 * Editing an existing profile costs nothing and makes no model call — the
 * student is rewriting their own answers and the sign-off state machine records
 * the change. Refining is the point of the product, so it is never metered.
 */
export function canEditProfile(subscriptionActive: boolean): boolean {
  return subscriptionActive;
}

/** Whether a failed validation may be retried, or whether the run is out of budget. */
export function canRetryAfterValidationFailure(ledger: AnalysisLedger): boolean {
  return ledger.calls_used_this_run < ANALYSIS_CALL_CEILING;
}

export function recordCall(ledger: AnalysisLedger): AnalysisLedger {
  if (ledger.calls_used_this_run >= ANALYSIS_CALL_CEILING) {
    throw new Error(
      `Analysis call ceiling of ${ANALYSIS_CALL_CEILING} reached; refusing to spend another call.`
    );
  }
  return { ...ledger, calls_used_this_run: ledger.calls_used_this_run + 1 };
}

export function settleRun(ledger: AnalysisLedger, decision: EntitlementDecision): AnalysisLedger {
  if (!decision.allowed) return ledger;
  return {
    included_analysis_used: ledger.included_analysis_used || decision.consumesIncluded,
    restart_credits: decision.consumesRestartCredit
      ? Math.max(0, ledger.restart_credits - 1)
      : ledger.restart_credits,
    calls_used_this_run: 0,
  };
}
