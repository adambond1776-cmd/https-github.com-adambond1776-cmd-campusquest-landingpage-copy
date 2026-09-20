import { describe, expect, it } from 'vitest';
import { reconcile } from '@/lib/activities/ingest';
import type { Activity, ActivityDraft } from '@/lib/activities/types';
import { STALE_AFTER_DAYS } from '@/lib/activities/types';

const NOW = new Date('2026-09-07T12:00:00.000Z');

function draft(overrides: Partial<ActivityDraft> = {}): ActivityDraft {
  return {
    id: 'localist:uri:1',
    campus_id: 'uri',
    kind: 'event',
    name: 'Ram Hacks',
    summary: 'A weekend hackathon.',
    categories: ['Technology'],
    scope: 'on_campus',
    location: 'Memorial Union',
    url: 'https://events.uri.edu/event/ram-hacks',
    image_url: null,
    starts_at: '2026-10-01T18:00:00.000Z',
    ends_at: null,
    all_day: false,
    athletics: null,
    source: 'localist',
    source_ref: '1',
    ...overrides,
  };
}

function existing(overrides: Partial<Activity> = {}): Activity {
  const { needs_review: _ignored, ...base } = draft();
  return {
    ...base,
    first_seen: '2026-08-01T00:00:00.000Z',
    last_seen: '2026-09-06T00:00:00.000Z',
    status: 'listed',
    verified_at: null,
    verified_by: null,
    working_words: [],
    low_commitment_entry: null,
    ...overrides,
  };
}

describe('reconcile', () => {
  it('adds an unseen row as listed', () => {
    const result = reconcile([], [draft()], NOW);

    expect(result.added).toBe(1);
    expect(result.rows[0].status).toBe('listed');
    expect(result.rows[0].first_seen).toBe(NOW.toISOString());
  });

  it('holds a row the adapter flagged for review out of public listing', () => {
    const result = reconcile([], [draft({ needs_review: true })], NOW);

    expect(result.rows[0].status).toBe('pending');
  });

  it('refreshes source fields but keeps a human verification', () => {
    const before = existing({
      status: 'verified',
      verified_at: '2026-08-20T00:00:00.000Z',
      verified_by: 'adam',
      working_words: ['BUILDER'],
      low_commitment_entry: true,
    });

    const result = reconcile(before ? [before] : [], [draft({ name: 'Ram Hacks 2027' })], NOW);
    const row = result.rows[0];

    expect(row.name).toBe('Ram Hacks 2027');
    expect(row.status).toBe('verified');
    expect(row.verified_by).toBe('adam');
    expect(row.working_words).toEqual(['BUILDER']);
    expect(row.low_commitment_entry).toBe(true);
    expect(row.first_seen).toBe('2026-08-01T00:00:00.000Z');
    expect(row.last_seen).toBe(NOW.toISOString());
  });

  it('does not let a re-sync un-hide a row an operator hid', () => {
    const result = reconcile([existing({ status: 'hidden' })], [draft()], NOW);

    expect(result.rows[0].status).toBe('hidden');
  });

  it('does not overwrite human tags with adapter defaults', () => {
    const before = existing({ working_words: ['ANALYST'] });
    const result = reconcile([before], [draft({ working_words: ['PERFORMER'] })], NOW);

    expect(result.rows[0].working_words).toEqual(['ANALYST']);
  });

  it('fills empty tags from the adapter default', () => {
    const result = reconcile([existing()], [draft({ working_words: ['PERFORMER'] })], NOW);

    expect(result.rows[0].working_words).toEqual(['PERFORMER']);
  });

  it('keeps a briefly missing row listed rather than demoting on one bad sync', () => {
    const result = reconcile([existing({ last_seen: '2026-09-06T00:00:00.000Z' })], [], NOW);

    expect(result.staled).toBe(0);
    expect(result.rows[0].status).toBe('listed');
  });

  it('demotes a row missing for longer than the grace window', () => {
    const longGone = new Date(NOW.getTime() - (STALE_AFTER_DAYS + 1) * 86_400_000).toISOString();
    const result = reconcile([existing({ last_seen: longGone })], [], NOW);

    expect(result.staled).toBe(1);
    expect(result.rows[0].status).toBe('stale');
  });

  it('never stales a curated row, which has no feed to disappear from', () => {
    const longGone = new Date(NOW.getTime() - 400 * 86_400_000).toISOString();
    const result = reconcile(
      [existing({ source: 'curated', last_seen: longGone, status: 'verified' })],
      [],
      NOW
    );

    expect(result.staled).toBe(0);
    expect(result.rows[0].status).toBe('verified');
  });

  it('demotes a returning stale row to listed rather than restoring verification', () => {
    const result = reconcile([existing({ status: 'stale' })], [draft()], NOW);

    expect(result.rows[0].status).toBe('listed');
  });

  it('collapses a recurring event to its soonest occurrence', () => {
    const result = reconcile(
      [],
      [
        draft({ starts_at: '2026-10-31T18:00:00.000Z' }),
        draft({ starts_at: '2026-09-08T18:00:00.000Z' }),
        draft({ starts_at: '2026-12-01T18:00:00.000Z' }),
      ],
      NOW
    );

    expect(result.added).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].starts_at).toBe('2026-09-08T18:00:00.000Z');
  });
});
