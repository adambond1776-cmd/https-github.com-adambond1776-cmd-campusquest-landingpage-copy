import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClubDemo, demoOwner, demoReviewer, demoStudent } from '../demo';
import { clubService } from '../service';
import type { ClubCommand } from '../model';
const content = { name: 'URI Chess', description: 'Play together', meeting: 'Thursdays', website: '', logo: '', categories: ['Gaming, anime & tabletop'] };
const event = () => ({ title: 'Chess evening', description: 'All welcome', location: 'Union', starts_at: new Date(Date.now()+86400000).toISOString(), ends_at: new Date(Date.now()+90000000).toISOString(), timezone: 'America/New_York', website: '' });
let demo: ReturnType<typeof createClubDemo>;
const page = (campus = 'uri') => demo.service.run(demoOwner, { type: 'profile', content, slug: 'uri-chess', campus, version: undefined });
async function approveOwner() { const c = (await demo.repo.byOwner(demoOwner.id))!; await demo.service.review(demoReviewer, c.id, 'owner', c.version); }
async function subscribe() { await demo.service.run(demoOwner, { type: 'billing', action: 'checkout' }); }
async function approvePage() { const c = (await demo.repo.byOwner(demoOwner.id))!; await demo.service.review(demoReviewer, c.id, 'page', c.version); }
async function ready() { await page(); await approveOwner(); await subscribe(); await approvePage(); }
beforeEach(() => { demo = createClubDemo(); });
describe('club service authorization and workflow', () => {
  it('creates a draft, not an automatically approved paid page', async () => { const r = await page(); expect(r.view.club).toMatchObject({ owner_id: demoOwner.id, contact_email: demoOwner.email, status: 'pending', owner_approved: false }); });
  it('blocks student account from creating an organization page', async () => { await expect(demo.service.run(demoStudent, { type: 'profile', content, slug: 'test-club', campus: 'uri', version: 1 })).rejects.toThrow('organization'); });
  it('refuses checkout until ownership review', async () => { await page(); await expect(subscribe()).rejects.toThrow('reviewer'); });
  it('requires payment separately from ownership approval', async () => { await page(); await approveOwner(); await expect(approvePage()).rejects.toThrow('active'); });
  it('does not charge a future campus', async () => { await page('jwu'); await approveOwner(); await expect(subscribe()).rejects.toThrow('not open'); });
  it('does not allow an owner to review themselves, even if allowlisted', async () => { await page(); const c = (await demo.repo.byOwner(demoOwner.id))!; await expect(demo.service.review({ ...demoOwner, reviewer: true }, c.id, 'owner', 1)).rejects.toThrow('separate reviewer'); });
  it('blocks a forged reviewer role', async () => { await page(); const c = (await demo.repo.byOwner(demoOwner.id))!; await expect(demo.service.review(demoStudent, c.id, 'owner', 1)).rejects.toThrow('Reviewer'); });
  it('runs the page, event, review and join lifecycle', async () => {
    await ready();
    const r = await demo.service.run(demoOwner, { type: 'event', content: event() });
    const e = r.view.events[0], c = r.view.club!;
    expect(e.status).toBe('pending');
    await demo.service.review(demoReviewer, c.id, 'event', e.version, e.id);
    await demo.service.join(demoStudent, c.slug, { name: 'Student', message: 'Interested', consent: true });
    const v = await demo.service.view(demoOwner);
    expect(v.events[0].status).toBe('approved');
    expect(v.requests[0]).toMatchObject({ email: demoStudent.email, notification_status: 'preview', consent_version: 'club-contact-v1' });
  });
  it('deduplicates join requests and never takes caller email', async () => {
    await ready();
    for (let i=0; i<2; i++) await demo.service.join(demoStudent, 'uri-chess', { name: 'Student', message: '', consent: true, email: 'other@evil.test' });
    const v = await demo.service.view(demoOwner);
    expect(v.requests).toHaveLength(1); expect(v.requests[0].email).toBe(demoStudent.email);
  });
  it('refuses joins before approval, without consent, or from the owner', async () => {
    await page(); await expect(demo.service.join(demoStudent, 'uri-chess', { name: 'A', message: '', consent: true })).rejects.toThrow('not accepting');
    await approveOwner(); await subscribe(); await approvePage();
    await expect(demo.service.join(demoStudent, 'uri-chess', { name: 'A', message: '', consent: false })).rejects.toThrow('agree');
    await expect(demo.service.join(demoOwner, 'uri-chess', { name: 'A', message: '', consent: true })).rejects.toThrow('separate student');
  });
  it('keeps private data out of another owner view', async () => {
    await ready(); await demo.service.join(demoStudent, 'uri-chess', { name: 'A', message: 'Private', consent: true });
    expect((await demo.service.view({ ...demoOwner, id: 'other' })).requests).toEqual([]);
  });
  it('blocks cross-club event mutation', async () => {
    await ready(); const v = (await demo.service.run(demoOwner, { type: 'event', content: event() })).view;
    await expect(demo.service.run({ ...demoOwner, id: 'other' }, { type: 'cancelEvent', id: v.events[0].id, version: 1 })).rejects.toThrow('Create your');
    await expect(demo.service.run(demoOwner, { type: 'event', id: 'stolen', version: 1, content: event() })).rejects.toThrow('changed');
  });
  it('uses version checks so stale forms cannot overwrite new edits', async () => {
    await ready(); const c = (await demo.repo.byOwner(demoOwner.id))!;
    await demo.service.run(demoOwner, { type: 'profile', content, slug: '', campus: '', version: c.version });
    await expect(demo.service.run(demoOwner, { type: 'profile', content, slug: '', campus: '', version: c.version })).rejects.toThrow('changed');
    expect((await demo.repo.byOwner(demoOwner.id))!.status).toBe('pending');
  });
  it('preserves paid access on scheduled cancel and resumes renewal', async () => {
    await ready();
    let r = await demo.service.run(demoOwner, { type: 'billing', action: 'cancel' }); expect(r.view.subscription.cancelAtPeriodEnd).toBe(true);
    r = await demo.service.run(demoOwner, { type: 'billing', action: 'resume' }); expect(r.view.subscription.cancelAtPeriodEnd).toBe(false);
  });
  it('expiry locks edits and joins, preserves requests and permits event cancellation', async () => {
    await ready(); const r = await demo.service.run(demoOwner, { type: 'event', content: event() }); const e = r.view.events[0];
    await demo.service.join(demoStudent, 'uri-chess', { name: 'A', message: '', consent: true });
    demo.expire();
    await expect(demo.service.run(demoOwner, { type: 'event', content: event() })).rejects.toThrow('active');
    await expect(demo.service.join(demoStudent, 'uri-chess', { name: 'A', message: '', consent: true })).rejects.toThrow('active');
    const canceled = await demo.service.run(demoOwner, { type: 'cancelEvent', id: e.id, version: e.version });
    expect(canceled.view.events[0].status).toBe('canceled'); expect(canceled.view.requests).toHaveLength(1);
  });
  it('simulates failed notification and retry without losing the request', async () => {
    await ready(); await demo.service.join(demoStudent, 'uri-chess', { name: 'A', message: '', consent: true });
    const request = (await demo.service.view(demoOwner)).requests[0];
    await demo.service.run(demoOwner, { type: 'notification', id: request.id, outcome: 'simulated_failed' });
    const result = await demo.service.run(demoOwner, { type: 'notification', id: request.id, outcome: 'simulated_sent' });
    expect(result.view.requests[0]).toMatchObject({ notification_status: 'simulated_sent', notification_attempts: 2 });
  });
  it('refuses self-republishing after operator hides page', async () => {
    await ready(); const c = (await demo.repo.byOwner(demoOwner.id))!;
    await demo.service.review(demoReviewer, c.id, 'hide', c.version);
    await expect(demo.service.run(demoOwner, { type: 'profile', content, slug: '', campus: '', version: c.version+1 })).rejects.toThrow('withheld');
  });
  it('fails closed when the payment provider cannot be read', async () => {
    await ready(); const broken = clubService(demo.repo, { ...demo.billing, read: vi.fn().mockRejectedValue(new Error('provider unavailable')) });
    expect((await broken.view(demoOwner)).billingAvailable).toBe(false);
    await expect(broken.run(demoOwner, { type: 'event', content: event() })).rejects.toThrow('provider');
  });
  it('declined checkout cannot unlock page publishing', async () => {
    await page(); await approveOwner(); demo.decline(true);
    await expect(subscribe()).rejects.toThrow('decline'); await expect(approvePage()).rejects.toThrow('active');
  });
  it('rejects unrecognized commands', async () => { await expect(demo.service.run(demoOwner, { type: 'grantAdmin' } as unknown as ClubCommand)).rejects.toThrow('Unknown'); });
});
