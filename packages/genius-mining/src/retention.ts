import type { Entitlement, EntitlementInputs } from './entitlement';
import { resolveEntitlement } from './entitlement';
import { inPaymentGrace, type SubscriptionSnapshot } from './subscription';
import type { MembershipStatus, RetentionState } from './types';

export const RETENTION_WINDOW_DAYS = 30;
export const FIRST_WARNING_DAY = 7;
export const SECOND_WARNING_DAY = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

export function initialRetentionState(): RetentionState {
  return {
    membership_status: 'active',
    lapsed_at: null,
    purge_due_at: null,
    warning_7_sent_at: null,
    warning_25_sent_at: null,
    deidentified_copy_retained: false,
  };
}

export type RetentionTransition = 'clock_started' | 'clock_cleared' | 'unchanged';

export type RetentionDecision = {
  state: RetentionState;
  transition: RetentionTransition;
  reason: string;
};

/**
 * Folds an entitlement change into the retention state.
 *
 * The clock runs on entitlement, not on billing. A student who loses Genius
 * Mining — by cancelling, by downgrading to Basic or Free, or by their school's
 * seat expiring — gets `lapsed_at` stamped and a purge scheduled 30 days out.
 * Regaining it by any route clears the lapse and deletes nothing, which is the
 * whole reason this takes an entitlement rather than a subscription: when an
 * institution picks a student up, their card stops being charged, and a clock
 * keyed to the card would read that as abandonment and delete their answers.
 *
 * Once a record is purged it stays purged. Restoring access cannot un-delete
 * answers, and the consent copy promises the student exactly that.
 */
export function applyEntitlementChange(
  current: RetentionState,
  entitlement: Entitlement,
  options: { subscription?: SubscriptionSnapshot } = {},
  now: Date = new Date()
): RetentionDecision {
  if (current.membership_status === 'purged') {
    return {
      state: current,
      transition: 'unchanged',
      reason: 'Record is already purged. Deletion is permanent; the student retakes the form.',
    };
  }

  const grace = options.subscription ? inPaymentGrace(options.subscription) : false;

  if (entitlement.geniusMining) {
    if (current.lapsed_at === null && current.membership_status === 'active') {
      return {
        state: current,
        transition: 'unchanged',
        reason: entitlement.reason,
      };
    }

    return {
      state: {
        ...current,
        membership_status: 'active',
        lapsed_at: null,
        purge_due_at: null,
        warning_7_sent_at: null,
        warning_25_sent_at: null,
      },
      transition: 'clock_cleared',
      reason: `Access restored before the purge ran, so nothing is deleted. ${entitlement.reason}`,
    };
  }

  if (grace) {
    return {
      state: current,
      transition: 'unchanged',
      reason: `Subscription is ${options.subscription!.status}. A failing payment does not start the deletion clock.`,
    };
  }

  if (current.lapsed_at !== null) {
    return {
      state: current,
      transition: 'unchanged',
      reason: 'Clock is already running; the original lapse date stands.',
    };
  }

  const lapsedAt = now;
  const status = options.subscription?.status ?? 'none';
  const membershipStatus: MembershipStatus =
    status === 'canceled' || status === 'none' ? 'cancelled' : 'lapsed';

  return {
    state: {
      ...current,
      membership_status: membershipStatus,
      lapsed_at: lapsedAt.toISOString(),
      purge_due_at: new Date(lapsedAt.getTime() + RETENTION_WINDOW_DAYS * DAY_MS).toISOString(),
      warning_7_sent_at: null,
      warning_25_sent_at: null,
    },
    transition: 'clock_started',
    reason: `${entitlement.reason} Identified data is deleted in ${RETENTION_WINDOW_DAYS} days.`,
  };
}

/**
 * Convenience wrapper for the common case: a student with no institutional seat
 * whose access rises and falls with their own subscription.
 */
export function applySubscriptionChange(
  current: RetentionState,
  subscription: SubscriptionSnapshot,
  now: Date = new Date()
): RetentionDecision {
  return applyEntitlementChange(
    current,
    resolveEntitlement({ subscription }, now),
    { subscription },
    now
  );
}

/** Resolves the entitlement and folds it in, in one step. */
export function applyAccessChange(
  current: RetentionState,
  inputs: EntitlementInputs,
  now: Date = new Date()
): RetentionDecision & { entitlement: Entitlement } {
  const entitlement = resolveEntitlement(inputs, now);
  const decision = applyEntitlementChange(
    current,
    entitlement,
    { subscription: inputs.subscription },
    now
  );
  return { ...decision, entitlement };
}

export type RetentionAction =
  | { action: 'none' }
  | { action: 'warn'; day: 7 | 25; daysUntilPurge: number }
  | { action: 'purge'; purgeDueAt: string };

/**
 * What the retention job should do for one record right now.
 *
 * Returns a single action per call so the job stays idempotent: the caller
 * stamps the timestamp it just acted on, and the next pass moves on.
 */
export function retentionActionDue(state: RetentionState, now: Date = new Date()): RetentionAction {
  if (state.membership_status === 'purged') return { action: 'none' };
  if (!state.lapsed_at || !state.purge_due_at) return { action: 'none' };

  const lapsedAt = new Date(state.lapsed_at).getTime();
  const purgeDueAt = new Date(state.purge_due_at).getTime();
  const elapsedDays = (now.getTime() - lapsedAt) / DAY_MS;
  const daysUntilPurge = Math.max(0, Math.ceil((purgeDueAt - now.getTime()) / DAY_MS));

  if (now.getTime() >= purgeDueAt) {
    return { action: 'purge', purgeDueAt: state.purge_due_at };
  }

  if (elapsedDays >= SECOND_WARNING_DAY && !state.warning_25_sent_at) {
    return { action: 'warn', day: 25, daysUntilPurge };
  }

  if (elapsedDays >= FIRST_WARNING_DAY && !state.warning_7_sent_at) {
    return { action: 'warn', day: 7, daysUntilPurge };
  }

  return { action: 'none' };
}

export function markWarningSent(
  state: RetentionState,
  day: 7 | 25,
  now: Date = new Date()
): RetentionState {
  const stamp = now.toISOString();
  return day === 7
    ? { ...state, warning_7_sent_at: stamp }
    : { ...state, warning_25_sent_at: stamp };
}

/**
 * Marks a record purged. Only ever called after the de-identified copy is
 * confirmed in the development corpus — see `deidentify.ts`.
 */
export function markPurged(state: RetentionState): RetentionState {
  return {
    ...state,
    membership_status: 'purged',
    deidentified_copy_retained: true,
  };
}
