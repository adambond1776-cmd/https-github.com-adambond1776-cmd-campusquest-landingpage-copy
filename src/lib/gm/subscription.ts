import {
  applyAccessChange,
  billingAdjustmentFor,
  type BillingAdjustment,
  type InstitutionalCoverage,
  type SubscriptionSnapshot,
  type SubscriptionStatus,
  type Tier,
} from '@hiddengeniuslabs/genius-mining';
import { sendOperatorAlert } from '@/lib/alerts';
import { getStore } from '@/lib/gm/store';

const TIERS: Tier[] = ['free', 'basic', 'premium', 'club'];

const STATUSES: SubscriptionStatus[] = [
  'none',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
  'incomplete_expired',
  'canceled',
];

export function parseSnapshot(input: unknown): SubscriptionSnapshot | null {
  if (typeof input !== 'object' || input === null) return null;

  const candidate = input as { tier?: unknown; status?: unknown };
  const tier = TIERS.find((value) => value === candidate.tier);
  const status = STATUSES.find((value) => value === candidate.status);

  if (!tier || !status) return null;
  return { tier, status };
}

export function parseCoverage(input: unknown): InstitutionalCoverage | null {
  if (typeof input !== 'object' || input === null) return null;

  const candidate = input as Partial<InstitutionalCoverage>;
  if (typeof candidate.campus_id !== 'string' || !candidate.campus_id) return null;
  if (typeof candidate.starts_at !== 'string') return null;

  return {
    campus_id: candidate.campus_id,
    covers_genius_mining: candidate.covers_genius_mining !== false,
    starts_at: candidate.starts_at,
    ends_at: typeof candidate.ends_at === 'string' ? candidate.ends_at : null,
  };
}

export type ApplyOutcome = {
  participantCode: string;
  transition: 'clock_started' | 'clock_cleared' | 'unchanged';
  reason: string;
  entitled: boolean;
  entitlementSource: string;
  billing: BillingAdjustment;
};

/**
 * Folds a change in what a student is entitled to into their record.
 *
 * Both a Stripe event and an institutional contract land here, because the
 * decision depends on both at once. The 30-day clock reads the resolved
 * entitlement, so cancelling a card that a university has already replaced is a
 * no-op rather than a countdown to deletion.
 */
export async function applyToStudent(
  userId: string,
  changes: { subscription?: SubscriptionSnapshot; coverage?: InstitutionalCoverage | null }
): Promise<ApplyOutcome | null> {
  const store = getStore();
  const record = await store.findByUserId(userId);
  if (!record) return null;

  const subscription = changes.subscription ?? record.subscription;
  const coverage = changes.coverage === undefined ? record.coverage : changes.coverage;
  const grant = record.admin_grant;

  const decision = applyAccessChange(record.retention, { subscription, coverage, grant });
  const billing = billingAdjustmentFor({ subscription, coverage, grant });

  await store.save({
    ...record,
    subscription,
    coverage,
    retention: decision.state,
  });

  if (decision.transition === 'clock_started') {
    await sendOperatorAlert({
      severity: 'info',
      subject: 'Retention clock started',
      participantCode: record.participant_code,
      body: [
        decision.reason,
        '',
        `Purge due: ${decision.state.purge_due_at}`,
        'Restoring access before then cancels the purge and deletes nothing.',
      ].join('\n'),
    });
  }

  if (billing.action === 'cancel_as_redundant') {
    await sendOperatorAlert({
      severity: 'action_required',
      subject: 'Cancel a subscription an institution now covers',
      participantCode: record.participant_code,
      body: [
        billing.reason,
        '',
        'Cancel the Stripe subscription and refund the unused days.',
        billing.priceLock
          ? `Hold their rate at ${billing.priceLock} if they ever subscribe again.`
          : 'No price id on file; check Stripe before cancelling.',
      ].join('\n'),
    });
  }

  return {
    participantCode: record.participant_code,
    transition: decision.transition,
    reason: decision.reason,
    entitled: decision.entitlement.geniusMining,
    entitlementSource: decision.entitlement.source,
    billing,
  };
}
