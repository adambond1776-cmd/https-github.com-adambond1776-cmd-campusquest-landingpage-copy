import { ATHLETICS_FEEDS } from '@/lib/activities/sources/athletics';
import type { Activity, ActivityKind, ActivityStatus, AthleticsDetail, SourceId } from '@/lib/activities/types';

/**
 * Read model for the main CampusQuest event inventory.
 *
 * `public.external_events` is the multi-source table (URInvolved, athletics, and
 * later providers). Duplicate imports point at the keeper through
 * `canonical_event_id`. `public.external_organizations` is the matching club
 * directory. Neither table has a campus column; both were created for the URI
 * inventory. `public.campus_events` is a separate native RSVP table and is not
 * readable by the anon key.
 */

export const CANONICAL_EVENT_TABLE = 'external_events';
export const CANONICAL_ORGANIZATION_TABLE = 'external_organizations';
export const CANONICAL_CAMPUS_ID = 'uri';

export const CANONICAL_EVENT_COLUMNS = [
  'id',
  'source',
  'source_type',
  'external_id',
  'title',
  'description',
  'organization_name',
  'location_name',
  'venue_name',
  'address',
  'starts_at',
  'ends_at',
  'image_url',
  'event_url',
  'category',
  'tags',
  'is_active',
  'is_cancelled',
  'visibility',
  'canonical_event_id',
  'sport',
  'opponent',
  'home_away',
  'score',
  'last_seen_at',
  'created_at',
].join(', ');

export const CANONICAL_ORGANIZATION_COLUMNS = [
  'id',
  'source',
  'source_type',
  'external_id',
  'name',
  'description',
  'logo_url',
  'organization_url',
  'website_url',
  'category',
  'tags',
  'is_active',
  'verified',
  'location_text',
  'last_seen_at',
  'created_at',
].join(', ');

