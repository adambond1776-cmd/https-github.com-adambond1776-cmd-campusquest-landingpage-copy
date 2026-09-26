import { describe, expect, it } from 'vitest';
import {
  activityFromCanonicalEvent,
  activityFromCanonicalOrganization,
  type CanonicalEventRow,
  type CanonicalOrganizationRow,
} from '@/lib/activities/canonical';

function event(overrides: Partial<CanonicalEventRow> = {}): CanonicalEventRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    source: 'urinvolved',
    source_type: 'urinvolved',
    external_id: 'evt-1',
    title: 'Quad concert',
    description: 'Live music on the quad.',
    organization_name: 'Campus Programming',
    location_name: 'Quad',
    venue_name: null,
    address: null,
    starts_at: '2026-10-01T23:00:00.000Z',
    ends_at: '2026-10-02T01:00:00.000Z',
    image_url: null,
    event_url: 'https://uri.edu/events/quad',
    category: 'Music',
    tags: ['concert'],
    is_active: true,
    is_cancelled: false,
    visibility: 'public',
    canonical_event_id: null,
    sport: null,
    opponent: null,
    home_away: null,
    score: null,
    last_seen_at: '2026-09-01T00:00:00.000Z',
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('canonical activity mapping', () => {
  it('maps a public URInvolved event into the directory card shape', () => {
    const activity = activityFromCanonicalEvent(event());
    expect(activity).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      campus_id: 'uri',
      kind: 'event',
      name: 'Quad concert',
      source: 'urinvolved',
      status: 'listed',
      location: 'Quad',
      categories: ['Music', 'concert'],
      athletics: null,
      image_url: null,
    });
  });

  it('keeps the canonical event image URL for the card', () => {
    const image = 'https://se-images.campuslabs.com/clink/images/example.jpeg?preset=med-w';
    expect(activityFromCanonicalEvent(event({ image_url: ` ${image} ` }))?.image_url).toBe(image);
    expect(activityFromCanonicalEvent(event({ image_url: '   ' }))?.image_url).toBeNull();
  });

  it('maps an athletics row into a home game', () => {
    const activity = activityFromCanonicalEvent(
      event({
        source: 'athletics',
        source_type: 'athletics',
        title: "Women's Soccer vs Maine",
        description: null,
        sport: "Women's Soccer",
        opponent: 'Maine',
        home_away: 'home',
        score: '[W]',
        category: null,
        tags: [],
        organization_name: null,
        location_name: 'Kingston',
      })
    );

    expect(activity).toMatchObject({
      kind: 'game',
      source: 'athletics',
      status: 'listed',
      summary: "Home Women's Soccer game against Maine.",
      athletics: {
        sport: "Women's Soccer",
        home: true,
        opponent: 'Maine',
        result: 'W',
      },
    });
  });

  it('hides cancelled rows, non-public rows, and duplicate aliases', () => {
    const neutral = activityFromCanonicalEvent(
      event({
        source: 'athletics',
        source_type: 'athletics',
        sport: "Men's Golf",
        home_away: 'home',
        location_name: 'Hampden, MA, GreatHorse',
      })
    );
    expect(neutral?.athletics?.home).toBe(false);

    expect(activityFromCanonicalEvent(event({ is_cancelled: true }))?.status).toBe('hidden');
    expect(activityFromCanonicalEvent(event({ visibility: 'private' }))?.status).toBe('hidden');
    expect(
      activityFromCanonicalEvent(
        event({ canonical_event_id: '22222222-2222-4222-8222-222222222222' })
      )?.status
    ).toBe('hidden');
  });

  it('maps an active organization and keeps verification on the organization flag', () => {
    const row: CanonicalOrganizationRow = {
      id: '33333333-3333-4333-8333-333333333333',
      source: 'urinvolved',
      source_type: 'urinvolved',
      external_id: 'org-1',
      name: 'Robotics Club',
      description: 'Builds robots.',
      logo_url: null,
      organization_url: 'https://uri.edu/robotics',
      website_url: null,
      category: 'Engineering',
      tags: ['build'],
      is_active: true,
      verified: true,
      location_text: 'Engineering building',
      last_seen_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
    };

    expect(activityFromCanonicalOrganization(row)).toMatchObject({
      kind: 'organization',
      source: 'urinvolved',
      status: 'verified',
      location: 'Engineering building',
      starts_at: null,
      athletics: null,
      image_url: null,
    });
    expect(activityFromCanonicalOrganization({
      ...row,
      logo_url: ' https://se-images.campuslabs.com/clink/images/logo.jpeg ',
    })?.image_url).toBe('https://se-images.campuslabs.com/clink/images/logo.jpeg');
  });
});
