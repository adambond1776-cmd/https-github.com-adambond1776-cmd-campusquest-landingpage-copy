'use client';

import { useState, useTransition } from 'react';
import { setSavedEventReminder } from '@/app/saved/actions';
import { EMAIL_REMINDER_NOTE, type SavedReminder } from '@/lib/basic/saved';

export default function ReminderControl({
  targetId,
  reminder,
  name,
}: {
  targetId: string;
  reminder: SavedReminder;
  name: string;
}) {
  const [current, setCurrent] = useState(reminder);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: SavedReminder) {
    setError(null);
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setSavedEventReminder({ targetId, reminder: next });
      if (!result.ok) {
        setCurrent(previous);
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
      <p className="text-xs font-semibold text-slate-700">Reminder preference for {name}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Reminder preference for ${name}`}>
        <Choice selected={current === 'off'} pending={pending} onClick={() => choose('off')}>
          Off
        </Choice>
        <Choice selected={current === 'email'} pending={pending} onClick={() => choose('email')}>
          Email
        </Choice>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{EMAIL_REMINDER_NOTE}</p>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

function Choice({
  selected,
  pending,
  onClick,
  children,
}: {
  selected: boolean;
  pending: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={pending}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60 ${
        selected
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-cream-300 bg-white text-slate-700 hover:border-brand-300'
      }`}
    >
      {children}
    </button>
  );
}
