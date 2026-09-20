'use client';
import { useState, useTransition } from 'react';
import ClubWorkspace from './ClubWorkspace';
import ClubPublicPage from './ClubPublicPage';
import { createClubDemo, demoOwner, demoReviewer, demoStudent } from '@/lib/clubs/demo';
import { EMPTY_SUBSCRIPTION } from '@/lib/billing/catalog';
import { ClubError, clubPaid, type ClubCommand, type ClubResult, type ClubView } from '@/lib/clubs/model';

export default function ClubDemo() {
  const [demo] = useState(() => createClubDemo());
  const [now] = useState(() => Date.now());
  const [view, setView] = useState<ClubView>({ club: null, events: [], requests: [], subscription: { ...EMPTY_SUBSCRIPTION }, billingAvailable: true });
  const [revision, setRevision] = useState(0), [mode, setMode] = useState<'owner'|'public'>('owner');
  const [notice, setNotice] = useState(''), [decline, setDecline] = useState(false), [pending, startTransition] = useTransition();
  const refresh = async () => { setView(await demo.service.view(demoOwner)); setRevision(x => x + 1); };
  async function run(command: ClubCommand): Promise<ClubResult> {
    try { const result = await demo.service.run(demoOwner, command); setView(result.view); return result; }
    catch (error) { return { ok: false, message: error instanceof ClubError ? error.message : 'Simulation failed.' }; }
  }
  function review(target: 'owner'|'page'|'event'|'hide', eventId?: string) {
    startTransition(async () => {
      try {
        const club = await demo.repo.byOwner(demoOwner.id);
        if (!club) throw new ClubError('Save a club page first.');
        const event = eventId ? (await demo.repo.events(club.id)).find(e => e.id === eventId) : null;
        await demo.service.review(demoReviewer, club.id, target, event?.version ?? club.version, eventId);
        setNotice('Simulated independent review saved. No real approval occurred.'); await refresh();
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Review failed.'); }
    });
  }
  return <div className="space-y-6">
    <section className="space-y-4 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-5">
      <h2 className="text-lg font-bold">Test controls · fictional accounts only</h2>
      <p className="text-sm leading-relaxed text-white/80">Same club rules and forms as the connected build, with temporary in-memory data. Refreshing the browser resets this demo. Reviewer controls here do not exist in the owner&apos;s connected workspace.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setMode('owner')} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">Owner workspace</button>
        <button type="button" onClick={() => setMode('public')} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">Student page preview</button>
        <button type="button" disabled={pending} onClick={() => review('owner')} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">Simulate ownership approval</button>
        <button type="button" disabled={pending} onClick={() => review('page')} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">Simulate page approval</button>
        <button type="button" disabled={pending} onClick={() => review('hide')} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">Simulate hiding page</button>
        <button type="button" onClick={() => { demo.expire(); void refresh(); }} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">Simulate subscription expiry</button>
      </div>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={decline} onChange={e => { setDecline(e.target.checked); demo.decline(e.target.checked); }} />Decline next test checkout</label>
      {view.events.filter(e => e.status === 'pending').map(e => <button key={e.id} type="button" disabled={pending} onClick={() => review('event', e.id)} className="mr-3 min-h-11 rounded-lg border border-white/30 px-3 text-sm">Approve event: {e.content.title}</button>)}
      {notice && <p role="status" className="text-sm text-gold-400">{notice}</p>}
    </section>
    {mode === 'owner' ? <ClubWorkspace key={revision} initialView={view} run={run} simulator /> :
      view.club?.status === 'approved' && view.club.owner_approved ? <ClubPublicPage
        club={{ slug: view.club.slug, campus_id: view.club.campus_id, content: view.club.content }}
        events={view.events.filter(e => e.status === 'approved' && Date.parse(e.content.ends_at) > now)}
        accepting={clubPaid(view.subscription)} join={async input => {
          try { const message = await demo.service.join(demoStudent, view.club!.slug, input); setView(await demo.service.view(demoOwner)); return { ok: true, message }; }
          catch (error) { return { ok: false, message: error instanceof ClubError ? error.message : 'Request failed.' }; }
        }} /> : <p className="rounded-2xl border border-white/20 p-6 text-sm">The page is not public yet. Save it, simulate ownership approval, test the $49 subscription, then simulate page approval.</p>}
  </div>;
}
