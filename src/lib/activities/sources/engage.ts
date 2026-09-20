/**
 * The student organization directory from Anthology Engage (URI calls its
 * install "URInvolved").
 *
 * One caveat worth stating plainly, because it affects how much we should lean
 * on this: unlike the Localist and athletics feeds, this endpoint is the Engage
 * web app's own backing search index. It is publicly reachable and needs no
 * credentials, but it is not a published, supported product API, so it can
 * change shape without warning and nobody owes us notice.
 *
 * The right long-term fix is an institution-issued Engage API key, which a
 * campus administrator can generate. Until a partner agreement exists, this
 * adapter reads the public endpoint, requests only what the directory page
 * already shows any visitor, and is isolated here so swapping in a sanctioned
 * key changes exactly one file.
 */

import type { ActivityDraft } from '@/lib/activities/types';

export type EngageFeed = {
  campus_id: string;
  /** Engage tenant origin, e.g. `https://uri.campuslabs.com/engage`. */
  origin: string;
};

export const ENGAGE_FEEDS: Record<string, EngageFeed> = {
  uri: { campus_id: 'uri', origin: 'https://uri.campuslabs.com/engage' },
};

const IMAGE_CDN = 'https://se-images.campuslabs.com/clink/images';

type EngageOrganization = {
  Id?: string | number;
  Name?: string | null;
  ShortName?: string | null;
  WebsiteKey?: string | null;
  ProfilePicture?: string | null;
  Summary?: string | null;
  Description?: string | null;
  CategoryNames?: string[] | null;
  Status?: string | null;
  Visibility?: string | null;
};

type EngageResponse = {
  '@odata.count'?: number;
  value?: EngageOrganization[];
};

/** Engage summaries are user-authored HTML often pasted out of a word processor. */
function stripHtml(value: string | null | undefined): string | null {
  const text = (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;
  return text.length > 220 ? `${text.slice(0, 219).trimEnd()}…` : text;
}

/**
 * Organizations flagged by their own campus as needing re-recognition.
 *
 * URI's directory contains entries like "193 Coffeehouse (DUE FOR URI SENATE
 * RE-RECOGNITION)". The registrar is telling us the group may not be operating,
 * which is exactly the sort of row that sends a first-year to a meeting that
 * does not happen. These still get ingested, but they are held back from public
 * listing until a person checks.
 */
const NEEDS_RECOGNITION = /re-?recognition|inactive|do not use|deprecated|test org/i;

export function needsReview(name: string): boolean {
  return NEEDS_RECOGNITION.test(name);
}

/**
 * Administrative recognition labels Engage appends to the organization name.
 *
 * Eighty of URI's 163 organizations are stored as "Photography Club (URI
 * STUDENT SENATE)". That suffix is a registrar's recognition status, not part
 * of what anyone calls the club, and showing it on a card is noise.
 */
const ADMIN_SUFFIX =
  /\s*[-–]?\s*\((?:[^)]*student senate[^)]*|affiliate|pending[^)]*|[^)]*re-?recognition[^)]*)\)\s*/gi;

/** Strip registrar bookkeeping so the card shows the name students use. */
function cleanName(name: string): string {
  return name.replace(ADMIN_SUFFIX, ' ').replace(/\s+[-–]\s*$/, '').replace(/\s+/g, ' ').trim();
}

export function toActivities(response: EngageResponse, feed: EngageFeed): ActivityDraft[] {
  const drafts: ActivityDraft[] = [];

  for (const org of response.value ?? []) {
    if (!org?.Id || !org.Name) continue;
    if (org.Status && org.Status !== 'Active') continue;
    if (org.Visibility && org.Visibility !== 'Public') continue;

    const key = org.WebsiteKey?.trim();

    drafts.push({
      id: `engage:${feed.campus_id}:${org.Id}`,
      campus_id: feed.campus_id,
      kind: 'organization',
      name: cleanName(org.Name) || org.Name.trim(),
      summary: stripHtml(org.Summary) ?? stripHtml(org.Description),
      categories: (org.CategoryNames ?? []).filter(Boolean).slice(0, 4),
      scope: 'on_campus',
      location: null,
      url: key ? `${feed.origin}/organization/${key}` : null,
      image_url: org.ProfilePicture ? `${IMAGE_CDN}/${org.ProfilePicture}?preset=med-sq` : null,
      starts_at: null,
      ends_at: null,
      all_day: false,
      athletics: null,
      source: 'engage',
      source_ref: String(org.Id),
      needs_review: needsReview(org.Name),
    });
  }

  return drafts;
}

export async function fetchEngage(
  feed: EngageFeed,
  { pageSize = 100, maxPages = 10 }: { pageSize?: number; maxPages?: number } = {}
): Promise<ActivityDraft[]> {
  const drafts: ActivityDraft[] = [];
  let total = Infinity;

  for (let page = 0; page < maxPages && page * pageSize < total; page += 1) {
    const url =
      `${feed.origin}/api/discovery/search/organizations` +
      `?top=${pageSize}&skip=${page * pageSize}&orderBy%5B0%5D=UpperName%20asc`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CampusQuest/1.0 (+https://campusquestapp.com)',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Engage directory for ${feed.campus_id} returned ${response.status}`);
    }

    const payload = (await response.json()) as EngageResponse;
    total = payload['@odata.count'] ?? drafts.length;
    const batch = toActivities(payload, feed);
    if (batch.length === 0 && (payload.value ?? []).length === 0) break;
    drafts.push(...batch);
  }

  return drafts;
}
