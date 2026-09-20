import { describe, expect, it } from 'vitest';
import { clubPaid, validateClub, validateEvent, validateJoin, validateLogo, validateSlug, validateCampus, validateVersion, notificationPreview } from '../model';
import { subscriptionAccess } from '@/lib/billing/catalog';
import type { Club, JoinRequest } from '../model';
const content = { name: 'Chess', description: 'Play chess together', meeting: 'Thursday 6pm', website: '', logo: '', categories: ['Gaming, anime & tabletop'] };
const event = { title: 'Chess night', description: 'All levels', location: 'Union', starts_at: '2026-10-01T22:00:00Z', ends_at: '2026-10-02T00:00:00Z', timezone: 'America/New_York', website: '' };
const now = Date.parse('2026-09-19T12:00:00Z');
describe('small club form contract', () => {
  it('accepts the scoped page and interests', () => expect(validateClub(content)).toEqual(content));
  it.each([{ name: '' }, { description: 'x'.repeat(2001) }, { categories: [] }, { categories: ['fake'] }, { website: 'javascript:alert(1)' }, { website: 'https://user:pass@evil.test' }, { website: 'http://site.test' }])('rejects unsafe page %j', patch => expect(() => validateClub({ ...content, ...patch })).toThrow());
  it.each(['manage', 'review', 'demo', '../../admin', 'ab', 'bad name', '-uri', 'uri-'])('rejects slug %s', slug => expect(() => validateSlug(slug)).toThrow());
  it('normalizes a page address', () => expect(validateSlug(' URI-Chess ')).toBe('uri-chess'));
  it('rejects unknown campus and accepts a future campus without launching it', () => { expect(() => validateCampus('fake')).toThrow(); expect(validateCampus('jwu')).toBe('jwu'); });
  it.each([null, 0, -1, 1.1, '1'])('rejects bad version %s', version => expect(() => validateVersion(version)).toThrow());
  it('accepts bounded future event and normalizes timestamps', () => expect(validateEvent(event, now)).toEqual({ ...event, starts_at: '2026-10-01T22:00:00.000Z', ends_at: '2026-10-02T00:00:00.000Z' }));
  it.each([{ starts_at: '2020-01-01T00:00:00Z' }, { starts_at: '2026-10-01T22:00' }, { ends_at: '2026-10-01T21:00:00Z' }, { ends_at: '2026-11-01T00:00:00Z' }, { timezone: 'not/a-zone' }, { starts_at: '2030-01-01T00:00:00Z' }])('rejects unsafe dates %j', patch => expect(() => validateEvent({ ...event, ...patch }, now)).toThrow());
  it('requires explicit contact sharing consent', () => expect(() => validateJoin({ name: 'Student', message: '', consent: false })).toThrow());
  it('blocks honeypot submissions', () => expect(() => validateJoin({ name: 'Student', message: '', consent: true, website: 'spam' })).toThrow());
  it('drops forged recipient/email from join data', () => expect(validateJoin({ name: 'Student', message: '', consent: true, email: 'victim@evil.test' })).toEqual({ name: 'Student', message: '' }));
  it.each(['https://tracker.test/logo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,aHRtbA=='])('rejects unsafe logos', logo => expect(() => validateLogo(logo)).toThrow());
  it('accepts a real PNG header and rejects oversize image data', () => {
    expect(validateLogo('data:image/png;base64,iVBORw0KGgo=')).toContain('image/png');
    expect(() => validateLogo(`data:image/png;base64,${'A'.repeat(205000)}`)).toThrow();
  });
  it('club payment does not unlock student or Genius Mining access', () => {
    const sub = { plan: 'club' as const, status: 'active' as const, periodEnd: 2000000000, cancelAtPeriodEnd: true };
    expect(clubPaid(sub, now)).toBe(true);
    expect(subscriptionAccess(sub, now).recommendations).toBe(false);
    expect(subscriptionAccess(sub, now).geniusMining).toBe(false);
    expect(clubPaid({ ...sub, plan: 'plus' }, now)).toBe(false);
    expect(clubPaid({ ...sub, status: 'past_due' }, now)).toBe(false);
    expect(clubPaid({ ...sub, periodEnd: 1 }, now)).toBe(false);
  });
  it('email preview binds the verified owner and requester', () => {
    const result = notificationPreview({ content, contact_email: 'owner@example.invalid' } as Club,
      { name: 'Student', email: 'student@example.invalid', message: 'Hello', consented_at: '2026-09-19', consent_version: 'club-contact-v1' } as JoinRequest);
    expect(result.to).toBe('owner@example.invalid'); expect(result.replyTo).toBe('student@example.invalid');
    expect(result.text).toContain('Hello');
  });
});
