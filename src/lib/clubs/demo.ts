/** In-memory adapter for the LOCAL simulator and unit tests. No persistence,
 * provider calls or credentials. Exercises the same service as connected mode. */
import { EMPTY_SUBSCRIPTION, type SubscriptionView } from '@/lib/billing/catalog';
import { ClubError, type Club, type ClubEvent, type JoinRequest } from './model';
import { clubService, type ClubBilling } from './service';
import type { ClubRepository } from './store';
import type { ClubActor } from './identity';

export const demoOwner: ClubActor = { id: 'demo-owner', email: 'owner@example.invalid', organization: true, reviewer: false };
export const demoReviewer: ClubActor = { id: 'demo-reviewer', email: 'reviewer@example.invalid', organization: false, reviewer: true };
export const demoStudent: ClubActor = { id: 'demo-student', email: 'student@example.invalid', organization: false, reviewer: false };
export function createClubDemo() {
  const clubs: Club[] = [], events: ClubEvent[] = [], requests: JoinRequest[] = [];
  let sequence = 0, failCheckout = false;
  let subscription: SubscriptionView = { ...EMPTY_SUBSCRIPTION };
  const id = () => `demo-${++sequence}`;
  const clone = <T,>(x: T): T => structuredClone(x);
  const repo: ClubRepository = {
    byOwner: async owner => clone(clubs.find(c => c.owner_id === owner) ?? null),
    bySlug: async slug => clone(clubs.find(c => c.slug === slug) ?? null),
    byId: async id => clone(clubs.find(c => c.id === id) ?? null),
    clubs: async () => clone(clubs),
    events: async club => clone(events.filter(e => e.club_id === club)),
    requests: async club => clone(requests.filter(r => r.club_id === club)),
    async create(input) {
      if (clubs.some(c => c.owner_id === input.owner_id || c.slug === input.slug)) throw new ClubError('Club or page address already exists.');
      clubs.push({ ...clone(input), id: id(), owner_approved: false, status: 'pending', version: 1, reviewed_by: null });
    },
    async updateClub(id, version, patch) {
      const row = clubs.find(c => c.id === id && c.version === version);
      if (!row) throw new ClubError('This record changed in another window. Refresh before saving.');
      Object.assign(row, clone(patch), { version: version + 1 });
    },
    async createEvent(club, content) { events.push({ id: id(), club_id: club, content: clone(content), status: 'pending', version: 1 }); },
    async updateEvent(id, club, version, patch) {
      const row = events.find(e => e.id === id && e.club_id === club && e.version === version);
      if (!row) throw new ClubError('This record changed in another window. Refresh before saving.');
      Object.assign(row, clone(patch), { version: version + 1 });
    },
    async join(club, user, email, name, message) {
      if (requests.some(r => r.club_id === club && r.requester_id === user)) return;
      if (requests.filter(r => r.requester_id === user && Date.parse(r.consented_at) > Date.now() - 86400000).length >= 5) throw new ClubError('Daily request limit reached.');
      requests.push({ id: id(), club_id: club, requester_id: user, name, email, message, consented_at: new Date().toISOString(), consent_version: 'club-contact-v1', notification_status: 'preview', notification_attempts: 0 });
    },
    async notification(id, club, outcome) {
      const row = requests.find(r => r.id === id && r.club_id === club);
      if (!row || row.notification_attempts >= 10) throw new ClubError('Notification retry limit reached.');
      row.notification_status = outcome; row.notification_attempts++;
    },
  };
  const billing: ClubBilling = {
    read: async () => clone(subscription),
    checkout: async () => {
      if (failCheckout) throw new ClubError('Simulated payment decline. No club access was granted.');
      if (!['none','canceled','incomplete_expired'].includes(subscription.status)) throw new ClubError('A test subscription already exists.');
      subscription = { plan: 'club', status: 'active', periodEnd: Math.floor(Date.now()/1000) + 30*86400, cancelAtPeriodEnd: false };
      return '';
    },
    cancel: async (_user, cancel) => {
      if (subscription.status !== 'active') throw new ClubError('No active test subscription to manage.');
      subscription.cancelAtPeriodEnd = cancel; return clone(subscription);
    },
  };
  return { repo, billing, service: clubService(repo, billing),
    decline: (value: boolean) => { failCheckout = value; },
    expire: () => { subscription = { ...subscription, status: 'canceled', periodEnd: Math.floor(Date.now()/1000) - 1 }; },
  };
}
