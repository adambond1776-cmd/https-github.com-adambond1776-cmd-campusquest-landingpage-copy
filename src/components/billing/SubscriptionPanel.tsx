'use client';

import { useRef, useState, useTransition } from 'react';
import { BILLING_PLANS, subscriptionAccess, type BillingCommand, type BillingResult, type BillingView, type PaidPlan } from '@/lib/billing/catalog';

export default function SubscriptionPanel({ initialView, run, simulator = false }: {
  initialView: BillingView;
  run: (command: BillingCommand) => Promise<BillingResult>;
  simulator?: boolean;
}) {
  const [view, setView] = useState(initialView);
  const [selection, setSelection] = useState<PaidPlan | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const access = subscriptionAccess(view.subscription);
  const hasSubscription = !['none', 'canceled', 'incomplete_expired'].includes(view.subscription.status);
  function perform(command: BillingCommand) {
    if (busy.current) return;
    busy.current = true;
    setMessage('');
    startTransition(async () => {
      try {
        const result = await run(command);
        setFailed(!result.ok);
        if (!result.ok) { setMessage(result.message); return; }
        setView(result.view);
        if (result.url) { window.location.assign(result.url); return; }
        setSelection(null);
        setConfirmed(false);
        setMessage(command === 'cancel' ? 'Renewal canceled. Access lasts until the displayed period ends.'
          : command === 'resume' ? 'Renewal resumed in test mode.'
            : 'Test subscription status refreshed.');
      } catch {
        setFailed(true);
        setMessage('The test request failed. Refresh before trying again.');
      } finally { busy.current = false; }
    });
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gold-400">{simulator ? 'Local simulator' : 'Stripe test mode'} · no real charges</p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">
        {simulator ? 'Uses fictional subscription states. It does not contact Stripe or change an account.'
          : 'Use test payment details only. This flow cannot use a live Stripe key.'}
        {' '}Genius Mining and automated texting are not included.
      </p>
    </section>
    <section className="rounded-2xl border border-white/20 bg-white/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-lg font-bold">Your test subscription</h2>
          <p className="mt-2 text-3xl font-extrabold">{access.plan === 'free' ? 'Free access' : BILLING_PLANS[access.plan].name}</p>
          <p className="mt-2 text-sm text-white/75">Status: {view.subscription.status.replaceAll('_', ' ')}</p>
        </div>
        <button type="button" onClick={() => perform('refresh')} disabled={pending || !view.available}
          className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-semibold disabled:opacity-50">Refresh status</button>
      </div>
      {view.subscription.periodEnd && <p className="mt-3 text-sm text-white/75">
        {view.subscription.cancelAtPeriodEnd ? 'Access ends' : 'Current period ends'}{' '}
        {new Date(view.subscription.periodEnd * 1000).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })}.
        {view.subscription.cancelAtPeriodEnd && ' No renewal is scheduled.'}
      </p>}
      {hasSubscription && <div className="mt-4">
        <button type="button" disabled={pending || !view.available}
          onClick={() => perform(view.subscription.cancelAtPeriodEnd ? 'resume' : 'cancel')}
          className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-semibold disabled:opacity-50">
          {view.subscription.cancelAtPeriodEnd ? 'Resume test renewal' : 'Cancel test renewal'}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-white/65">Cancellation does not delete your profile. Plan switching and payment-method recovery are not enabled in this first test flow.</p>
      </div>}
      {view.message && <p className="mt-4 text-sm text-gold-400">{view.message}</p>}
    </section>
    <div className="grid gap-4 sm:grid-cols-2">
      {(['basic', 'plus'] as const).map((plan) => <section key={plan} className="rounded-2xl border border-white/20 bg-white/5 p-6">
        <h2 className="text-xl font-bold">{BILLING_PLANS[plan].name}</h2>
        <p className="mt-2 text-3xl font-extrabold">${BILLING_PLANS[plan].cents / 100}<span className="text-sm font-normal text-white/70"> / month</span></p>
        <ul className="my-5 space-y-3 text-sm leading-relaxed text-white/80">{BILLING_PLANS[plan].features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <button type="button" onClick={() => { setSelection(plan); setConfirmed(false); setMessage(''); }} disabled={pending || !view.available || hasSubscription}
          className="btn-gold min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-40">Test {BILLING_PLANS[plan].name}</button>
      </section>)}
    </div>
    {selection && <section aria-label="Review test subscription" className="rounded-2xl border border-gold-400/50 bg-white/5 p-6">
      <h2 className="text-lg font-bold">Review {BILLING_PLANS[selection].name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/80">${BILLING_PLANS[selection].cents / 100} USD per month in test mode, renewing monthly until canceled. No text overages or add-ons. No real money is charged.</p>
      <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" checked={confirmed} disabled={pending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        I understand this is a test subscription and some plan features are still planned.
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={!confirmed || pending} onClick={() => perform(selection)} className="btn-gold min-h-11 disabled:opacity-40">
          {pending ? 'Working…' : simulator ? 'Simulate test checkout' : 'Continue to Stripe test checkout'}
        </button>
        <button type="button" disabled={pending} onClick={() => setSelection(null)} className="min-h-11 px-3 text-sm font-semibold">Back</button>
      </div>
    </section>}
    {message && <p role={failed ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${failed ? 'border-red-400/50 text-red-200' : 'border-gold-400/30 text-white'}`}>{message}</p>}
    <section className="rounded-2xl border border-white/20 p-6">
      <h2 className="text-lg font-bold">Access check</h2>
      <p className="mt-2 text-xs leading-relaxed text-white/65">Permissions below are not a claim that every feature is built. Recommendations are connected; saved events, weekly sending, monthly plans and sharing still need their feature builds.</p>
      <dl className="mt-4 space-y-3 text-sm">
        {([
          ['Personal recommendations', access.recommendations],
          ['Saved events and weekly updates (planned)', access.savedEvents],
          ['Monthly plans and sharing (planned)', access.monthlyPlan],
          ['Genius Mining (coming later)', access.geniusMining],
          ['Automated texting (not included)', access.automatedTexts],
        ] as const).map(([label, allowed]) => <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-2"><dt>{label}</dt><dd className="shrink-0 font-semibold">{allowed ? 'Included' : 'Not included'}</dd></div>)}
      </dl>
    </section>
  </div>;
}
