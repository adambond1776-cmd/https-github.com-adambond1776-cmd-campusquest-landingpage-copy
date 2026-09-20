import type { QuestionnaireResponses } from '@hiddengeniuslabs/genius-mining';

export type SectionProps = {
  values: Partial<QuestionnaireResponses>;
  set: (patch: Partial<QuestionnaireResponses>) => void;
  errors: Record<string, string>;
  warnings: Record<string, string>;
};

export const textInputClass =
  'w-full rounded-xl border border-cream-400 bg-white px-4 py-3 text-brand-900 shadow-sm transition-colors placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500';

export const selectClass =
  'w-full rounded-xl border border-cream-400 bg-white px-3 py-2.5 text-sm text-brand-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