export type CanonicalEventRow = {
  id: string;
  source: string | null;
  source_type: string | null;
  external_id: string | null;
  title: string | null;
  description: string | null;
  organization_name: string | null;
  location_name: string | null;
  venue_name: string | null;
  address: string | null;
  starts_at: string | null;
  ends_at: string | null;
  image_url: string | null;
  event_url: string | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean | null;
  is_cancelled: boolean | null;
  visibility: string | null;
  canonical_event_id: string | null;
  sport: string | null;
  opponent: string | null;
  home_away: string | null;
  score: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

export type CanonicalOrganizationRow = {
  id: string;
  source: string | null;
  source_type: string | null;
  external_id: string | null;
  name: string | null;
  description: string | null;
  logo_url: string | null;
  organization_url: string | null;
  website_url: string | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean | null;
  verified: boolean | null;
  location_text: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCanonicalRecordId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

function providerToken(source: string | null, sourceType: string | null): string {
  return (sourceType || source || '').trim().toLowerCase();
}

export function isCanonicalGame(row: Pick<CanonicalEventRow, 'source' | 'source_type' | 'sport'>): boolean {
  const token = providerToken(row.source, row.source_type);
  if (token === 'athletics' || token === 'sidearm') return true;
  return Boolean(row.sport?.trim());
}

export function canonicalSourceId(
  source: string | null,
  sourceType: string | null,
  kind: ActivityKind
): SourceId {
  const token = providerToken(source, sourceType);
  if (kind === 'game' || token === 'athletics' || token === 'sidearm') return 'athletics';
  if (
    token === 'localist' ||
    token === 'engage' ||
    token === 'club' ||
    token === 'curated' ||
    token === 'submitted' ||
    token === 'urinvolved'
  ) {
    return token;
  }
  return 'urinvolved';
}

function uniqueText(values: Array<string | null | undefined | string[]>): string[] {
  const out: string[] = [];
  for (const value of values) {
    const parts = Array.isArray(value) ? value : [value];
    for (const part of parts) {
      const cleaned = part?.trim();
      if (!cleaned) continue;
      if (out.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) continue;
      out.push(cleaned);
    }
  }
  return out;
}

function eventLocation(row: CanonicalEventRow): string | null {
  const venue = row.venue_name?.trim() || row.location_name?.trim() || '';
  const address = row.address?.trim() || '';
  if (venue && address && !venue.toLowerCase().includes(address.toLowerCase())) {
    return `${venue}, ${address}`;
  }
  return venue || address || null;
}

function homeGame(homeAway: string | null, location: string | null): boolean {
  // The imported flag alone marks some neutral-site games as home. The
  // directory already treats home as a Kingston venue, which is what the
  // athletics rail promises.
  if ((homeAway ?? '').trim().toLowerCase() !== 'home') return false;
  return ATHLETICS_FEEDS.uri.homeVenue.test(location ?? '');
}

function resultFromScore(score: string | null): AthleticsDetail['result'] {
  const trimmed = score?.trim() ?? '';
  const match = /^\[([WLT])\]/i.exec(trimmed) ?? /^([WLT])$/i.exec(trimmed);
  if (!match) return null;
  return match[1].toUpperCase() as AthleticsDetail['result'];
}

function eventStatus(row: CanonicalEventRow): ActivityStatus {
  const visibility = (row.visibility ?? 'public').trim().toLowerCase();
  if (row.is_active === false || row.is_cancelled || visibility !== 'public' || row.canonical_event_id) {
    return 'hidden';
  }
  return 'listed';
}

function gameSummary(row: CanonicalEventRow, home: boolean, sport: string): string | null {
  const written = row.description?.trim();
  if (written) return written;
  const opponent = row.opponent?.trim();
  if (!sport) return null;
  if (home) {
    return `Home ${sport} game${opponent ? ` against ${opponent}` : ''}.`;
  }
  return `Away ${sport} game${opponent ? ` at ${opponent}` : ''}.`;
}

export function activityFromCanonicalEvent(row: CanonicalEventRow): Activity | null {
  const name = row.title?.trim();
  if (!row.id || !name) return null;

  const kind: ActivityKind = isCanonicalGame(row) ? 'game' : 'event';
  const location = eventLocation(row);
  const home = homeGame(row.home_away, location);
  const sport = row.sport?.trim() || name;
  const opponent = row.opponent?.trim() || null;
  const athletics: AthleticsDetail | null =
    kind === 'game'
      ? {
          sport,
          home,
          opponent,
          result: resultFromScore(row.score),
        }
      : null;

  return {
    id: row.id,
    campus_id: CANONICAL_CAMPUS_ID,
    kind,
    name,
    summary: kind === 'game' ? gameSummary(row, home, sport) : row.description?.trim() || null,
    organization_name: row.organization_name?.trim() || null,
    categories: uniqueText([
      kind === 'game' ? 'Athletics' : null,
      kind === 'game' ? row.sport : null,
      row.category,
      row.tags,
    ]),
    scope: kind === 'game' && !home ? 'off_campus' : 'on_campus',
    location,
    url: row.event_url?.trim() || null,
    image_url: row.image_url?.trim() || null,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    all_day: false,
    athletics,
    source: canonicalSourceId(row.source, row.source_type, kind),
    source_ref: row.external_id?.trim() || row.id,
    first_seen: row.created_at ?? row.last_seen_at ?? new Date(0).toISOString(),
    last_seen: row.last_seen_at ?? row.created_at ?? new Date(0).toISOString(),
    status: eventStatus(row),
    verified_at: null,
    verified_by: null,
    working_words: [],
    low_commitment_entry: null,
  };
}

export function activityFromCanonicalOrganization(row: CanonicalOrganizationRow): Activity | null {
  const name = row.name?.trim();
  if (!row.id || !name) return null;
  const verified = row.verified === true;

  return {
    id: row.id,
    campus_id: CANONICAL_CAMPUS_ID,
    kind: 'organization',
    name,
    summary: row.description?.trim() || null,
    categories: uniqueText([row.category, row.tags]),
    scope: 'on_campus',
    location: row.location_text?.trim() || null,
    url: row.website_url?.trim() || row.organization_url?.trim() || null,
    image_url: row.logo_url?.trim() || null,
    starts_at: null,
    ends_at: null,
    all_day: false,
    athletics: null,
    source: canonicalSourceId(row.source, row.source_type, 'organization'),
    source_ref: row.external_id?.trim() || row.id,
    first_seen: row.created_at ?? row.last_seen_at ?? new Date(0).toISOString(),
    last_seen: row.last_seen_at ?? row.created_at ?? new Date(0).toISOString(),
    status: row.is_active === false ? 'hidden' : verified ? 'verified' : 'listed',
    verified_at: verified ? row.last_seen_at : null,
    verified_by: null,
    working_words: [],
    low_commitment_entry: null,
  };
}
