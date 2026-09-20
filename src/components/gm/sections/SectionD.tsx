'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  VERB_VOCABULARY,
  effectiveVerb,
  getField,
  needsStudentTiebreak,
  resolveD2,
} from '@hiddengeniuslabs/genius-mining';
import type { D1Resolution, Verb } from '@hiddengeniuslabs/genius-mining';
import FieldShell from '@/components/gm/FieldShell';
import type { SectionProps } from './types';
import { textInputClass } from './types';

const D1 = getField('D1');
const D2 = getField('D2');
const D3 = getField('D3');

export type SectionDProps = SectionProps & {
  d1Resolution: D1Resolution | null;
  onTiebreak: (verb: Verb) => Promise<{ ok: boolean; message?: string }>;
};

function Tally({ values }: Pick<SectionProps, 'values'>) {
  const counts = new Map<Verb, number>();
  for (const entry of values.B ?? []) {
    counts.set(entry.verb, (counts.get(entry.verb) ?? 0) + 1);
  }

  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <dl className="space-y-1.5">
      {rows.map(([verb, count]) => (
        <div key={verb} className="flex items-center gap-3">
          <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wide text-brand-700">
            {verb}
          </dt>
          <dd className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 rounded-full bg-brand-400"
              style={{ width: `${count * 18}px` }}
            />
            <span className="text-sm font-semibold text-brand-600 tabular-nums">{count}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function SectionD({
  values,
  set,
  errors,
  d1Resolution,
  onTiebreak,
}: SectionDProps) {
  const [pending, startTransition] = useTransition();
  const [tiebreakError, setTiebreakError] = useState<string | null>(null);

  const verb = d1Resolution ? effectiveVerb(d1Resolution) : null;
  const workingWord = d1Resolution ? resolveD2(d1Resolution) : null;
  const awaitingChoice = d1Resolution ? needsStudentTiebreak(d1Resolution) : false;

  const choose = (candidate: Verb) => {
    setTiebreakError(null);
    startTransition(async () => {
      const result = await onTiebreak(candidate);
      if (!result.ok) setTiebreakError(result.message ?? 'That did not save.');
    });
  };

  return (
    <div className="space-y-10">
      <FieldShell id="D1" prompt={D1.prompt ?? ''}>
        <div className="rounded-xl border border-cream-300 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-500">
            Your six tags
          </p>
          <div className="mt-3.5">
            <Tally values={values} />
          </div>
        </div>

        {awaitingChoice ? (
          // The paper form's tiebreak does not cover every case. When the count
          // ties and both C1 instances carry a different tied verb, there is no
          // rule left to apply, so the student decides.
          <div className="mt-5 rounded-xl border border-gold-500/40 bg-gold-400/15 p-5">
            <p className="font-bold text-brand-900">
              Your count tied between {d1Resolution?.candidates?.join(' and ')}.
            </p>
            <p className="mt-1.5 text-sm text-brand-700">
              Which one is closer to what you were actually doing?
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(d1Resolution?.candidates ?? []).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => choose(candidate)}
                  disabled={pending}
                  className="btn-secondary px-5 py-2.5 text-xs uppercase tracking-wide disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {candidate}
                </button>
              ))}
            </div>

            {tiebreakError ? (
              <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                {tiebreakError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-500">
              Most circled
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900">{verb}</p>
            {d1Resolution?.resolution === 'tie_broken_by_C1' ? (
              <p className="mt-2 text-sm text-brand-700">
                Your count tied, so this came from the two instances you circled in C1.
              </p>
            ) : null}
            {d1Resolution?.resolution === 'UNRESOLVED' ? (
              <p className="mt-2 text-sm text-brand-700">
                Your count tied and the tiebreak did not settle it either, so this is the one you
                picked. Your profile will say the tally was thin.
              </p>
            ) : null}
          </div>
        )}
      </FieldShell>

      {workingWord ? (
        <FieldShell id="D2" prompt={D2.prompt ?? ''}>
          <div className="rounded-2xl bg-brand-950 p-7 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              Your working word
            </p>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {workingWord}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-white/60">
              {VERB_VOCABULARY.find((entry) => entry.maps_to_working_word === workingWord)?.means}
            </p>
          </div>
        </FieldShell>
      ) : null}

      {workingWord ? (
        <FieldShell id="D3" prompt={D3.prompt ?? ''} error={errors.D3}>
          <input
            type="text"
            value={values.D3 ?? ''}
            onChange={(event) => set({ D3: event.target.value })}
            className={textInputClass}
            placeholder="One sentence."
            aria-invalid={Boolean(errors.D3) || undefined}
          />
          <p className="mt-2.5 text-sm text-brand-600">{D3.shown_after}</p>
        </FieldShell>
      ) : null}
    </div>
  );
}
