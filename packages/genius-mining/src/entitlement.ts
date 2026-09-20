import {
  TERMINAL_STATUSES,
  hasGeniusMining,
  hasSocialFeatures,
  inPaymentGrace,
  isBillable,
  type SubscriptionSnapshot,
} from './subscription';

/**
 * A seat an institution has bought on a student's behalf.
 *
 * Institutional coverage buys the instrument and nothing else. A covered student
 * gets Genius Mining at the Basic level: their profile, their advisor printout,
 * and edits for as long as the seat is live. It does not buy the social layer —
 * friend invites, shared feeds, club membership — because a university
 * purchasing a diagnostic for academic advising should not be signing up for a
 * student social network at the same time.
 */
export type InstitutionalCoverage = {
  campus_id: string;
  /** Set false to hold a seat open without activating it. */
  covers_genius_mining: boolean;
  starts_at: string;
  /** `null` means open-ended, which is the normal case for an annual contract. */
  ends_at: string | null;
};

/** A seat granted by hand, for support cases, pilot participants, and testing. */
export type AdminGrant = {
  reason: string;
  granted_by: string;
  ends_at: string | null;
};

export type EntitlementSource = 'subscription' | 'institution' | 'admin_grant' | 'none';

export type EntitlementInputs = {
  subscription: SubscriptionSnapshot;
  coverage?: InstitutionalCoverage | null;
  grant?: AdminGrant | null;
};

/**
 * What a student may actually do right now, regardless of who paid for it.
 *
 * Every gate in the product reads this, and — critically — so does the retention
 * clock. Keying deletion off the subscription alone is how you delete the
 * answers of a student whose school just started paying for them.
 */
export type Entitlement = {
  geniusMining: boolean;
  socialFeatures: boolean;
  source: EntitlementSource;
  reason: string;
};

export function coverageActive(
  coverage: InstitutionalCoverage | null | undefined,
  now: Date = new Date()
): boolean {
  if (!coverage || !coverage.covers_genius_mining) return false;
  if (new Date(coverage.starts_at).getTime() > now.getTime()) return false;
  if (coverage.ends_at && new Date(coverage.ends_at).getTime() <= now.getTime()) return false;
  return true;
}

export function grantActive(grant: AdminGrant | null | undefined, now: Date = new Date()): boolean {
  if (!grant) return false;
  if (grant.ends_at && new Date(grant.ends_at).getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Resolves the three ways a student can hold Genius Mining, in precedence order:
 * an admin grant, an institutional seat, then their own subscription.
 *
 * Precedence matters for the reason string more than the boolean — a support
 * agent reading a record needs to know which one is holding the entitlement up,
 * because that is what tells them what happens when it ends.
 */
export function resolveEntitlement(
  inputs: EntitlementInputs,
  now: Date = new Date()
): Entitlement {
  const { subscription } = inputs;
  const social = hasSocialFeatures(subscription);

  if (grantActive(inputs.grant, now)) {
    return {
      geniusMining: true,
      socialFeatures: social,
      source: 'admin_grant',
      reason: `Granted by hand: ${inputs.grant!.reason}`,
    };
  }

  if (coverageActive(inputs.coverage, now)) {
    return {
      geniusMining: true,
      socialFeatures: social,
      source: 'institution',
      reason: `Covered by ${inputs.coverage!.campus_id}. The seat includes Genius Mining, not the social layer.`,
    };
  }

  if (hasGeniusMining(subscription)) {
    return {
      geniusMining: true,
      socialFeatures: social,
      source: 'subscription',
      reason: inPaymentGrace(subscription)
        ? `Paying for ${subscription.tier}, currently ${subscription.status}. A failing payment does not start the deletion clock.`
        : `Paying for ${subscription.tier}.`,
    };
  }

  return {
    geniusMining: false,
    socialFeatures: social,
    source: 'none',
    reason: TERMINAL_STATUSES.includes(subscription.status)
      ? 'Subscription cancelled, and no institution covers this student.'
      : `Downgraded to ${subscription.tier}, which does not include Genius Mining.`,
  };
}

/**
 * What to do with a student's own billing once their school starts paying.
 *
 * Adam's rule: the moment an institution picks a student up, their card stops
 * being charged. Refund the unused part rather than letting the period run out,
 * because a student who paid on the first and got covered on the third did not
 * get what they paid for.
 */
export type BillingAdjustment = {
  action: 'none' | 'cancel_as_redundant';
  refund: 'none' | 'prorated';
  /**
   * The price to honour if this student ever subscribes again on their own.
   * Their school covering them must not cost them the rate they signed up at.
   */
  priceLock: string | null;
  reason: string;
};

export function billingAdjustmentFor(
  inputs: EntitlementInputs & { currentPriceId?: string | null },
  now: Date = new Date()
): BillingAdjustment {
  if (!coverageActive(inputs.coverage, now)) {
    return {
      action: 'none',
      refund: 'none',
      priceLock: null,
      reason: 'No institutional seat, so the student keeps paying for their own.',
    };
  }

  if (!isBillable(inputs.subscription)) {
    return {
      action: 'none',
      refund: 'none',
      priceLock: null,
      reason: 'Covered, and there is nothing being charged.',
    };
  }

  return {
    action: 'cancel_as_redundant',
    refund: 'prorated',
    priceLock: inputs.currentPriceId ?? null,
    reason: `${inputs.coverage!.campus_id} now covers this student. Cancel the subscription, refund the unused days, and hold their rate.`,
  };
}
