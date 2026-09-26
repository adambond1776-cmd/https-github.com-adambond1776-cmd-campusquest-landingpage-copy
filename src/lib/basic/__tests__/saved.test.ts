import { describe, expect, it } from 'vitest';
import type { Activity } from '@/lib/activities/types';
import {
  canSaveActivity,
  reminderForKind,
  saveDecision,
  savedKindForActivity,
  savedMutationAllowed,
} from '@/lib/basic/saved';

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    campus_id: 'uri',
    kind: 'event',
    name: 'Research seminar',
    summary: 'Economics research.',
    categories: [],
    scope: 'on_campus',
    location: null,
    url: null,
    image_url: null,
    starts_at: '2026-09-25T15:00:00.000Z',
    ends_at: null,
    all_day: false,
    athletics: null,
    source: 'urinvolved',
    source_ref: 'event',
    first_seen: '2026-09-01T00:00:00.000Z',
    last_seen: '2026-09-01T00:00:00.000Z',
    status: 'listed',
    verified_at: null,
    verified_by: null,
    working_words: [],
    low_commitment_entry: null,
    ...overrides,
  };
}

describe('saved listings', () => {
  it('groups events, clubs, and organizations without saving facilities', () => {
    expect(savedKindForActivity(activity({ kind: 'event' }))).toBe('event');
    expect(
      savedKindForActivity(
        activity({
          kind: 'game',
          categories: ['Athletics'],
          athletics: { sport: 'Soccer', home: true, opponent: 'Maine', result: null },
        })
      )
    ).toBe('event');
    expect(savedKindForActivity(activity({ kind: 'organization', name: 'Robotics Club', summary: 'A club.' }))).toBe(
      'club'
    );
    expect(
      savedKindForActivity(activity({ kind: 'organization', name: 'Office of Fellowships', summary: 'Advising.' }))
    ).toBe('organization');
    expect(savedKindForActivity(activity({ kind: 'facility', name: 'Library' }))).toBeNull();
  });

  it('lets an expired account delete a save and blocks new writes', () => {
    expect(savedMutationAllowed('delete', false)).toBe(true);
    expect(savedMutationAllowed('insert', false)).toBe(false);
    expect(savedMutationAllowed('update', false)).toBe(false);
    expect(savedMutationAllowed('insert', true)).toBe(true);
    expect(savedMutationAllowed('update', true)).toBe(true);
  });

  it('stores email reminders only for events', () => {
    expect(reminderForKind('event', 'email')).toBe('email');
    expect(reminderForKind('club', 'email')).toBe('off');
    expect(reminderForKind('organization', 'email')).toBe('off');
  });

  it('keeps save closed for free accounts and hidden listings', () => {
    const event = activity({});
    const blocked = saveDecision({ signedIn: true, verified: true, active: false, activity: event, kind: 'event' });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toMatch(/Founding Basic/);
    expect(canSaveActivity(activity({ status: 'hidden' }), 'event')).toBe(false);
    expect(canSaveActivity(event, 'club')).toBe(false);
    expect(saveDecision({ signedIn: true, verified: true, active: true, activity: event, kind: 'event' }).ok).toBe(
      true
    );
  });
});
