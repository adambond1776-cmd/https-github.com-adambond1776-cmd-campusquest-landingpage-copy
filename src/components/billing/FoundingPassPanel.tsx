'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { startFoundingCheckout } from '@/app/billing/founding-actions';
import { FOUNDING_OFFERS } from '@/lib/launch-offers';
import { FOUNDING_TERMS_COPY } from '@/lib/basic/founding';
import { isProductionRuntime } from '@/lib/runtime';

export default function FoundingPassPanel({
  signedIn,
  active,
  expiry,
  earlyAccess,
  notice,
  checkoutReady,
  purchasesBlocked = false,
}: {
  signedIn: boolean;
  active: boolean;
  expiry: string | null;
  earlyAccess: boolean;
  notice: 'processing' | 'canceled' | null;
  checkoutReady: boolean;
  purchasesBlocked?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const offer = FOUNDING_OFFERS.student;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-gold-400">
        {purchasesBlocked || isProductionRuntime() ? 'Founding access' : 'Stripe test mode · no real charges'}
      </p>
      <h2 className="mt-3 text-2xl font-extrabold">CQ Basic Founding Pass</h2>
      {active ? (
        <div className="mt-4 space-y-3">
          <p className="inline-flex rounded-full bg-gold-400 px-3 py-1 text-sm font-bold text-brand-950">Founding Basic active</p>
          {expiry ? <p className="text-sm text-white/80">Access ends {expiry}.</p> : null}
          {earlyAccess ? <p className="text-sm font-semibold text-gold-300">Early Access</p> : null}
          <p className="text-sm text-white/70">{FOUNDING_TERMS_COPY}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-3xl font-extrabold">${offer.amount} <span className="text-base font-semibold text-white/70">once</span></p>
          <p className="text-sm text-white/80">{offer.days} days of access.</p>
          <p className="text-sm font-semibold text-white/80">{FOUNDING_TERMS_COPY}</p>
          {notice === 'processing' ? (
            <p className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm leading-relaxed text-white/80">
              Payment processing. Founding Basic appears after Stripe confirms the payment. Returning from checkout does not grant access.
            </p>
          ) : null}
          {notice === 'canceled' ? (
            <p className="rounded-xl border border-white/15 p-4 text-sm leading-relaxed text-white/75">
              Checkout was canceled. No access was granted.
            </p>
          ) : null}
          {signedIn && purchasesBlocked ? (
            <p className="text-sm text-white/75">Purchases are not available for this account.</p>
          ) : null}
          {signedIn && !purchasesBlocked ? (
            <button
              type="button"
              disabled={pending || !checkoutReady}
              onClick={() => {
                if (!checkoutReady) return;
                setMessage(null);
                startTransition(async () => {
                  const result = await startFoundingCheckout();
                  if (!result.ok) {
                    setMessage(result.message);
                    return;
                  }
                  window.location.assign(result.url);
                });
              }}
              className="inline-flex min-h-11 items-center rounded-xl bg-gold-400 px-5 py-2 text-sm font-bold text-brand-950 disabled:opacity-60"
            >
              {pending ? 'Opening checkout…' : `Get Founding Basic — $${offer.amount}`}
            </button>
          ) : null}
          {signedIn && !checkoutReady && !purchasesBlocked ? (
            <p className="text-sm text-white/70">Test checkout is not configured. No payment can start and no access has been granted.</p>
          ) : null}
          {!signedIn ? (
            <Link href="/login?next=/billing" className="inline-flex min-h-11 items-center text-sm font-bold text-gold-400">
              Sign in to purchase
            </Link>
          ) : null}
          {message ? <p className="text-sm text-white/80">{message}</p> : null}
        </div>
      )}
    </section>
  );
}
