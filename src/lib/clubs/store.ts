import { createAdminClient } from '@/lib/supabase/admin';
import { ClubError, type Club, type ClubContent, type ClubEvent, type EventContent, type JoinRequest } from './model';

export interface ClubRepository {
  byOwner(id: string): Promise<Club | null>;
  bySlug(slug: string): Promise<Club | null>;
  byId(id: string): Promise<Club | null>;
  clubs(): Promise<Club[]>;
  events(club: string): Promise<ClubEvent[]>;
  requests(club: string): Promise<JoinRequest[]>;
  create(input: { owner_id: string; contact_email: string; slug: string; campus_id: string; content: ClubContent }): Promise<void>;
  updateClub(id: string, version: number, patch: Partial<Pick<Club, 'content' | 'status' | 'owner_approved' | 'reviewed_by'>>): Promise<void>;
  createEvent(club: string, content: EventContent): Promise<void>;
  updateEvent(id: string, club: string, version: number, patch: { content?: EventContent; status: ClubEvent['status']; reviewed_by?: string }): Promise<void>;
  join(club: string, user: string, email: string, name: string, message: string): Promise<void>;
  notification(id: string, club: string, outcome: 'simulated_sent' | 'simulated_failed'): Promise<void>;
}
export function clubRepository(): ClubRepository {
  const db = createAdminClient();
  if (!db) throw new ClubError('Connect a separate test database to use club accounts.');
  const check = (error: unknown) => { if (error) throw new ClubError('Club storage could not complete the request. Check the page address for duplicates, then refresh and retry.'); };
  const cas = (data: unknown, error: unknown) => {
    check(error); if (!data) throw new ClubError('This record changed in another window. Refresh before saving.');
  };
  return {
    async byOwner(id) { const { data, error } = await db.from('cq_clubs').select('*').eq('owner_id', id).maybeSingle(); check(error); return data; },
    async bySlug(slug) { const { data, error } = await db.from('cq_clubs').select('*').eq('slug', slug).maybeSingle(); check(error); return data; },
    async byId(id) { const { data, error } = await db.from('cq_clubs').select('*').eq('id', id).maybeSingle(); check(error); return data; },
    async clubs() { const { data, error } = await db.from('cq_clubs').select('*').order('updated_at', { ascending: false }).limit(200); check(error); return data ?? []; },
    async events(club) { const { data, error } = await db.from('cq_club_events').select('*').eq('club_id', club).order('updated_at', { ascending: false }).limit(100); check(error); return data ?? []; },
    async requests(club) { const { data, error } = await db.from('cq_club_requests').select('*').eq('club_id', club).order('consented_at', { ascending: false }).limit(500); check(error); return data ?? []; },
    async create(input) { const { error } = await db.from('cq_clubs').insert(input); check(error); },
    async updateClub(id, version, patch) {
      const { data, error } = await db.from('cq_clubs').update({ ...patch, version: version + 1, updated_at: new Date().toISOString() }).eq('id', id).eq('version', version).select('id').maybeSingle();
      cas(data, error);
    },
    async createEvent(club, content) { const { error } = await db.from('cq_club_events').insert({ club_id: club, content }); check(error); },
    async updateEvent(id, club, version, patch) {
      const { data, error } = await db.from('cq_club_events').update({ ...patch, version: version + 1, updated_at: new Date().toISOString() }).eq('id', id).eq('club_id', club).eq('version', version).select('id').maybeSingle();
      cas(data, error);
    },
    async join(club, user, email, name, message) {
      const { error } = await db.rpc('cq_request_club_join', { p_club: club, p_user: user, p_email: email, p_name: name, p_message: message });
      if (error) throw new ClubError('Request not saved. Check that the club is accepting requests and that you have not reached five new club requests in 24 hours.');
    },
    async notification(id, club, outcome) {
      // This is intentionally a preview/test queue, not a Resend call.
      const { data: row, error: readError } = await db.from('cq_club_requests').select('notification_attempts,last_attempt_at').eq('id', id).eq('club_id', club).maybeSingle();
      check(readError);
      if (!row || row.notification_attempts >= 10) throw new ClubError('Notification retry limit reached.');
      if (row.last_attempt_at && Date.now() - Date.parse(row.last_attempt_at) < 1000) throw new ClubError('Wait a moment before retrying.');
      const { data, error } = await db.from('cq_club_requests').update({ notification_status: outcome, notification_attempts: row.notification_attempts + 1, last_attempt_at: new Date().toISOString() })
        .eq('id', id).eq('club_id', club).eq('notification_attempts', row.notification_attempts).select('id').maybeSingle();
      cas(data, error);
    },
  };
}
