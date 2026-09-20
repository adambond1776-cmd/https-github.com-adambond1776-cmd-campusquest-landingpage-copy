import { describe, expect, it } from 'vitest';
import {
  billingAdjustmentFor,
  coverageActive,
  resolveEntitlement,
  type AdminGrant,
  type InstitutionalCoverage,
} from '../entitlement';
import {
  RETENTION_WINDOW_DAYS,
  applyAccessChange,
  initialRetentionState,
  retentionActionDue,
} from '../retention';
import type { SubscriptionSnapshot } from '../subscription';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

const premium: SubscriptionSnapshot = { tier: 'premium', status: 'active' };
const free: SubscriptionSnapshot = { tier: 'free', status: 'none' };
const cancelled: SubscriptionSnapshot = { tier: 'premium', status: 'canceled' };

const uri: InstitutionalCoverage = {
  campus_id: 'uri',
  covers_genius_mining: true,
  starts_at: '2026-02-01T00:00:00.000Z',
  ends_at: null,
};

describe('coverageActive', () => {
  it('is false with no seat at all', () => {
    expect(coverageActive(null, NOW)).toBe(false);
  });

  it('is false for a seat that has not started', () => {
    expect(coverageActive({ ...uri, starts_at: '2026-09-01T00:00:00.000Z' }, NOW)).toBe(false);
  });

  it('is false for a contract that has ended', () => {
    expect(coverageActive({ ...uri, ends_at: '2026-02-28T00:00:00.000Z' }, NOW)).toBe(false);
  });

  it('is false for a seat held open but not activated', () => {
    expect(coverageActive({ ...uri, covers_genius_mining: false }, NOW)).toBe(false);
  });

  it('is true for a live open-ended contract', () => {
    expect(coverageActive(uri, NOW)).toBe(true);
  });
});

describe('resolveEntitlement', () => {
  it('gives an institutionally covered student the instrument and not the social layer', () => {
    const entitlement = resolveEntitlement({ subscription: free, coverage: uri }, NOW);

    expect(entitlement.geniusMining).toBe(true);
    expect(entitlement.socialFeatures).toBe(false);
    expect(entitlement.source).toBe('institution');
    expect(entitlement.reason).toMatch(/not the social layer/);
  });

  it('lets a covered student keep the social layer they are paying for themselves', () => {
    const entitlement = resolveEntitlement({ subscription: premium, coverage: uri }, NOW);

    expect(entitlement.geniusMining).toBe(true);
    expect(entitlement.socialFeatures).toBe(true);
  });

  it('falls back to the subscription when no institution is behind the student', () => {
    expect(resolveEntitlement({ subscription: premium }, NOW).source).toBe('subscription');
  });

  it('reports nothing when neither the school nor the student is paying', () => {
    const entitlement = resolveEntitlement({ subscription: free, coverage: null }, NOW);
    expect(entitlement.geniusMining).toBe(false);
    expect(entitlement.source).toBe('none');
  });

  it('honours an admin grant over everything else', () => {
    const grant: AdminGrant = { reason: 'GM-014 support case', granted_by: 'adam', ends_at: null };
    const entitlement = resolveEntitlement({ subscription: cancelled, grant }, NOW);

    expect(entitlement.geniusMining).toBe(true);
    expect(entitlement.source).toBe('admin_grant');
    expect(entitlement.reason).toMatch(/GM-014/);
  });

  it('ignores an admin grant that has expired', () => {
    const grant: AdminGrant = {
      reason: 'temporary',
      granted_by: 'adam',
      ends_at: '2026-02-01T00:00:00.000Z',
    };
    expect(resolveEntitlement({ subscription: free, grant }, NOW).geniusMining).toBe(false);
  });
});

describe('institutional coverage and the deletion clock', () => {
  it('does not start the clock when a paying student is picked up by their school', () => {
    const decision = applyAccessChange(
      initialRetentionState(),
      { subscription: free, coverage: uri },
      NOW
    );

    expect(decision.transition).toBe('unchanged');
    expect(decision.state.lapsed_at).toBeNull();
  });

  it('does not start the clock when the student cancels a subscription their school replaced', () => {
    const decision = applyAccessChange(
      initialRetentionState(),
      { subscription: cancelled, coverage: uri },
      NOW
    );

    expect(decision.transition).toBe('unchanged');
    expect(decision.state.purge_due_at).toBeNull();
    expect(retentionActionDue(decision.state, daysFromNow(45)).action).toBe('none');
  });

  it('clears a running clock when the school picks the student up mid-window', () => {
    const lapsed = applyAccessChange(initialRetentionState(), { subscription: free }, NOW);
    expect(lapsed.transition).toBe('clock_started');

    const covered = applyAccessChange(
      lapsed.state,
      { subscription: free, coverage: uri },
      daysFromNow(10)
    );

    expect(covered.transition).toBe('clock_cleared');
    expect(covered.state.lapsed_at).toBeNull();
  });

  it('starts the clock when the contract ends and the student is not paying', () => {
    const expired = { ...uri, ends_at: '2026-02-28T00:00:00.000Z' };
    const decision = applyAccessChange(
      initialRetentionState(),
      { subscription: free, coverage: expired },
      NOW
    );

    expect(decision.transition).toBe('clock_started');
    expect(decision.state.purge_due_at).toBe(daysFromNow(RETENTION_WINDOW_DAYS).toISOString());
  });
});

describe('billingAdjustmentFor', () => {
  it('leaves an uncovered student alone', () => {
    const adjustment = billingAdjustmentFor({ subscription: premium, coverage: null }, NOW);
    expect(adjustment.action).toBe('none');
  });

  it('cancels and refunds a subscription the school has made redundant', () => {
    const adjustment = billingAdjustmentFor(
      { subscription: premium, coverage: uri, currentPriceId: 'price_intro_premium' },
      NOW
    );

    expect(adjustment.action).toBe('cancel_as_redundant');
    expect(adjustment.refund).toBe('prorated');
    expect(adjustment.priceLock).toBe('price_intro_premium');
  });

  it('does nothing for a covered student who was never being charged', () => {
    expect(billingAdjustmentFor({ subscription: free, coverage: uri }, NOW).action).toBe('none');
  });

  it('does nothing for a covered student whose subscription already ended', () => {
    expect(billingAdjustmentFor({ subscription: cancelled, coverage: uri }, NOW).action).toBe(
      'none'
    );
  });
});
