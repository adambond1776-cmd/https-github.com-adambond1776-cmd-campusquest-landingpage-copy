import { describe, expect, it } from 'vitest';
import {
  RETENTION_WINDOW_DAYS,
  applySubscriptionChange,
  initialRetentionState,
  markPurged,
  markWarningSent,
  retentionActionDue,
} from '../retention';
import { hasGeniusMining, type SubscriptionSnapshot } from '../subscription';
import type { RetentionState } from '../types';

const LAPSE = new Date('2026-03-01T12:00:00.000Z');
const daysAfterLapse = (days: number) =>
  new Date(LAPSE.getTime() + days * 24 * 60 * 60 * 1000);

const premium: SubscriptionSnapshot = { tier: 'premium', status: 'active' };

const lapsedState = (): RetentionState =>
  applySubscriptionChange(initialRetentionState(), { tier: 'free', status: 'active' }, LAPSE).state;

describe('hasGeniusMining', () => {
  it('entitles an active premium subscription', () => {
    expect(hasGeniusMining(premium)).toBe(true);
    expect(hasGeniusMining({ tier: 'premium', status: 'trialing' })).toBe(true);
  });

  it('keeps entitlement while a payment is merely failing', () => {
    expect(hasGeniusMining({ tier: 'premium', status: 'past_due' })).toBe(true);
    expect(hasGeniusMining({ tier: 'premium', status: 'unpaid' })).toBe(true);
  });

  it('drops entitlement on a downgrade even when billing is healthy', () => {
    expect(hasGeniusMining({ tier: 'basic', status: 'active' })).toBe(false);
    expect(hasGeniusMining({ tier: 'free', status: 'active' })).toBe(false);
  });

  it('drops entitlement once the subscription is genuinely over', () => {
    expect(hasGeniusMining({ tier: 'premium', status: 'canceled' })).toBe(false);
    expect(hasGeniusMining({ tier: 'premium', status: 'none' })).toBe(false);
  });
});

describe('what starts the 30-day clock', () => {
  it('starts on a downgrade from premium to basic', () => {
    const decision = applySubscriptionChange(
      initialRetentionState(),
      { tier: 'basic', status: 'active' },
      LAPSE
    );

    expect(decision.transition).toBe('clock_started');
    expect(decision.state.membership_status).toBe('lapsed');
    expect(decision.state.lapsed_at).toBe(LAPSE.toISOString());
    expect(decision.state.purge_due_at).toBe(daysAfterLapse(RETENTION_WINDOW_DAYS).toISOString());
    expect(decision.reason).toMatch(/Downgraded to basic/);
  });

  it('starts on a downgrade all the way to free', () => {
    const decision = applySubscriptionChange(
      initialRetentionState(),
      { tier: 'free', status: 'active' },
      LAPSE
    );

    expect(decision.transition).toBe('clock_started');
  });

  it('starts on an outright cancellation', () => {
    const decision = applySubscriptionChange(
      initialRetentionState(),
      { tier: 'premium', status: 'canceled' },
      LAPSE
    );

    expect(decision.transition).toBe('clock_started');
    expect(decision.state.membership_status).toBe('cancelled');
    expect(decision.reason).toMatch(/cancelled/i);
  });

  it('does NOT start on past_due', () => {
    const decision = applySubscriptionChange(
      initialRetentionState(),
      { tier: 'premium', status: 'past_due' },
      LAPSE
    );

    expect(decision.transition).toBe('unchanged');
    expect(decision.state.lapsed_at).toBeNull();
    expect(decision.state.purge_due_at).toBeNull();
    expect(decision.reason).toMatch(/failing payment does not start/);
  });

  it('does NOT start on unpaid, which is still a retrying card', () => {
    const decision = applySubscriptionChange(
      initialRetentionState(),
      { tier: 'premium', status: 'unpaid' },
      LAPSE
    );

    expect(decision.transition).toBe('unchanged');
    expect(decision.state.lapsed_at).toBeNull();
  });

  it('leaves the original lapse date alone when another downgrade event arrives', () => {
    const first = lapsedState();
    const second = applySubscriptionChange(
      first,
      { tier: 'free', status: 'active' },
      daysAfterLapse(10)
    );

    expect(second.transition).toBe('unchanged');
    expect(second.state.lapsed_at).toBe(LAPSE.toISOString());
    expect(second.state.purge_due_at).toBe(first.purge_due_at);
  });
});

