import { describe, expect, it } from 'vitest';
import {
  basicEntitlement,
  formatBasicExpiry,
  localBasicGrantAllowed,
  localBasicWindow,
} from '@/lib/basic/entitlement';

const NOW = new Date('2026-09-24T20:00:00.000Z');

describe('basic entitlement', () => {
  it('is active from the start through the instant before the end', () => {
    expect(
      basicEntitlement(
        { starts_at: '2026-09-24T20:00:00.000Z', ends_at: '2026-11-23T20:00:00.000Z', early_access: false },
        NOW
      ).active
    ).toBe(true);
    expect(
      basicEntitlement(
        { starts_at: '2026-09-24T20:00:01.000Z', ends_at: '2026-11-23T20:00:00.000Z', early_access: false },
        NOW
      ).active
    ).toBe(false);
    expect(
      basicEntitlement(
        { starts_at: '2026-09-01T00:00:00.000Z', ends_at: '2026-09-24T20:00:00.000Z', early_access: false },
        NOW
      ).active
    ).toBe(false);
  });

  it('keeps early access inside the active window', () => {
    const expired = basicEntitlement(
      { starts_at: '2026-01-01T00:00:00.000Z', ends_at: '2026-03-01T00:00:00.000Z', early_access: true },
      NOW
    );
    expect(expired.active).toBe(false);
    expect(expired.earlyAccess).toBe(false);

    const current = basicEntitlement(
      { starts_at: '2026-09-24T20:00:00.000Z', ends_at: '2026-11-23T20:00:00.000Z', early_access: true },
      NOW
    );
    expect(current.active).toBe(true);
    expect(current.earlyAccess).toBe(true);

    const currentWithoutFlag = basicEntitlement(
      { starts_at: '2026-09-24T20:00:00.000Z', ends_at: '2026-11-23T20:00:00.000Z', early_access: false },
      NOW
    );
    expect(currentWithoutFlag.active).toBe(true);
    expect(currentWithoutFlag.earlyAccess).toBe(false);
  });

  it('does not treat a missing row or a plan label as access', () => {
    const missing = basicEntitlement(null, NOW);
    expect(missing).toMatchObject({ active: false, earlyAccess: false, known: true });
    const labeled = basicEntitlement(
      {
        starts_at: 'not-a-date',
        ends_at: '2026-12-01T00:00:00.000Z',
        early_access: false,
      },
      NOW
    );
    expect(labeled.active).toBe(false);
  });

  it('formats the expiration in Eastern Time', () => {
    expect(formatBasicExpiry('2026-11-23T20:00:00.000Z')).toBe('November 23, 2026 at 3:00 PM EST');
  });

  it('builds a server-owned local window and refuses production grants', () => {
    const window = localBasicWindow(NOW, 60);
    expect(window.startsAt).toBe(NOW.toISOString());
    expect(new Date(window.endsAt).getTime() - NOW.getTime()).toBe(60 * 24 * 60 * 60 * 1000);
    expect(localBasicGrantAllowed(true)).toBe(false);
    expect(localBasicGrantAllowed(false)).toBe(true);
  });
});
