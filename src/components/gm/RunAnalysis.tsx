'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import FormAlert from '@/components/FormAlert';
import { runAnalysisAction } from '@/app/genius-mining/actions';

export default function RunAnalysis({ isMockEngine }: { isMockEngine: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await runAnalysisAction({ kind: 'initial' });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-xl font-extrabold text-brand-900">That&rsquo;s the whole questionnaire.</h2>
      <p className="mt-3 text-brand-700">
        The analysis reads what you wrote and works out the role you were playing across your six
        instances. It takes a few seconds. Your name is not part of what gets sent.
      </p>

      {error ? (
        <div className="mt-5">
          <FormAlert message={error} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading your answers
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Run my analysis
          </>
        )}
      </button>

      <p className="mt-4 text-xs text-brand-500">
        One complete analysis is included with your membership. You can edit and refine the profile
        afterwards as much as you like.
      </p>

      {isMockEngine ? (
        <p className="mt-2 text-xs font-medium text-gold-600">
          Dev mode: no Anthropic key is configured, so this runs a local stand-in and the profile
          will be stamped <code className="font-mono">mock-engine</code>. It is not a reading.
        </p>
      ) : null}
    </div>
  );
}
