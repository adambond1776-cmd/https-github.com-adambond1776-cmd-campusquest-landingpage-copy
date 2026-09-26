'use client';

import { useState } from 'react';
import { useBasicSave } from '@/components/basic/BasicSaveProvider';
import type { SavedKind } from '@/lib/basic/saved';

export default function MissingUnsave({ kind, targetId }: { kind: SavedKind; targetId: string }) {
  const save = useBasicSave();
  const [error, setError] = useState<string | null>(null);
  const pending = save?.pendingKey === `${kind}:${targetId}`;

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={pending || !save}
        onClick={() => {
          if (!save) return;
          setError(null);
          void save.toggle(kind, targetId, false).then((message) => setError(message));
        }}
        className="inline-flex min-h-11 items-center rounded-full border border-cream-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-300 disabled:opacity-60"
      >
        {pending ? 'Removing…' : 'Remove from Saved'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
