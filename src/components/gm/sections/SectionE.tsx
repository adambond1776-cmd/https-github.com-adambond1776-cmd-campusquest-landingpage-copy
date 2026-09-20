'use client';

import { getField } from '@hiddengeniuslabs/genius-mining';
import FieldShell from '@/components/gm/FieldShell';
import LongAnswer from '@/components/gm/LongAnswer';
import { textInputClass, type SectionProps } from './types';

const E1 = getField('E1');
const E2 = getField('E2');
const E3 = getField('E3');

export default function SectionE({ values, set, errors, warnings }: SectionProps) {
  const e3 = values.E3 ?? null;

  return (
    <div className="space-y-10">
      <FieldShell id="E1" prompt={E1.prompt ?? ''} optional error={errors.E1}>
        <LongAnswer
          id="E1"
          value={values.E1 ?? ''}
          onChange={(value) => set({ E1: value })}
          minRows={3}
        />
      </FieldShell>

      <FieldShell id="E2" prompt={E2.prompt ?? ''} optional error={errors.E2}>
        <LongAnswer
          id="E2"
          value={values.E2 ?? ''}
          onChange={(value) => set({ E2: value })}
          minRows={3}
        />
      </FieldShell>

      <FieldShell id="E3" prompt={E3.prompt ?? ''} optional warning={warnings.E3}>
        <div className="flex gap-2">
          {(['YES', 'NO'] as const).map((answer) => {
            const selected = e3?.answer === answer;
            return (
              <button
                key={answer}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  set({
                    E3: {
                      answer,
                      which_question: answer === 'YES' ? (e3?.which_question ?? '') : null,
                    },
                  })
                }
                className={`rounded-xl border px-6 py-2.5 text-sm font-bold transition-colors ${
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-cream-400 bg-white text-brand-700 hover:border-brand-300 hover:bg-cream-100'
                }`}
              >
                {answer}
              </button>
            );
          })}
        </div>

        {e3?.answer === 'YES' ? (
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-brand-800">{E3.followup_prompt}</span>
            <input
              type="text"
              value={e3.which_question ?? ''}
              onChange={(event) =>
                set({ E3: { answer: 'YES', which_question: event.target.value } })
              }
              className={`${textInputClass} mt-1.5`}
              placeholder="C3"
              autoComplete="off"
            />
          </label>
        ) : null}
      </FieldShell>
    </div>
  );
}
