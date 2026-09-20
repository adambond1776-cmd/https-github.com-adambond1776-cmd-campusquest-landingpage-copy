import type { Activity } from '@/lib/activities/types';

/**
 * Display helpers for activity rows.
 *
 * Kept out of the components so the date logic is testable and so the
 * directory, the athletics rail, and any future email digest describe the same
 * event the same way.
 */

const CAMPUS_TIME_ZONE = 'America/New_York';

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameCampusDay(a: Date, b: Date): boolean {
  const format = (date: Date) =>
    date.toLocaleDateString('en-CA', { timeZone: CAMPUS_TIME_ZONE });
  return format(a) === format(b);
}

/**
 * "Tonight", "Tomorrow", "Thu 9 Oct" — whichever a student can act on fastest.
 *
 * Everything is rendered in campus time rather than the reader's timezone. A
 * student checking the app from home over break needs to know when the game
 * starts in Kingston, not what their own clock will say.
 */
export function formatWhen(activity: Activity, now: Date = new Date()): string | null {
  const start = parse(activity.starts_at);
  if (!start) return null;

  const time = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: CAMPUS_TIME_ZONE,
  });

  if (activity.all_day) {
    return start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: CAMPUS_TIME_ZONE,
    });
  }

  if (sameCampusDay(start, now)) {
    const hour = Number(
      start.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: CAMPUS_TIME_ZONE })
    );
    return `${hour >= 17 ? 'Tonight' : 'Today'}, ${time}`;
  }

  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (sameCampusDay(start, tomorrow)) return `Tomorrow, ${time}`;

  const withinAWeek = start.getTime() - now.getTime() < 7 * 86_400_000;
  const day = start.toLocaleDateString('en-US', {
    weekday: 'short',
    ...(withinAWeek ? {} : { month: 'short', day: 'numeric' }),
    timeZone: CAMPUS_TIME_ZONE,
  });

  return `${day}, ${time}`;
}

export function hasPassed(activity: Activity, now: Date = new Date()): boolean {
  const end = parse(activity.ends_at) ?? parse(activity.starts_at);
  return end ? end < now : false;
}

/** The short label on a card, e.g. "Home game" or "Club". */
export function kindLabel(activity: Activity): string {
  switch (activity.kind) {
    case 'game':
      return activity.athletics?.home ? 'Home game' : 'Away game';
    case 'organization':
      return 'Club';
    case 'facility':
      return 'Facility';
    case 'place':
      return 'Off campus';
    case 'event':
      return 'Event';
  }
}
