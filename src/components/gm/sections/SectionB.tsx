'use client';

import { A1_COUNT, VERB_VOCABULARY, getSection } from '@hiddengeniuslabs/genius-mining';
import type { Verb } from '@hiddengeniuslabs/genius-mining';
import FieldShell from '@/components/gm/FieldShell';
import type { SectionProps } from './types';

const SECTION = getSection('B');
const FIELD = SECTION.fields[0];

export default function SectionB({ values, set, errors }: SectionProps) {
  const instances = Array.from({ length: A1_COUNT }, (_, index) => {
    const instance = index + 1;
    return {
      instance,
      text: values.A1?.find((item) => item.index === instance)?.text ?? '',
      verb: values.B?.find((tag) => tag.instance === instance)?.verb,
    };
  });

  const tag = (instance: number, verb: Verb) => {
    const others = (values.B ?? []).filter((existing) => existing.instance !== instance);
    set({ B: [...others, { instance, verb }].sort((a, b) => a.instance - b.instance) });
  };

  return (
    <div className="space-y-8">
      <p className="rounded-xl bg-brand-50 p-4 text-sm font-semibold text-brand-800">
        {SECTION.instruction_on_form}
      </p>

      <FieldShell id="B" prompt={SECTION.prompt ?? FIELD.prompt ?? ''} error={errors.B}>
        <div className="space-y-6">
          {instances.map((instance) => (
            <div
              key={instance.instance}
              className="rounded-xl border border-cream-300 bg-white p-4 shadow-soft sm:p-5"
            >
              <p className="flex gap-2 text-brand-900">
                <span aria-hidden className="font-bold text-brand-400 tabular-nums">
                  {instance.instance}
                </span>
                <span className="font-semibold">
                  {instance.text || (
                    <span className="italic text-brand-400">
                      You left this one blank in A1.
                    </span>
                  )}
                </span>
              </p>

              <div
                role="radiogroup"
                aria-label={`Verb for instance ${instance.instance}`}
                className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {VERB_VOCABULARY.map((entry) => {
                  const selected = instance.verb === entry.verb;
                  return (
                    <button
                      key={entry.verb}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => tag(instance.instance, entry.verb)}
                      title={entry.means}
                      className={`rounded-lg border px-2.5 py-2 text-left text-xs font-bold uppercase tracking-wide transition-colors ${
                        selected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-cream-400 bg-white text-brand-700 hover:border-brand-300 hover:bg-cream-100'
                      }`}
                    >
                      {entry.verb}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </FieldShell>

      <details className="rounded-xl border border-cream-300 bg-cream-100/60 p-5">
        <summary className="cursor-pointer font-semibold text-brand-800">
          What each verb means
        </summary>
        <dl className="mt-4 space-y-2.5 text-sm">
          {VERB_VOCABULARY.map((entry) => (
            <div key={entry.verb} className="sm:flex sm:gap-3">
              <dt className="font-bold text-brand-900 sm:w-28 sm:shrink-0">{entry.verb}</dt>
              <dd className="text-brand-700">{entry.means}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
