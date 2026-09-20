import { createHash } from 'node:crypto';

/**
 * Students correcting the directory.
 *
 * This is the only mechanism that keeps a campus directory alive. Feeds tell us
 * a club is registered; they never tell us it stopped meeting in March. The
 * students in the room are the only ones who know, and they will not tell us
 * out of civic feeling alone, so the correction is rewarded.
 *
 * Rewarding it is also the part most likely to go wrong, because paying for
 * reports is paying for volume, and volume is the opposite of what a directory
 * needs. The rules below exist to buy accuracy instead:
 *
 * - Credit lands on a *confirmed* report, never on submission. A report nobody
 *   could verify earns nothing, so a fabricated one costs the student time and
 *   gains them nothing.
 * - Several confirmations make a free month, not one. A free month for ten
 *   seconds of clicking prices the reward far above the work and invites
 *   exactly the behaviour we do not want.
 * - There is a ceiling per term. Without one, the incentive scales into a job.
 * - A report never changes a listing by itself. One student should not be able
 *   to delist a rival society, so every report queues for a person.
 */

export type ReportKind =
  /** The club or event no longer exists. */
  | 'defunct'
  /** It exists, but a detail is wrong. */
  | 'details_wrong'
  /**
   * It is alive and meeting. Worth as much as a defunct report and much harder
   * to fake, since it can be checked by turning up.
   */
  | 'still_active'
  /** Something real that is missing from the directory entirely. */
  | 'missing';

export type ReportStatus = 'pending' | 'confirmed' | 'rejected' | 'duplicate';

export type ActivityReport = {
  id: string;
  campus_id: string;
  /** Null for a `missing` report, which by definition has no row yet. */
  activity_id: string | null;
  kind: ReportKind;
  /** What the student actually observed. Free text, required. */
  detail: string;
  /** Only for `missing`. */
  suggested_name: string | null;
  /** One-way hash, for deduplication and rate limiting without a mailing list. */
  reporter_hash: string;
  reporter_email: string | null;
  created_at: string;

  status: ReportStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  /** Whether this confirmation has already been counted toward a reward. */
  credited: boolean;
};

/** Confirmed reports needed for one free month. */
export const REPORTS_PER_FREE_MONTH = 3;

/** Free months a single student can earn in one term. */
export const MAX_FREE_MONTHS_PER_TERM = 2;

/**
 * Unresolved reports one student may have open at once.
 *
 * A queue is a person's time. Someone who has filed five things we have not got
 * to does not need a sixth; they need us to catch up.
 */
export const MAX_OPEN_REPORTS = 5;

/** Enough detail to be checkable, short enough that nobody pastes an essay. */
export const MIN_DETAIL_LENGTH = 15;
export const MAX_DETAIL_LENGTH = 600;

export function hashReporter(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export type ReportInput = {
  campus_id: string;
  activity_id: string | null;
  kind: ReportKind;
  detail: string;
  suggested_name?: string | null;
  email: string;
  /** Whether to keep the address so we can tell them the outcome. */
  notify: boolean;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateReport(input: ReportInput): ValidationResult {
  const detail = input.detail.trim();

  if (detail.length < MIN_DETAIL_LENGTH) {
    return {
      ok: false,
      error:
        'Tell us a bit more. What did you see — no meetings all semester, a dead link, an officer who said it folded?',
    };
  }

  if (detail.length > MAX_DETAIL_LENGTH) {
    return { ok: false, error: 'That is longer than we need. A couple of sentences is plenty.' };
  }

  if (input.kind === 'missing') {
    if (!input.suggested_name?.trim()) {
      return { ok: false, error: 'What is it called?' };
    }
  } else if (!input.activity_id) {
    return { ok: false, error: 'We could not tell which listing this is about.' };
  }

  if (!input.email.includes('@')) {
    return { ok: false, error: 'We need an email so we can credit the account.' };
  }

  return { ok: true };
}

export type RewardState = {
  /** Confirmed reports not yet spent on a free month. */
  unspent: number;
  /** Free months earned this term. */
  earnedThisTerm: number;
  /** How many more confirmations until the next free month. */
  toNextReward: number;
  /** Whether this student has hit the ceiling. */
  atCap: boolean;
};

/**
 * Turn a student's confirmed reports into what they have earned.
 *
 * Deliberately a pure function over the report rows rather than a running
 * balance on the account. A stored counter drifts the moment a report is
 * un-confirmed, and recomputing from the rows means the ledger is always the
 * reports themselves.
 */
export function rewardStateFor(
  reports: ActivityReport[],
  { earnedThisTerm = 0 }: { earnedThisTerm?: number } = {}
): RewardState {
  const confirmed = reports.filter((report) => report.status === 'confirmed');
  const unspent = confirmed.filter((report) => !report.credited).length;
  const atCap = earnedThisTerm >= MAX_FREE_MONTHS_PER_TERM;

  return {
    unspent,
    earnedThisTerm,
    toNextReward: Math.max(0, REPORTS_PER_FREE_MONTH - (unspent % REPORTS_PER_FREE_MONTH)),
    atCap,
  };
}

/** How many free months a batch of confirmations has just earned. */
export function rewardsOwed(state: RewardState): number {
  if (state.atCap) return 0;
  const earned = Math.floor(state.unspent / REPORTS_PER_FREE_MONTH);
  return Math.min(earned, MAX_FREE_MONTHS_PER_TERM - state.earnedThisTerm);
}

/**
 * Whether a report changes anything on its own.
 *
 * It does not, and this function exists to say so in one obvious place. A
 * single student marking a rival society defunct must not delist it, and a
 * hundred students marking the same thing still queues rather than fires,
 * because a hundred students can be one person with a hundred addresses.
 */
export function appliesAutomatically(): false {
  return false;
}

export function canFileAnother(open: ActivityReport[]): ValidationResult {
  if (open.length >= MAX_OPEN_REPORTS) {
    return {
      ok: false,
      error: `You have ${open.length} reports we have not got to yet. Give us a chance to catch up and then send more.`,
    };
  }
  return { ok: true };
}