describe('restoring the tier before day 30', () => {
  it('cancels the pending purge and deletes nothing', () => {
    const lapsed = markWarningSent(lapsedState(), 7, daysAfterLapse(7));
    const restored = applySubscriptionChange(lapsed, premium, daysAfterLapse(20));

    expect(restored.transition).toBe('clock_cleared');
    expect(restored.state.membership_status).toBe('active');
    expect(restored.state.lapsed_at).toBeNull();
    expect(restored.state.purge_due_at).toBeNull();
    expect(restored.state.warning_7_sent_at).toBeNull();
    expect(restored.state.deidentified_copy_retained).toBe(false);
    expect(retentionActionDue(restored.state, daysAfterLapse(31)).action).toBe('none');
  });

  it('is a no-op for a member who never lapsed', () => {
    const decision = applySubscriptionChange(initialRetentionState(), premium, LAPSE);
    expect(decision.transition).toBe('unchanged');
  });

  it('cannot un-purge a record that has already been deleted', () => {
    const purged = markPurged(lapsedState());
    const decision = applySubscriptionChange(purged, premium, daysAfterLapse(40));

    expect(decision.transition).toBe('unchanged');
    expect(decision.state.membership_status).toBe('purged');
    expect(decision.reason).toMatch(/permanent/);
  });
});

describe('retentionActionDue', () => {
  it('does nothing for an active member', () => {
    expect(retentionActionDue(initialRetentionState(), LAPSE).action).toBe('none');
  });

  it('stays quiet for the first week', () => {
    expect(retentionActionDue(lapsedState(), daysAfterLapse(6)).action).toBe('none');
  });

  it('warns on day 7', () => {
    const action = retentionActionDue(lapsedState(), daysAfterLapse(7));
    expect(action).toEqual({ action: 'warn', day: 7, daysUntilPurge: 23 });
  });

  it('does not warn twice on day 7', () => {
    const warned = markWarningSent(lapsedState(), 7, daysAfterLapse(7));
    expect(retentionActionDue(warned, daysAfterLapse(9)).action).toBe('none');
  });

  it('warns again on day 25', () => {
    const warned = markWarningSent(lapsedState(), 7, daysAfterLapse(7));
    const action = retentionActionDue(warned, daysAfterLapse(25));
    expect(action).toEqual({ action: 'warn', day: 25, daysUntilPurge: 5 });
  });

  it('sends the day-25 warning even if the day-7 one was missed', () => {
    const action = retentionActionDue(lapsedState(), daysAfterLapse(26));
    expect(action).toEqual({ action: 'warn', day: 25, daysUntilPurge: 4 });
  });

  it('purges on day 30', () => {
    let state = markWarningSent(lapsedState(), 7, daysAfterLapse(7));
    state = markWarningSent(state, 25, daysAfterLapse(25));

    expect(retentionActionDue(state, daysAfterLapse(30))).toEqual({
      action: 'purge',
      purgeDueAt: daysAfterLapse(30).toISOString(),
    });
  });

  it('still purges a record the job reached late', () => {
    expect(retentionActionDue(lapsedState(), daysAfterLapse(45)).action).toBe('purge');
  });

  it('does nothing once purged', () => {
    const purged = markPurged(lapsedState());
    expect(retentionActionDue(purged, daysAfterLapse(60)).action).toBe('none');
    expect(purged.deidentified_copy_retained).toBe(true);
  });
});
