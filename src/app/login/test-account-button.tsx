'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startLocalTestAccount } from '@/app/login/test-account-actions';

export default function TestAccountButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 rounded-2xl border border-gold-400/30 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gold-400">Developer access</p>
      <p className="mt-2 text-sm text-white/70">Use the configured test account for local development.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await startLocalTestAccount();
            if (!result.ok) {
              setMessage('Could not continue.');
              return;
            }
            router.push('/billing');
            router.refresh();
          });
        }}
        className="btn-gold mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Continuing…' : 'Continue with test account'}
      </button>
      {message ? <p className="mt-3 text-sm text-white/80">{message}</p> : null}
    </div>
  );
}
