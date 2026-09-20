import { SUPPORT_RESOURCES } from '@hiddengeniuslabs/genius-mining';
import { LifeBuoy } from 'lucide-react';

/**
 * Never collapsed, never behind a toggle, never optional.
 *
 * E3 asks students to write down things they have never said out loud, and some
 * of them will. This block is the reason that question is safe to ask.
 */
export default function SupportResources() {
  return (
    <aside
      aria-labelledby="support-resources-heading"
      className="rounded-2xl border border-brand-200 bg-brand-50 p-6 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
        <div>
          <h2 id="support-resources-heading" className="text-base font-bold text-brand-900">
            {SUPPORT_RESOURCES.intro}
          </h2>

          <ul className="mt-4 space-y-3">
            {SUPPORT_RESOURCES.entries.map((entry) => (
              <li
                key={entry.name}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span className="font-semibold text-brand-900">{entry.name}</span>
                <span className="text-sm text-brand-700 tabular-nums">{entry.contact}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
