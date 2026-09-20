/**
 * Campus events from Localist, the calendar platform most universities run.
 *
 * Localist ships a documented, public, read-only JSON API at `/api/2/`, and
 * URI's `robots.txt` explicitly allows its calendar feeds. So this is an API
 * client, not a scraper, and it will not break the next time someone restyles
 * the calendar page.
 */

import type { ActivityDraft } from '@/lib/activities/types';

export type LocalistFeed = {
  campus_id: string;
  /** Calendar origin, e.g. `https://events.uri.edu`. */
  origin: string;
};

export const LOCALIST_FEEDS: Record<string, LocalistFeed> = {
  uri: { campus_id: 'uri', origin: 'https://events.uri.edu' },
};

type LocalistInstance = {
  event_instance?: { start?: string | null; end?: string | null };
};

type LocalistEvent = {
  id: number;
  title?: string | null;
  description_text?: string | null;
  location_name?: string | null;
  location?: string | null;
  room_number?: string | null;
  localist_url?: string | null;
  photo_url?: string | null;
  free?: boolean | null;
  ticket_cost?: string | null;
  experience?: string | null;
  status?: string | null;
  event_instances?: LocalistInstance[] | null;
  groups?: { name?: string | null }[] | null;
  departments?: { name?: string | null }[] | null;
  filters?: Record<string, { name?: string | null }[] | undefined> | null;
};

type LocalistResponse = {
  events?: { event: LocalistEvent }[];
  page?: { current?: number; total?: number };
};

/** Trim a description to something that fits a card without a scrollbar. */
function toSummary(text: string | null | undefined): string | null {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (clean.length <= 180) return clean;
  // Prefer a sentence boundary so the card does not end mid-clause.
  const cut = clean.slice(0, 180);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return stop > 90 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

function toLocation(event: LocalistEvent): string | null {
  const parts = [event.location_name || event.location, event.room_number]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function toCategories(event: LocalistEvent): string[] {
  const seen = new Set<string>();

  for (const group of event.filters?.event_types ?? []) {
    if (group?.name) seen.add(group.name.trim());
  }
  for (const group of event.groups ?? []) {
    if (group?.name) seen.add(group.name.trim());
  }
  if (seen.size === 0) {
    for (const dept of event.departments ?? []) {
      if (dept?.name) seen.add(dept.name.trim());
    }
  }

  return [...seen].filter(Boolean).slice(0, 4);
}

/**
 * The next instance that has not already happened.
 *
 * A recurring event carries every occurrence in one payload. Emitting a row per
 * occurrence would bury the directory under a single weekly coffee hour, so an
 * event becomes one row anchored to its next real date.
 */
function nextInstance(
  event: LocalistEvent,
  now: Date
): { start: string; end: string | null } | null {
  const instances = (event.event_instances ?? [])
    .map((wrapper) => wrapper.event_instance)
    .filter((instance): instance is { start?: string | null; end?: string | null } =>
      Boolean(instance?.start)
    )
    .map((instance) => ({
      start: new Date(instance.start as string),
      end: instance.end ? new Date(instance.end) : null,
    }))
    .filter((instance) => !Number.isNaN(instance.start.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const upcoming = instances.find((instance) => (instance.end ?? instance.start) >= now);
  const chosen = upcoming ?? instances[instances.length - 1];
  if (!chosen) return null;

  return {
    start: chosen.start.toISOString(),
    end: chosen.end && !Number.isNaN(chosen.end.getTime()) ? chosen.end.toISOString() : null,
  };
}

export function toActivities(
  response: LocalistResponse,
  feed: LocalistFeed,
  now = new Date()
): ActivityDraft[] {
  const drafts: ActivityDraft[] = [];

  for (const wrapper of response.events ?? []) {
    const event = wrapper.event;
    if (!event?.id || !event.title) continue;
    if (event.status && event.status !== 'live') continue;

    const when = nextInstance(event, now);
    if (!when) continue;

    drafts.push({
      id: `localist:${feed.campus_id}:${event.id}`,
      campus_id: feed.campus_id,
      kind: 'event',
      name: event.title.trim(),
      summary: toSummary(event.description_text),
      categories: toCategories(event),
      scope: 'on_campus',
      location: toLocation(event),
      url: event.localist_url ?? null,
      image_url: event.photo_url ?? null,
      starts_at: when.start,
      ends_at: when.end,
      all_day: false,
      athletics: null,
      source: 'localist',
      source_ref: String(event.id),
    });
  }

  return drafts;
}

/**
 * Pull upcoming events, paging until the window is covered.
 *
 * Localist caps a page at 100 and a window at 370 days.
 */
export async function fetchLocalist(
  feed: LocalistFeed,
  { days = 120, maxPages = 6 }: { days?: number; maxPages?: number } = {}
): Promise<ActivityDraft[]> {
  const drafts: ActivityDraft[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${feed.origin}/api/2/events?days=${days}&pp=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CampusQuest/1.0 (+https://campusquestapp.com)',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Localist feed for ${feed.campus_id} returned ${response.status}`);
    }

    const payload = (await response.json()) as LocalistResponse;
    const batch = toActivities(payload, feed);
    drafts.push(...batch);

    const total = payload.page?.total ?? 1;
    if (page >= total || (payload.events ?? []).length === 0) break;
  }

  return drafts;
}
