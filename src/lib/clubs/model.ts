import { INTERESTS } from '@/lib/interests';
import { campusById } from '@/lib/campuses';
import type { SubscriptionView } from '@/lib/billing/catalog';

export type ClubContent = { name: string; description: string; meeting: string; website: string; logo: string; categories: string[] };
export type EventContent = { title: string; description: string; location: string; starts_at: string; ends_at: string; timezone: string; website: string };
export type Club = {
  id: string; owner_id: string; contact_email: string; slug: string; campus_id: string;
  content: ClubContent; owner_approved: boolean; status: 'pending' | 'approved' | 'hidden';
  version: number; reviewed_by: string | null;
};
export type ClubEvent = { id: string; club_id: string; content: EventContent; status: 'pending' | 'approved' | 'canceled' | 'hidden'; version: number };
export type JoinRequest = {
  id: string; club_id: string; requester_id: string; name: string; email: string; message: string;
  consented_at: string; consent_version: string; notification_status: 'preview' | 'simulated_sent' | 'simulated_failed';
  notification_attempts: number;
};
export type ClubView = { club: Club | null; events: ClubEvent[]; requests: JoinRequest[]; subscription: SubscriptionView; billingAvailable: boolean };
export type ClubCommand =
  | { type: 'profile'; content: unknown; slug: unknown; campus: unknown; version: unknown }
  | { type: 'event'; content: unknown; id?: string; version?: unknown }
  | { type: 'cancelEvent'; id: string; version: unknown }
  | { type: 'notification'; id: string; outcome: 'simulated_sent' | 'simulated_failed' }
  | { type: 'billing'; action: 'checkout' | 'cancel' | 'resume' | 'refresh' };
export type ClubResult = { ok: true; view: ClubView; message: string; url?: string } | { ok: false; message: string };
export class ClubError extends Error {}
export const EMPTY_CLUB: ClubContent = { name: '', description: '', meeting: '', website: '', logo: '', categories: [] };
export const EMPTY_EVENT: EventContent = { title: '', description: '', location: '', starts_at: '', ends_at: '', timezone: 'America/New_York', website: '' };
export const JOIN_CONSENT = 'I agree to share my name, verified email and message with this club so it can respond to my membership interest. This is not consent to unrelated marketing.';
export function clubPaid(value: SubscriptionView, now = Date.now()) {
  return value.plan === 'club' && value.status === 'active' && value.periodEnd !== null && value.periodEnd * 1000 > now;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ClubError('Invalid form.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== 'string') throw new ClubError(`Check ${label}.`);
  const clean = value.trim();
  if ((required && !clean) || clean.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean)) throw new ClubError(`Check ${label} (maximum ${max} characters).`);
  return clean;
}
function link(value: unknown) {
  const result = text(value, 'website', 500, false);
  if (!result) return '';
  try { const url = new URL(result); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch {}
  throw new ClubError('Website links must start with https:// and have no embedded credentials.');
}
export function validateLogo(value: unknown) {
  const data = text(value, 'logo', 205000, false);
  if (!data) return '';
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match || match[2].length % 4 !== 0) throw new ClubError('Use a PNG, JPEG or WebP logo under 150 KB.');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  const hex = Array.from(bytes.slice(0, 12), b => b.toString(16).padStart(2, '0')).join('');
  const valid = match[1] === 'png' ? hex.startsWith('89504e470d0a1a0a')
    : match[1] === 'jpeg' ? hex.startsWith('ffd8ff')
      : hex.startsWith('52494646') && hex.slice(16) === '57454250';
  if (!valid || bytes.length > 150 * 1024) throw new ClubError('Use a PNG, JPEG or WebP logo under 150 KB.');
  return data;
}
export function validateClub(value: unknown): ClubContent {
  const v = record(value);
  if (!Array.isArray(v.categories) || v.categories.length < 1 || v.categories.length > 5
    || !v.categories.every(x => typeof x === 'string' && (INTERESTS as string[]).includes(x))) throw new ClubError('Choose one to five interest categories.');
  return { name: text(v.name, 'club name', 100), description: text(v.description, 'description', 2000),
    meeting: text(v.meeting, 'meeting details', 300), website: link(v.website), logo: validateLogo(v.logo),
    categories: [...new Set(v.categories)] };
}
export function validateSlug(value: unknown) {
  const slug = text(value, 'page address', 60).toLowerCase();
  if (slug.length < 3 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || ['manage','demo','review','admin','new'].includes(slug)) throw new ClubError('Use a unique page address of 3–60 lowercase letters, numbers and hyphens.');
  return slug;
}
export function validateCampus(value: unknown) {
  if (typeof value !== 'string' || !campusById(value) || value === 'other') throw new ClubError('Choose a listed campus.');
  return value;
}
export function validateVersion(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new ClubError('Refresh this page before saving.');
  return Number(value);
}
export function validateEvent(value: unknown, now = Date.now()): EventContent {
  const v = record(value);
  const starts_at = text(v.starts_at, 'start time', 40), ends_at = text(v.ends_at, 'end time', 40);
  const withZone = /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/;
  const start = Date.parse(starts_at), end = Date.parse(ends_at);
  if (!withZone.test(starts_at) || !withZone.test(ends_at) || !Number.isFinite(start) || !Number.isFinite(end)
    || start <= now || end <= start || end - start > 7 * 86400000 || start > now + 366 * 86400000) throw new ClubError('Choose a future event within one year, ending after its start and lasting no more than seven days.');
  const timezone = text(v.timezone, 'timezone', 80);
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); } catch { throw new ClubError('Choose a valid timezone.'); }
  return { title: text(v.title, 'event title', 120), description: text(v.description, 'description', 2000),
    location: text(v.location, 'location', 300), starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(), timezone, website: link(v.website) };
}
export function validateJoin(value: unknown) {
  const v = record(value);
  if (v.consent !== true) throw new ClubError('Please agree to share your contact details with this club.');
  if (v.website) throw new ClubError('Unable to accept this request.');
  return { name: text(v.name, 'name', 100), message: text(v.message, 'message', 1000, false) };
}
export function notificationPreview(club: Club, request: JoinRequest) {
  return { to: club.contact_email, replyTo: request.email, subject: `Membership interest: ${club.content.name}`,
    text: `${request.name} asked to join ${club.content.name}.\n\n${request.message || '(No message)'}\n\nReply to this email to contact the student.\nConsent: ${request.consent_version}, ${request.consented_at}` };
}
