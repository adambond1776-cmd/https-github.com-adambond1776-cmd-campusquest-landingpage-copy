/**
 * CQ Basic access is a database window on cq_basic_access.
 * Signup metadata and the free account plan are not inputs.
 */

export type BasicAccessRow = {
  starts_at: string;
  ends_at: string;
  early_access: boolean;
};

export type BasicEntitlement = {
  /** True while starts_at <= now < ends_at. */
  active: boolean;
  /** True only when the stored flag is set and the access window is active. */
  earlyAccess: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** False when the access row could not be read. A missing row is known. */
  known: boolean;
};

export const INACTIVE_BASIC_ENTITLEMENT: BasicEntitlement = {
  active: false,
  earlyAccess: false,
  startsAt: null,
  endsAt: null,
  known: true,
};

export function basicEntitlement(row: BasicAccessRow | null, now: Date): BasicEntitlement {
  if (!row) return INACTIVE_BASIC_ENTITLEMENT;
  const starts = new Date(row.starts_at);
  const ends = new Date(row.ends_at);
  const startsMs = starts.getTime();
  const endsMs = ends.getTime();
  const nowMs = now.getTime();
  const active =
    !Number.isNaN(startsMs) &&
    !Number.isNaN(endsMs) &&
    startsMs <= nowMs &&
    nowMs < endsMs;
  return {
    active,
    earlyAccess: active && row.early_access === true,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    known: true,
  };
}

export function unknownBasicEntitlement(): BasicEntitlement {
  return { ...INACTIVE_BASIC_ENTITLEMENT, known: false };
}

/** Local test grants use the founding length. The client cannot choose the end. */
export function localBasicWindow(now: Date, days: number): { startsAt: string; endsAt: string } {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 0;
  const ends = new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000);
  return { startsAt: now.toISOString(), endsAt: ends.toISOString() };
}

export function localBasicGrantAllowed(production: boolean): boolean {
  return production !== true;
}

export function formatBasicExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(date);
}
