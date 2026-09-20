'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react';
import { campusName } from '@/lib/campuses';
import { JOIN_CONSENT, type ClubContent, type ClubEvent } from '@/lib/clubs/model';
import { clubInput } from './ClubWorkspace';
export type PublicClub = { slug: string; campus_id: string; content: ClubContent };
export default function ClubPublicPage({ club, events, accepting, join }: {
  club: PublicClub; events: ClubEvent[]; accepting: boolean;
  join: (input: unknown) => Promise<{ ok: boolean; message: string }>;
}) {
  const [name, setName] = useState(''), [message, setMessage] = useState(''), [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState(''), [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return <div className="space-y-6">
    <section className="rounded-2xl border border-white/20 bg-white/5 p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-gold-400">{campusName(club.campus_id)} · Club-maintained page</p>
      <div className="mt-5 flex items-center gap-4">{club.content.logo && <img src={club.content.logo} alt={`${club.content.name} logo`} className="h-16 w-16 rounded-xl object-contain" />}<h1 className="text-2xl font-extrabold">{club.content.name}</h1></div>
      <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed text-white/85">{club.content.description}</p>
      <p className="mt-5 text-sm font-semibold">{club.content.meeting}</p>
      <div className="mt-4 flex flex-wrap gap-2">{club.content.categories.map(x => <span key={x} className="rounded-full border border-white/25 px-3 py-1 text-xs">{x}</span>)}</div>
      {club.content.website && <a href={club.content.website} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-semibold text-gold-400">Visit the club&apos;s official website</a>}
      <p className="mt-5 text-xs leading-relaxed text-white/65">Club ownership and submitted content are reviewed separately. CampusQuest does not imply university endorsement. Check event details with the organizer before attending.</p>
    </section>
    <section className="rounded-2xl border border-white/20 p-6">
      <h2 className="text-xl font-bold">Upcoming events</h2>
      {!events.length && <p className="mt-3 text-sm text-white/70">No approved upcoming events yet.</p>}
      {events.map(event => <article key={event.id} className="mt-5 border-t border-white/15 pt-5"><h3 className="font-bold">{event.content.title}</h3>
        <p className="mt-2 text-sm text-gold-400">{new Date(event.content.starts_at).toLocaleString('en-US', { timeZone: event.content.timezone })} to {new Date(event.content.ends_at).toLocaleString('en-US', { timeZone: event.content.timezone })} · {event.content.timezone}</p>
        <p className="mt-2 text-sm">{event.content.location}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">{event.content.description}</p>
        {event.content.website && <a href={event.content.website} rel="noopener noreferrer" target="_blank" className="mt-3 inline-block text-sm text-gold-400">Event details</a>}
      </article>)}
    </section>
    <form className="space-y-4 rounded-2xl border border-gold-400/30 bg-white/5 p-6" onSubmit={e => {
      e.preventDefault();
      startTransition(async () => { try { setResult(await join({ name, message, consent, website: trap })); } catch { setResult({ ok: false, message: 'Request failed. Please try again.' }); } });
    }}>
      <h2 className="text-xl font-bold">Interested in joining?</h2>
      <p className="text-sm leading-relaxed text-white/75">Sign in with a verified CampusQuest account. We share your account email only with this club, not publicly. This is an inquiry, not automatic membership.</p>
      {!accepting && <p className="text-sm text-gold-400">New requests are currently paused. You can still browse the club&apos;s approved information.</p>}
      <label className="block text-sm font-semibold">Your name<input className={clubInput} required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Message to the club (optional)<textarea className={clubInput} rows={3} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} /></label>
      <label hidden aria-hidden="true">Leave blank<input tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></label>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-white/85"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />{JOIN_CONSENT}</label>
      <button disabled={pending || !accepting || !consent} className="btn-gold min-h-12 disabled:opacity-40">{pending ? 'Saving…' : 'Send membership request'}</button>
      <p className="text-xs text-white/65">Test version: requests are saved, but email notifications are preview-only. No email is sent.</p>
      {result && <p role={result.ok ? 'status' : 'alert'} className="text-sm leading-relaxed text-gold-400">{result.message}</p>}
    </form>
  </div>;
}
