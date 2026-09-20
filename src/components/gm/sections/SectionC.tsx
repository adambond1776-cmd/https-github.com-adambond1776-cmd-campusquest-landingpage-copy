'use client';

import { getField } from '@hiddengeniuslabs/genius-mining';
import FieldShell from '@/components/gm/FieldShell';
import LongAnswer from '@/components/gm/LongAnswer';
import type { SectionProps } from './types';

const C1 = getField('C1');
const C2 = getField('C2');
const C3 = getField('C3');

export default function SectionC({ values, set, errors, warnings }: SectionProps) {
  const picked = values.C1 ?? [];

  const toggle = (index: number) => {
    if (picked.includes(index)) {
      set({ C1: picked.filter((value) => value !== index) });
      return;
    }
    if (picked.length >= 2) return;
    set({ C1: [...picked, index].sort((a, b) => a - b) });
  };

  const chosen = picked
    .map((index) => values.A1?.find((item) => item.index === index)?.text)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-10">
      <FieldShell
        id="C1"
        prompt={C1.prompt ?? ''}
        error={errors.C1}
        hint={`${picked.length} of 2 chosen.`}
      >
        <ul className="space-y-2">
          {(values.A1 ?? []).map((item) => {
            const selected = picked.includes(item.index);
            const atLimit = picked.length >= 2 && !selected;

            return (
              <li key={item.index}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(item.index)}
                  disabled={atLimit}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? 'border-brand-600 bg-brand-50 text-brand-900'
                      : atLimit
                        ? 'cursor-not-allowed border-cream-300 bg-cream-100/50 text-brand-400'
                        : 'border-cream-400 bg-white text-brand-800 hover:border-brand-300 hover:bg-cream-100'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
                      selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-300'
                    }`}
                  >
                    {item.index}
                  </span>
                  <span className="font-medium">{item.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FieldShell>

      {chosen.length === 2 ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-500">
            The two you picked
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {chosen.map((text) => (
              <li key={text} className="font-semibold text-brand-900">
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-brand-700">
            The next two questions are about these two only.
          </p>
        </div>
      ) : null}

      <FieldShell id="C2" prompt={C2.prompt ?? ''} error={errors.C2}>
        <LongAnswer
          id="C2"
          value={values.C2 ?? ''}
          onChange={(value) => set({ C2: value })}
          invalid={Boolean(errors.C2)}
          minRows={3}
        />
      </FieldShell>

      <FieldShell
        id="C3"
        prompt={C3.prompt ?? ''}
        error={errors.C3}
        warning={warnings.C3}
        hint="Take your time on this one. It matters more than anything else you write today."
      >
        <LongAnswer
          id="C3"
          value={values.C3 ?? ''}
          onChange={(value) => set({ C3: value })}
          invalid={Boolean(errors.C3)}
          minRows={7}
        />
        <p className="mt-2 text-right text-xs text-brand-400 tabular-nums">
          {(values.C3 ?? '').trim().length} characters
        </p>
      </FieldShell>
    </div>
  );
}
