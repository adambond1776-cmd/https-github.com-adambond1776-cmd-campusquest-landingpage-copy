'use client';
import { useState } from 'react';
import SubscriptionPanel from './SubscriptionPanel';
import { EMPTY_SUBSCRIPTION, isPaidPlan, type BillingCommand, type BillingResult, type BillingStatus, type SubscriptionView } from '@/lib/billing/catalog';

export default function BillingSimulator() {
  const [state, setState] = useState<SubscriptionView>({ ...EMPTY_SUBSCRIPTION });
  const [periodEnd] = useState(() => Math.floor(Date.now() / 1000) + 30 * 86400);
  const [version, setVersion] = useState(0);
  const [fail, setFail] = useState(false);
  const [checkoutOutcome, setCheckoutOutcome] = useState('success');
  function scenario(status: BillingStatus | 'reset') {
    setState(status === 'reset' ? { ...EMPTY_SUBSCRIPTION } : { ...state,
      plan: state.plan ?? 'basic', status, periodEnd, cancelAtPeriodEnd: false });
    setVersion((value) => value + 1);
  }
  async function run(command: BillingCommand): Promise<BillingResult> {
    let next = state;
    if (fail) return { ok: false, message: 'Simulated connection failure. No access change was made.' };
    if (isPaidPlan(command)) {
      if (checkoutOutcome === 'canceled') return { ok: false, message: 'Checkout was canceled. No subscription was created.' };
      if (checkoutOutcome === 'declined') return { ok: false, message: 'Test payment declined. Paid access was not granted.' };
      next = { plan: command, status: checkoutOutcome === 'pending' ? 'incomplete' : 'active',
        periodEnd, cancelAtPeriodEnd: false };
    } else if (command === 'cancel' || command === 'resume') {
      if (command === 'resume' && state.status !== 'active') return { ok: false, message: 'Resolve the payment status before resuming renewal.' };
      next = { ...state, cancelAtPeriodEnd: command === 'cancel' };
    }
    setState(next);
    return { ok: true, view: { available: true, subscription: { ...next } } };
  }
  return <>
    <section className="mb-6 rounded-2xl border border-white/20 p-5">
      <h2 className="font-bold">Scenario controls</h2>
      <label className="mt-4 block text-sm">Next checkout result
        <select value={checkoutOutcome} onChange={(event) => setCheckoutOutcome(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-white/30 bg-brand-950 px-3">
          <option value="success">Successful test payment</option><option value="declined">Declined payment</option>
          <option value="pending">Payment pending</option><option value="canceled">Canceled checkout</option>
        </select>
      </label>
      <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} /> Simulate connection failure</label>
      <div className="mt-4 flex flex-wrap gap-2">
        {(['past_due', 'canceled', 'active', 'reset'] as const).map((status) => <button key={status} type="button" onClick={() => scenario(status)}
          className="min-h-11 rounded-lg border border-white/30 px-3 text-sm">{status === 'reset' ? 'Reset simulator' : `Simulate ${status.replaceAll('_', ' ')}`}</button>)}
      </div>
    </section>
    <SubscriptionPanel key={version} simulator initialView={{ available: true, subscription: state }} run={run} />
  </>;
}
