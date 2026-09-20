import { AlertCircle, Info } from 'lucide-react';

export type FieldShellProps = {
  id: string;
  prompt: string;
  children: React.ReactNode;
  error?: string;
  warning?: string;
  optional?: boolean;
  hint?: string;
};

export default function FieldShell({
  id,
  prompt,
  children,
  error,
  warning,
  optional,
  hint,
}: FieldShellProps) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-3 w-full">
        <span className="flex items-baseline gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-500 tabular-nums">
            {id}
          </span>
          {optional ? (
            <span className="text-xs font-medium text-brand-400">Optional</span>
          ) : null}
        </span>
        <span className="mt-2 block text-base font-semibold leading-relaxed text-brand-900 sm:text-lg">
          {prompt}
        </span>
      </legend>

      {hint ? <p className="-mt-1 mb-3 text-sm text-brand-600">{hint}</p> : null}

      {children}

      {error ? (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {!error && warning ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-gold-400/15 p-3 text-sm text-brand-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden />
          {warning}
        </p>
      ) : null}
    </fieldset>
  );
}
