'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Club, ClubEvent } from '@/lib/clubs/model';
import { reviewClub } from '@/app/clubs/manage/actions';
export default function ClubReview({ rows }: { rows: { club: Club; events: ClubEvent[] }[] }) {
  const [confirmed, setConfirmed] = useState(false), [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition(); const router = useRouter();
  function review(club: Club, target: 'owner'|'page'|'event'|'hide', event?: ClubEvent) {
    startTransition(async () => {
      try { const result = await reviewClub({ clubId: club.id, target, eventId: event?.id, version: event?.version ?? club.version, confirmed }); setMessage(result.message); if (result.ok) { setConfirmed(false); router.refresh(); } }
      catch { setMessage('Review failed. Refresh before retrying.'); }
    });
  }
  return <div className="space-y-5">
    <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />I independently checked the relevant club ownership claim or the submitted page/event details. Payment is not verification.</label>
    {message && <p role="status" className="text-sm text-gold-400">{message}</p>}
    {!rows.length && <p>No clubs awaiting review.</p>}
    {rows.map(({ club, events }) => <article key={club.id} className="space-y-4 rounded-2xl border border-white/20 p-6">
      <h2 className="text-xl font-bold">{club.content.name}</h2><p className="break-all text-sm">{club.contact_email} · {club.campus_id} · {club.status} · Owner {club.owner_approved ? 'confirmed' : 'unconfirmed'}</p>
      <p className="whitespace-pre-wrap text-sm text-white/80">{club.content.description}</p><p className="text-sm">{club.content.meeting}</p>
      <p className="text-sm">{club.content.categories.join(', ')}</p>
      {club.content.website && <a className="inline-block text-sm text-gold-400" href={club.content.website} rel="noopener noreferrer" target="_blank">Official club website</a>}
      <div className="flex flex-wrap gap-3">{(['owner','page','hide'] as const).map(target => <button key={target} type="button" disabled={pending || !confirmed} onClick={() => review(club, target)} className="min-h-11 rounded-lg border border-white/30 px-4 text-sm disabled:opacity-40">{target === 'owner' ? 'Confirm owner' : target === 'page' ? 'Approve page' : 'Hide club and events'}</button>)}</div>
      {events.filter(e => e.status === 'pending').map(e => <div key={e.id} className="space-y-2 border-t border-white/20 pt-4"><h3 className="font-bold">{e.content.title}</h3>
        <p className="text-sm">{e.content.description}</p><p className="text-sm">{e.content.location} · {e.content.starts_at} to {e.content.ends_at} ({e.content.timezone})</p>
        {e.content.website && <a href={e.content.website} rel="noopener noreferrer" target="_blank" className="inline-block text-sm text-gold-400">Event website</a>}
        <div><button type="button" disabled={pending || !confirmed} onClick={() => review(club, 'event', e)} className="min-h-11 rounded-lg border border-white/30 px-4 text-sm disabled:opacity-40">Approve event</button></div>
      </div>)}
    </article>)}
  </div>;
}
