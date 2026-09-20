'use client';

import { Check } from 'lucide-react';
import { INTEREST_GROUPS, INTEREST_OPTIONS, PRIORITIES, type InterestProfile, type InterestSelection } from '@/lib/interests';

export default function InterestPicker({
  profile, onChange, disabled = false,
}: {
  profile: InterestProfile;
  onChange: (profile: InterestProfile) => void;
  disabled?: boolean;
}) {
  function update(id: string, patch: Partial<InterestSelection>) {
    onChange({ version: 1, selections: profile.selections.map((item) => item.id === id ? { ...item, ...patch } : item) });
  }
  return (
    <div className="space-y-6">
      {INTEREST_GROUPS.map((group) => (
        <fieldset key={group} disabled={disabled}>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-white/70">{group}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {INTEREST_OPTIONS.filter((option) => option.group === group).map((option) => {
              const selected = profile.selections.some((item) => item.id === option.id);
              return (
                <button key={option.id} type="button" aria-pressed={selected}
                  onClick={() => onChange({ version: 1, selections: selected
                    ? profile.selections.filter((item) => item.id !== option.id)
                    : [...profile.selections, { id: option.id, priority: 2, details: [] }] })}
                  className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    selected ? 'border-brand-400 bg-brand-600' : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}>
                  <span>{option.label}</span>
                  {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {profile.selections.length > 0 && (
        <details className="rounded-xl border border-white/20 bg-white/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-gold-400">
            Fine-tune your choices <span className="font-normal text-white/75">(optional)</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            Everything starts as Interested. Prioritize favorites or mark something you are curious to try.
            Details narrow the matches; availability depends on your campus listings.
          </p>
          <div className="mt-5 space-y-5">
            {profile.selections.map((selection) => {
              const option = INTEREST_OPTIONS.find((option) => option.id === selection.id)!;
              return (
                <fieldset disabled={disabled} key={selection.id} className="border-t border-white/10 pt-4">
                  <legend className="pr-2 text-sm font-bold">{option.label}</legend>
                  <label className="mt-2 block text-xs text-white/75">
                    Priority for {option.label}
                    <select value={selection.priority} onChange={(event) => update(selection.id, { priority: Number(event.target.value) as 1 | 2 | 3 })}
                      className="mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-brand-950 px-3 text-sm text-white">
                      {PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                    </select>
                  </label>
                  {option.details.length > 0 && (
                    <div role="group" aria-label={`Details for ${option.label}`} className="mt-3 flex flex-wrap gap-2">
                      {option.details.map((detail) => (
                        <button key={detail} type="button" aria-pressed={selection.details.includes(detail)}
                          onClick={() => update(selection.id, { details: selection.details.includes(detail)
                            ? selection.details.filter((item) => item !== detail) : [...selection.details, detail] })}
                          className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold ${selection.details.includes(detail)
                            ? 'border-gold-400 bg-gold-400 text-brand-950' : 'border-white/20 text-white hover:bg-white/10'}`}>
                          {detail}
                        </button>
                      ))}
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        </details>
      )}
      <p className="text-xs leading-relaxed text-white/70">
        All choices are optional and editable. These preferences are not shown to other students.
        Leaving an interest unselected does not mean you dislike it.
      </p>
    </div>
  );
}
