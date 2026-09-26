'use client';

import { useState, useTransition } from 'react';
import { startFoundingCheckout } from '@/app/billing/founding-actions';

export default function FoundingBasicPurchaseButton({ amount }: { amount: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
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
        className="w-full rounded-xl bg-gold-400 px-4 py-3 text-center text-sm font-bold text-brand-950 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? 'Opening checkout…' : `Get Founding Basic — $${amount}`}
      </button>
      {message ? <p className="mt-3 text-center text-sm text-white/80">{message}</p> : null}
    </div>
  );
}
