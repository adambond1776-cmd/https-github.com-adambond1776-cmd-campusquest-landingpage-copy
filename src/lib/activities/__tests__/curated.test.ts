import { describe, expect, it } from 'vitest';
import { applyOverlay, normalizeName, type CuratedDirectory } from '@/lib/activities/sources/curated';
import type { Activity } from '@/lib/activities/types';

const NOW = new Date('2026-09-07T12:00:00.000Z');

function org(name: string, overrides: Partial<Activity> = {}): Activity {
  return {
    id: `engage:uri:${name.replace(/\W+/g, '')}`,
    campus_id: 'uri',
    kind: 'organization',
    name,
    summary: 'Whatever Engage had on file.',
    categories: ['Academic'],
    scope: 'on_campus',
    location: null,
    url: null,
    image_url: null,
    starts_at: null,
    ends_at: null,
    all_day: false,
    athletics: null,
    source: 'engage',
    source_ref: '1',
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

function directory(clubs: { name: string; category?: string; description?: string }[]): CuratedDirectory {
  return {
    campus_id: 'uri',
    academic_year: '2026-27',
    source: 'test',
    compiled: '2026-09-07',
    count: clubs.length,
    clubs: clubs.map((club) => ({
      category: club.category ?? 'Academic & Professional',
      name: club.name,
      description: club.description ?? 'A hand-written description.',
    })),
  };
}

describe('normalizeName', () => {
  it('reads an ampersand and the word "and" as the same thing', () => {
    expect(normalizeName('Judo & Jiujitsu')).toBe(normalizeName('Judo and Jiujitsu'));
  });

  it('drops the campus prefix and the "of URI" suffix', () => {
    expect(normalizeName('Chabad of URI')).toBe(normalizeName('Chabad'));
    expect(normalizeName('URI Mock Trial Club')).toBe(normalizeName('Mock Trial Club'));
  });

  it('folds plurals', () => {
    expect(normalizeName('Economics Students Association')).toBe(
      normalizeName('Economic Student Association')
    );
  });

  it('reads a spelled-out number as a digit', () => {
    expect(normalizeName('The Good Five Cent Cigar')).toBe(normalizeName('The Good 5 Cent Cigar'));
  });

  it('drops one trailing generic noun so "Chamber Music" meets "Chamber Music Club"', () => {
    expect(normalizeName('Chamber Music')).toBe(normalizeName('URI Chamber Music Club'));
  });

  it('ignores registrar labels and acronyms in brackets', () => {
    expect(normalizeName('Photography Club (URI STUDENT SENATE)')).toBe(
      normalizeName('Photography Club')
    );
  });

  it('keeps genuinely different clubs apart', () => {
    // Every pair here is one a fuzzy matcher actually got wrong on the live
    // data. Confusing the African and Asian student organizations is not a
    // tuning problem, it is why approximate matching is not used at all.
    const mustDiffer: [string, string][] = [
      ['African Student Association', 'Asian Student Association'],
      ['Cricket Club', 'Crochet Club'],
      ['Golf Club', 'Geology Club'],
      ['Badminton Club', 'Gaming Club'],
      ['Rhody Rifle', 'Rhody Bikes'],
      ['Sailing Club', 'Gaming Club'],
    ];

    for (const [left, right] of mustDiffer) {
      expect(normalizeName(left)).not.toBe(normalizeName(right));
    }
  });
});

describe('applyOverlay', () => {
  it('promotes a matched organization to verified', () => {
    const result = applyOverlay([org('Photography Club (URI STUDENT SENATE)')], directory([
      { name: 'Photography Club' },
    ]), NOW);

    expect(result.verified).toHaveLength(1);
    expect(result.verified[0].status).toBe('verified');
    expect(result.verified[0].verified_by).toBe('directory-2026-27');
    expect(result.verified[0].verified_at).toBe(NOW.toISOString());
  });

  it('prefers the hand-written description and leads with the curated category', () => {
    const result = applyOverlay([org('Geology Club')], directory([
      { name: 'Geology Club', category: 'Academic & Professional', description: 'Field learning.' },
    ]), NOW);

    expect(result.verified[0].summary).toBe('Field learning.');
    expect(result.verified[0].categories[0]).toBe('Academic & Professional');
  });

  it('adds a club the feed does not carry, already verified', () => {
    const result = applyOverlay([], directory([{ name: 'Rhody Archery' }]), NOW);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].source).toBe('curated');
    expect(result.added[0].verified_by).toBe('directory-2026-27');
  });

  it('leaves a registered organization the list does not confirm alone', () => {
    // Absence from a hand-compiled list is not evidence a club is dead. It is
    // only an absence of evidence that it is alive.
    const result = applyOverlay([org('Some Registered Club')], directory([{ name: 'Other Club' }]), NOW);

    expect(result.verified).toHaveLength(0);
    expect(result.unconfirmed).toBe(1);
  });

  it('does not let the list un-hide something an operator hid', () => {
    const result = applyOverlay([org('Photography Club', { status: 'hidden' })], directory([
      { name: 'Photography Club' },
    ]), NOW);

    expect(result.verified[0].status).toBe('hidden');
  });

  it('flags an unmatched club that resembles a registered one instead of guessing', () => {
    const result = applyOverlay([org('Surfrider Foundation Club')], directory([
      { name: 'Surfrider Trust' },
    ]), NOW);

    expect(result.verified).toHaveLength(0);
    expect(result.review[0].club).toBe('Surfrider Trust');
    expect(result.review[0].candidates).toContain('Surfrider Foundation Club');
  });
});
