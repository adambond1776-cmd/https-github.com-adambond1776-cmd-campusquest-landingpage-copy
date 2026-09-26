'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Lock } from 'lucide-react';
import { useBasicSave } from '@/components/basic/BasicSaveProvider';
import type { Activity } from '@/lib/activities/types';
import { savedItemKey, savedKindForActivity } from '@/lib/basic/saved';

const buttonClass =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

export default function SaveControl({ activity }: { activity: Activity }) {
  const kind = savedKindForActivity(activity);
  const save = useBasicSave();
  const [error, setError] = useState<string | null>(null);
  if (!kind) return null;

  const key = savedItemKey(kind, activity.id);
  const signedIn = save?.signedIn ?? false;
  const active = save?.active ?? false;
  const saved = save?.savedKeys.includes(key) ?? false;
  const pending = save?.pendingKey === key;

  if (!signedIn) {
    return (
      <Link href="/login?next=/activities" className={`${buttonClass} border-cream-300 bg-white text-slate-700 hover:border-brand-300`}>
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        Sign in to save
      </Link>
    );
  }

  if (!active && !saved) {
    return (
      <Link
        href="/#pricing"
        className={`${buttonClass} border-cream-300 bg-cream-100 text-slate-700 hover:border-brand-300`}
        aria-label={`Saving ${activity.name} requires Founding Basic. Browsing stays free.`}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Save with Basic
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending || !save}
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${activity.name}` : `Save ${activity.name}`}
        onClick={() => {
          if (!save) return;
          setError(null);
          void save.toggle(kind, activity.id, !saved).then((message) => setError(message));
        }}
        className={`${buttonClass} disabled:opacity-60 ${
          saved
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100'
        }`}
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
