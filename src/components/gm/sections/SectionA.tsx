'use client';

import { A1_COUNT, getField } from '@hiddengeniuslabs/genius-mining';
import type { A4Entry } from '@hiddengeniuslabs/genius-mining';
import FieldShell from '@/components/gm/FieldShell';
import LongAnswer from '@/components/gm/LongAnswer';
import { selectClass, textInputClass, type SectionProps } from './types';

const A1 = getField('A1');
const A2 = getField('A2');
const A3 = getField('A3');
const A4 = getField('A4');
const A4_CONSENT = getField('A4_consent');

const A4_ROWS = A4.count ?? 4;

const emptyA4 = (): A4Entry => ({
  activity: '',
  mode: '' as A4Entry['mode'],
  social: '' as A4Entry['social'],
  setting: '' as A4Entry['setting'],
});

export default function SectionA({ values, set, errors, warnings }: SectionProps) {
  const instances = Array.from({ length: A1_COUNT }, (_, index) => {
    const stored = values.A1?.find((item) => item.index === index + 1);
    return { index: index + 1, text: stored?.text ?? '' };
  });

  const updateInstance = (index: number, text: string) => {
    const next = instances.map((item) => (item.index === index ? { ...item, text } : item));
    set({ A1: next });
  };

  const a4Rows = Array.from({ length: A4_ROWS }, (_, index) => values.A4?.[index] ?? emptyA4());

  // Blank rows are kept while typing and dropped when the section is submitted.
  const updateA4 = (index: number, patch: Partial<A4Entry>) => {
    set({
      A4: a4Rows.map((row, position) => (position === index ? { ...row, ...patch } : row)),
    });
  };

  return (
    <div className="space-y-10">
      <FieldShell id="A1" prompt={A1.prompt ?? ''} error={errors.A1}>
        <ol className="space-y-3">
          {instances.map((item) => (
            <li key={item.index} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-3 w-5 shrink-0 text-right text-sm font-bold text-brand-400 tabular-nums"
              >
                {item.index}
              </span>
              <label className="flex-1">
                <span className="sr-only">Instance {item.index}</span>
                <input
                  type="text"
                  value={item.text}
                  onChange={(event) => updateInstance(item.index, event.target.value)}
                  className={textInputClass}
                  autoComplete="off"
                />
              </label>
            </li>
          ))}
        </ol>
      </FieldShell>

      <FieldShell id="A2" prompt={A2.prompt ?? ''} error={errors.A2}>
        <LongAnswer
          id="A2"
          value={values.A2 ?? ''}
          onChange={(value) => set({ A2: value })}
          invalid={Boolean(errors.A2)}
        />
      </FieldShell>

      <FieldShell id="A3" prompt={A3.prompt ?? ''} error={errors.A3}>
        <LongAnswer
          id="A3"
          value={values.A3 ?? ''}
          onChange={(value) => set({ A3: value })}
          invalid={Boolean(errors.A3)}
        />
      </FieldShell>

      <FieldShell
        id="A4"
        prompt={A4.prompt ?? ''}
        error={errors.A4}
        warning={warnings.A4}
        optional
        hint="This one is not part of the analysis. It is how we find you things to actually turn up to."
      >
        <div className="space-y-4">
          {a4Rows.map((row, index) => (
            <div
              key={index}
              className="rounded-xl border border-cream-300 bg-cream-100/60 p-4 sm:p-5"
            >
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                  Activity {index + 1}
                </span>
                <input
                  type="text"
                  value={row.activity}
                  onChange={(event) => updateA4(index, { activity: event.target.value })}
                  className={`${textInputClass} mt-1.5`}
                  placeholder="pickup basketball at Mackal"
                  autoComplete="off"
                />
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(A4.item_fields ?? [])
                  .filter((itemField) => itemField.type === 'single_select')
                  .map((itemField) => (
                    <label key={itemField.id} className="block">
                      <span className="text-xs font-semibold capitalize text-brand-600">
                        {itemField.id}
                      </span>
                      <select
                        value={(row as unknown as Record<string, string>)[itemField.id] ?? ''}
                        onChange={(event) =>
                          updateA4(index, { [itemField.id]: event.target.value } as Partial<A4Entry>)
                        }
                        className={`${selectClass} mt-1.5`}
                      >
                        <option value="">—</option>
                        {(itemField.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </FieldShell>

      {/* The only route by which a name leaves this form. Unchecked by default,
          always, and placed after A4 so "what I wrote above" means something. */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={values.A4_consent ?? false}
            onChange={(event) => set({ A4_consent: event.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-brand-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="font-semibold text-brand-900">{A4_CONSENT.prompt}</span>
            <span className="mt-2 block text-sm text-brand-700">
              This is the only part of the form that travels with your name. Leave it blank and
              nothing from this question leaves the form attached to you.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
