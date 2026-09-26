'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { grantLocalBasicAccess, revokeLocalBasicAccess } from '@/app/settings/basic-actions';

export default function LocalBasicGrant() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-5 rounded-xl border border-dashed border-gold-400/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await grantLocalBasicAccess(formData);
          setMessage(result.message);
          if (result.ok) router.refresh();
        });
      }}
    >
      <p className="text-sm font-semibold text-gold-300">Local Basic testing</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        Grants 60 days of Founding Basic to this signed-in account. It does not run in
        production, does not accept a user id from the browser, and does not charge anything.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="early_access" className="h-4 w-4" />
        Include Early Access
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-gold-400 px-4 py-2 text-sm font-semibold text-brand-950 disabled:opacity-60"
        >
          {pending ? 'Updating…' : 'Grant local Basic access'}
        </button>
        <button
          type="button"
          disabled={pending}
          className="min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => {
            startTransition(async () => {
              const result = await revokeLocalBasicAccess();
              setMessage(result.message);
              if (result.ok) router.refresh();
            });
          }}
        >
          Remove local Basic access
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-white/80">{message}</p> : null}
    </form>
  );
}
