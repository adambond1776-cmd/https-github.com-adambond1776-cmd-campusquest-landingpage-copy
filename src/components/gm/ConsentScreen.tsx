'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { CLOSING_BLOCK } from '@hiddengeniuslabs/genius-mining';
import { acceptConsent } from '@/app/genius-mining/actions';
import FormAlert from '@/components/FormAlert';
import { BOOK } from '@/lib/book';

/**
 * The consent screen, shown before the questionnaire starts.
 *
 * Acceptance is an affirmative action: an unticked checkbox the student has to
 * tick, not a pre-ticked box and not a footer link. The version of the copy they
 * agreed to is recorded alongside the timestamp.
 */
export default function ConsentScreen() {
  const router = useRouter();
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleContinue = () => {
    if (!understood) {
      setError('Tick the box to say you understand, and we can start.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await acceptConsent();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push('/genius-mining/questionnaire');
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-extrabold text-brand-900">What happens to what you write</h2>

        <div className="mt-4 space-y-4 text-brand-800">
          <p>
            Your answers are analyzed to produce your Genius Profile. Your name is removed before
            that analysis happens — your form is tracked by a participant code, not by you.
          </p>
          <p>
            Your profile comes back to you. You can change anything on it. Nothing is filed until
            you say it&rsquo;s finished.
          </p>
          <p>
            To improve the questionnaire itself we keep an anonymized copy of the{' '}
            <em>structure</em> of your answers: which verbs you picked, which two moments you chose,
            how the tally came out, and how long each answer was. Not a word of what you actually
            wrote. That copy stays even if you cancel, because there is nothing in it that points
            back at you.
          </p>
        </div>

        <ul className="mt-6 space-y-2 border-t border-cream-200 pt-5 text-sm text-brand-700">
          {CLOSING_BLOCK.content_summary.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              {line}
            </li>
          ))}
        </ul>

        {/* Provenance only. No cover, no price, no button.
            Reading the source before answering would tell us nothing about the
            student and a great deal about the book, so this is a plain link out
            and it stays that way. */}
        <p className="mt-5 border-t border-cream-200 pt-5 text-sm text-brand-600">
          This questionnaire implements Tool {BOOK.tool.number} of{' '}
          <em>
            {BOOK.title}: {BOOK.edition}
          </em>{' '}
          by {BOOK.author}.{' '}
          <Link href="/method" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900">
            Where this comes from
          </Link>{' '}
          sets out the method in full. You do not need to read anything first — in fact it is
          better if you don&rsquo;t.
        </p>
      </div>

      {error && <FormAlert message={error} />}

      <div className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-7">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={understood}
            onChange={(event) => {
              setUnderstood(event.target.checked);
              if (error) setError(null);
            }}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-brand-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="font-semibold text-brand-900">
            I understand what happens to what I write.
          </span>
        </label>

        <button
          type="button"
          onClick={handleContinue}
          disabled={pending}
          className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting
            </>
          ) : (
            <>
              Start the questionnaire
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
