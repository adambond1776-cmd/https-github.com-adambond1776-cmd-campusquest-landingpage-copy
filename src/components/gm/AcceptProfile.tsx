'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import FormAlert from '@/components/FormAlert';
import { acceptProfile } from '@/app/genius-mining/actions';

export default function AcceptProfile() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptProfile();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-7">
      <h2 className="text-lg font-extrabold text-brand-900">Ready to file this?</h2>
      <p className="mt-2.5 text-brand-700">
        Nothing is filed until you say it&rsquo;s finished. You can keep rewriting lines after this
        too — signing off is not a lock.
      </p>

      {error ? (
        <div className="mt-4">
          <FormAlert message={error} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="btn-primary mt-5 w-full disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Filing
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            This is finished
          </>
        )}
      </button>
    </div>
  );
}
