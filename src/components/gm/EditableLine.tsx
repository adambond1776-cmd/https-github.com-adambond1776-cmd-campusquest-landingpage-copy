'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { editProfileField } from '@/app/genius-mining/actions';

/**
 * One line of the profile the student can rewrite.
 *
 * The profile comes back to them and they can change anything on it — that is a
 * promise the consent screen makes, and it is also the only way the sign-off
 * means anything. Edits are recorded with the original text alongside them, so
 * the advisor printout can show that a line was changed.
 */
export default function EditableLine({
  field,
  label,
  value,
  editable,
  className,
}: {
  field: string;
  label: string;
  value: string;
  editable: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await editProfileField(field, draft);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCurrent(draft);
      setEditing(false);
    });
  };

  if (!editing) {
    return (
      <div className="group relative">
        <p className={className}>{current}</p>
        {editable ? (
          <button
            type="button"
            onClick={() => {
              setDraft(current);
              setEditing(true);
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2 transition-colors hover:text-brand-800"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Rewrite this
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          {label}
        </span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          className="mt-1.5 w-full resize-y rounded-xl border border-cream-400 bg-white px-4 py-3 text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary px-5 py-2.5 text-xs disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="btn-secondary px-5 py-2.5 text-xs"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
