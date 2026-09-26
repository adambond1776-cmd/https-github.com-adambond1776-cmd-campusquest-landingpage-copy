import { describe, expect, it } from 'vitest';
import { basicEntitlement } from '@/lib/basic/entitlement';
import { recommendationsForBasicAccess } from '../interest-recommendations';
import type { Activity } from '../types';

const NOW = new Date('2026-09-24T23:26:39.000Z');

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'one',
    campus_id: 'uri',
    name: 'Listing',
    summary: null,
    categories: [],
    kind: 'event',
    scope: 'on_campus',
    location: null,
    url: null,
    image_url: null,
    starts_at: '2026-09-25T18:00:00.000Z',
    ends_at: '2026-09-25T20:00:00.000Z',
    all_day: false,
    athletics: null,
    source: 'localist',
    source_ref: 'one',
    first_seen: NOW.toISOString(),
    last_seen: NOW.toISOString(),
    status: 'verified',
    verified_at: NOW.toISOString(),
    verified_by: 'fixture',
    working_words: [],
    low_commitment_entry: null,
    ...overrides,
  };
}

const club = { activity: activity({ id: 'club', name: 'Robotics Club', kind: 'organization', summary: 'A student club', starts_at: null, ends_at: null }) };
const organization = { activity: activity({ id: 'org', name: 'Campus Senate', kind: 'organization', summary: 'Student government', starts_at: null, ends_at: null }) };
const event = { activity: activity({ id: 'event', name: 'Robotics Night', kind: 'event' }) };
const listings = [club, organization, event];

describe('personalized recommendation entitlement', () => {
  it('keeps public events and removes clubs and organizations for Free users', () => {
    expect(recommendationsForBasicAccess(listings, false).map((item) => item.activity.name)).toEqual(['Robotics Night']);
  });

  it('returns clubs, organizations, and events for an active Basic user', () => {
    expect(recommendationsForBasicAccess(listings, true).map((item) => item.activity.id)).toEqual(['club', 'org', 'event']);
  });

  it('treats an expired Basic window as Free', () => {
    const expired = basicEntitlement(
      { starts_at: '2026-01-01T00:00:00.000Z', ends_at: '2026-03-01T00:00:00.000Z', early_access: true },
      NOW,
    );
    expect(expired.active).toBe(false);
    expect(recommendationsForBasicAccess(listings, expired.active).map((item) => item.activity.kind)).toEqual(['event']);
  });
});
