'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { CAMPUSES } from '@/lib/campuses';
import { INTERESTS } from '@/lib/interests';
import { EMPTY_CLUB, EMPTY_EVENT, clubPaid, notificationPreview, validateLogo, type ClubCommand, type ClubContent, type ClubEvent, type ClubResult, type ClubView, type EventContent } from '@/lib/clubs/model';

export const clubInput = 'mt-2 w-full rounded-xl border border-white/25 bg-brand-950 px-3 py-3 text-base text-white focus:border-gold-400 focus:outline-none';
const card = 'rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6';
export default function ClubWorkspace({ initialView, run, simulator = false }: {
  initialView: ClubView; run: (command: ClubCommand) => Promise<ClubResult>; simulator?: boolean;
}) {
  const [view, setView] = useState(initialView);
  const [tab, setTab] = useState<'page'|'events'|'requests'|'billing'>('page');
  const [profile, setProfile] = useState<ClubContent>(view.club?.content ?? { ...EMPTY_CLUB });
  const [slug, setSlug] = useState(view.club?.slug ?? '');
  const [campus, setCampus] = useState(view.club?.campus_id ?? 'uri');
  const [event, setEvent] = useState<EventContent>({ ...EMPTY_EVENT });
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  const paid = clubPaid(view.subscription);
  function perform(command: ClubCommand) {
    if (lock.current) return;
    lock.current = true; setMessage('');
    startTransition(async () => {
      try {
        const result = await run(command);
        setFailed(!result.ok); setMessage(result.message);
        if (result.ok) {
          setView(result.view);
          if (result.url) window.location.assign(result.url);
          if (command.type === 'event') { setEvent({ ...EMPTY_EVENT }); setEditing(null); }
        }
      } catch { setFailed(true); setMessage('The request failed. Your form is still here; refresh status before retrying.'); }
      finally { lock.current = false; }
    });
  }
  async function logo(file?: File) {
    if (!file) return;
    try {
      if (file.size > 150 * 1024) throw new Error('Use a logo under 150 KB.');
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      // Validate before React's deferred updater so the local catch handles rejection.
      const validatedLogo = validateLogo(data);
      setProfile(p => ({ ...p, logo: validatedLogo }));
      setFailed(false); setMessage('');
    } catch { setFailed(true); setMessage('Use a PNG, JPEG or WebP logo under 150 KB.'); }
  }
  const localDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const status = view.club ? `${view.club.owner_approved ? 'Ownership confirmed' : 'Ownership awaiting review'} · Page ${view.club.status}` : 'Start with your club page';
  return <div className="space-y-5">
    <section className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-5">
      <p className="text-sm font-bold text-gold-400">{simulator ? 'Local club simulator' : 'Club test environment'} · no real charges or outgoing emails</p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">One club page, event publishing and private membership requests. $49 USD/month when launched. No ticketing, bulk messaging, analytics suite or Genius Mining is included.</p>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-white/80">{status}</p>
      {view.club && !simulator && <Link href={`/clubs/${view.club.slug}`} className="text-sm font-semibold text-gold-400">View approved public page</Link>}
    </div>
    <nav aria-label="Club workspace" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(['page','events','requests','billing'] as const).map(name => <button type="button" key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}
        className={`min-h-12 rounded-xl border px-3 text-sm font-bold capitalize ${tab === name ? 'border-gold-400 bg-gold-400 text-brand-950' : 'border-white/20 text-white/80'}`}>{name === 'page' ? 'Club page' : name === 'requests' ? `Requests (${view.requests.length})` : name}</button>)}
    </nav>
    {message && <p role={failed ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${failed ? 'border-red-400 text-red-200' : 'border-gold-400/40 text-white'}`}>{message}</p>}
    {tab === 'page' && <form className={`${card} space-y-5`} onSubmit={e => { e.preventDefault(); perform({ type: 'profile', content: profile, slug, campus, version: view.club?.version }); }}>
      <h2 className="text-xl font-bold">Your club, one clear page</h2>
      <p className="text-sm leading-relaxed text-white/70">The first owner is reviewed before checkout. Page edits return to review and temporarily hide the page and its events. Page address and campus are fixed after creation; an operator handles corrections.</p>
      <label className="block text-sm font-semibold">Club name<input className={clubInput} required maxLength={100} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Page address<input className={clubInput} required maxLength={60} disabled={!!view.club} placeholder="uri-chess-club" value={slug} onChange={e => setSlug(e.target.value)} /><span className="mt-1 block break-all text-xs text-white/65">/clubs/{slug || 'your-club'}</span></label>
        <label className="block text-sm font-semibold">Campus<select className={clubInput} disabled={!!view.club} value={campus} onChange={e => setCampus(e.target.value)}>{CAMPUSES.filter(c => c.id !== 'other').map(c => <option key={c.id} value={c.id}>{c.short}{!c.directoryLive ? ' · not open yet' : ''}</option>)}</select></label>
      </div>
      <label className="block text-sm font-semibold">About your club<textarea className={clubInput} required rows={4} maxLength={2000} value={profile.description} onChange={e => setProfile({ ...profile, description: e.target.value })} /></label>
      <label className="block text-sm font-semibold">Meeting details<input className={clubInput} required maxLength={300} placeholder="Wednesdays at 6pm, student center" value={profile.meeting} onChange={e => setProfile({ ...profile, meeting: e.target.value })} /></label>
      <label className="block text-sm font-semibold">Official website (optional)<input className={clubInput} type="url" maxLength={500} placeholder="https://" value={profile.website} onChange={e => setProfile({ ...profile, website: e.target.value })} /></label>
      <fieldset><legend className="text-sm font-semibold">Interest categories · choose 1–5</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{INTERESTS.map(label => <label key={label} className="flex items-start gap-3 text-sm leading-relaxed text-white/85">
          <input className="mt-1 h-4 w-4 shrink-0 accent-yellow-400" type="checkbox" checked={profile.categories.includes(label)} onChange={e => setProfile({ ...profile, categories: e.target.checked ? [...profile.categories, label] : profile.categories.filter(c => c !== label) })} />{label}</label>)}</div>
      </fieldset>
      <label className="block text-sm font-semibold">Club logo (optional, PNG/JPEG/WebP, max 150 KB)<input type="file" accept="image/png,image/jpeg,image/webp" className={`${clubInput} text-sm`} onChange={e => void logo(e.target.files?.[0])} /></label>
      {profile.logo && <div className="flex items-center gap-4"><img src={profile.logo} alt="Club logo preview" className="h-16 w-16 rounded-xl object-contain" /><button type="button" onClick={() => setProfile({ ...profile, logo: '' })} className="text-sm text-gold-400">Remove logo</button></div>}
      <p className="text-sm text-white/70">Membership notifications go only to the owner&apos;s verified account email{view.club ? `: ${view.club.contact_email}` : ''}. That address is not published on the club page.</p>
      <button disabled={pending} className="btn-gold min-h-12 disabled:opacity-50">{pending ? 'Saving…' : 'Save page for review'}</button>
    </form>}
    {tab === 'events' && <div className="space-y-5">
      {!paid && <p className="rounded-xl border border-white/20 p-4 text-sm text-white/75">New event editing opens after ownership review and an active club test subscription. Canceling an existing event remains available.</p>}
      <form className={`${card} space-y-4`} onSubmit={e => { e.preventDefault(); perform({ type: 'event', content: event, id: editing?.id, version: editing?.version }); }}>
        <h2 className="text-xl font-bold">{editing ? 'Edit event' : 'Add one event'}</h2>
        <label className="block text-sm font-semibold">Event title<input className={clubInput} required maxLength={120} value={event.title} onChange={e => setEvent({ ...event, title: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Event description<textarea className={clubInput} required rows={3} maxLength={2000} value={event.description} onChange={e => setEvent({ ...event, description: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Event location<input className={clubInput} required maxLength={300} value={event.location} onChange={e => setEvent({ ...event, location: e.target.value })} /></label>
        <p className="text-xs text-white/70">Enter times in your device&apos;s local timezone. The timezone is saved with the event and shown publicly.</p>
        <div className="grid gap-4 sm:grid-cols-2">{(['starts_at','ends_at'] as const).map(key => <label key={key} className="block min-w-0 text-sm font-semibold">{key === 'starts_at' ? 'Starts' : 'Ends'}
          <input className={`${clubInput} min-w-0`} type="datetime-local" required value={localDate(event[key])} onChange={e => setEvent({ ...event, [key]: e.target.value ? new Date(e.target.value).toISOString() : '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })} /></label>)}</div>
        <label className="block text-sm font-semibold">Event website (optional)<input className={clubInput} type="url" maxLength={500} placeholder="https://" value={event.website} onChange={e => setEvent({ ...event, website: e.target.value })} /></label>
        <div className="flex flex-wrap gap-3"><button className="btn-gold min-h-12 disabled:opacity-40" disabled={pending || !paid || view.club?.status !== 'approved'}>Save event for review</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setEvent({ ...EMPTY_EVENT }); }} className="min-h-12 px-3 text-sm">Discard edit</button>}</div>
      </form>
      <section className={card}><h2 className="text-xl font-bold">Your events</h2>
        {!view.events.length && <p className="mt-3 text-sm text-white/70">No events yet. Add your first meeting or activity above.</p>}
        {view.events.map(row => <article key={row.id} className="mt-4 border-t border-white/15 pt-4">
          <h3 className="font-bold">{row.content.title}</h3><p className="mt-1 text-sm text-white/75">{row.status} · {new Date(row.content.starts_at).toLocaleString('en-US', { timeZone: row.content.timezone })} ({row.content.timezone})</p>
          <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={pending || !paid} onClick={() => { setEditing(row); setEvent(row.content); }} className="min-h-11 rounded-lg border border-white/30 px-4 text-sm disabled:opacity-40">Edit event</button>
            {row.status !== 'canceled' && <button type="button" disabled={pending} onClick={() => perform({ type: 'cancelEvent', id: row.id, version: row.version })} className="min-h-11 px-3 text-sm text-gold-400">Cancel event</button>}</div>
        </article>)}
      </section>
    </div>}
    {tab === 'requests' && <section className={card}>
      <h2 className="text-xl font-bold">Private membership requests</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/70">Only the club owner can read these. Requests are saved before notification testing. The newest 500 are shown; no public member roster is created.</p>
      {!view.requests.length && <p className="mt-5 text-sm text-white/75">No requests yet. An approved public page lets signed-in students express interest.</p>}
      {view.requests.map(request => <article key={request.id} className="mt-5 rounded-xl border border-white/20 p-4">
        <h3 className="font-bold">{request.name}</h3><p className="mt-1 break-all text-sm text-gold-400">{request.email}</p>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-white/80">{request.message || 'No message provided.'}</p>
        <p className="mt-3 text-xs text-white/65">Consented {new Date(request.consented_at).toLocaleDateString()} · Notification: {request.notification_status.replaceAll('_',' ')} · Attempts: {request.notification_attempts}</p>
        {view.club && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Preview email notification (not sent)</summary><pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75">{JSON.stringify(notificationPreview(view.club, request), null, 2)}</pre></details>}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={pending || request.notification_attempts >= 10} onClick={() => perform({ type: 'notification', id: request.id, outcome: 'simulated_sent' })} className="min-h-11 rounded-lg border border-white/25 px-3 text-sm disabled:opacity-40">Simulate notification success / retry</button>
          <button type="button" disabled={pending || request.notification_attempts >= 10} onClick={() => perform({ type: 'notification', id: request.id, outcome: 'simulated_failed' })} className="min-h-11 px-3 text-sm disabled:opacity-40">Simulate delivery failure</button>
        </div>
      </article>)}
    </section>}
    {tab === 'billing' && <section className={`${card} space-y-5`}>
      <div><h2 className="text-xl font-bold">Club · $49/month</h2><p className="mt-3 text-sm text-white/75">Status: {view.subscription.status.replaceAll('_',' ')} · {paid ? 'Club editing unlocked' : 'No paid club access'}</p></div>
      <p className="text-sm leading-relaxed text-white/75">One page, one owner, event forms and private membership inquiries. No student plan is included. No extra charges, texts or add-ons in this build.</p>
      {view.subscription.periodEnd && <p className="text-sm">{view.subscription.cancelAtPeriodEnd ? 'Access ends' : 'Current period ends'} {new Date(view.subscription.periodEnd * 1000).toLocaleDateString()}.{view.subscription.cancelAtPeriodEnd && ' No renewal scheduled.'}</p>}
      <button type="button" disabled={pending} onClick={() => perform({ type: 'billing', action: 'refresh' })} className="min-h-11 rounded-lg border border-white/30 px-4 text-sm">Refresh billing status</button>
      {['none','canceled','incomplete_expired'].includes(view.subscription.status) ? <>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />I understand this is a $49 USD monthly test subscription, renewing until canceled, and no real payment or outgoing email occurs.</label>
        <button type="button" disabled={pending || !consent || !view.club?.owner_approved || !view.billingAvailable} onClick={() => perform({ type: 'billing', action: 'checkout' })} className="btn-gold min-h-12 disabled:opacity-40">{simulator ? 'Simulate $49 checkout' : 'Continue to Stripe test checkout'}</button>
      </> : <button type="button" disabled={pending} onClick={() => perform({ type: 'billing', action: view.subscription.cancelAtPeriodEnd ? 'resume' : 'cancel' })} className="min-h-12 rounded-xl border border-white/30 px-4 text-sm">{view.subscription.cancelAtPeriodEnd ? 'Resume club test renewal' : 'Cancel club test renewal'}</button>}
      {!view.billingAvailable && <p className="text-sm text-gold-400">Connected test billing is not configured or could not be verified. Access stays locked.</p>}
      <p className="text-xs leading-relaxed text-white/65">Approval is required before checkout. URI opens first; other campuses stay uncharged while waiting. After subscription expiry, approved listings remain visible, new editing and join requests pause, and existing requests stay accessible. Event cancellation remains available. Owner transfer requires operator assistance.</p>
    </section>}
  </div>;
}
