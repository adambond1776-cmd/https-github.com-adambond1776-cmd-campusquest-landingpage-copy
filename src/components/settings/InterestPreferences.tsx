'use client';

import { useRef, useState } from 'react';
import InterestPicker from '@/components/InterestPicker';
import { normalizeInterestProfile, type InterestProfile, type InterestSaveResult } from '@/lib/interests';
import GeniusMiningTeaser from '@/components/GeniusMiningTeaser';

export default function InterestPreferences({
  initialInterests, initialProfile, saveAction,
}: {
  initialInterests: string[];
  initialProfile?: InterestProfile;
  saveAction: (profile: InterestProfile) => Promise<InterestSaveResult>;
}) {
  const [saved, setSaved] = useState(() => normalizeInterestProfile(initialProfile, initialInterests));
  const [selected, setSelected] = useState<InterestProfile>(saved);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const submitting = useRef(false);
  const dirty = JSON.stringify(normalizeInterestProfile(selected)) !== JSON.stringify(saved);

  async function save() {
    if (submitting.current || !dirty) return;
    submitting.current = true;
    setPending(true);
    setNotice(null);
    try {
      const result = await saveAction(selected);
      if (!result.ok) {
        setNotice({ error: true, text: result.message });
        return;
      }
      setSaved(result.profile);
      setSelected(result.profile);
      setNotice({ error: false, text: result.interests.length
        ? 'Interests saved. Your recommendations will use these choices.'
        : 'Interests cleared. You can still browse all campus listings.' });
    } catch {
      setNotice({ error: true, text: 'Your changes were not saved. Please try again.' });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="interests-heading" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <h2 id="interests-heading" className="text-lg font-extrabold">Your interests</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/75">
        Pick a few interests to start; three to six is a suggestion, not a requirement.
        Fine-tune priorities if you want. Clear all choices to turn off personalized recommendations.
      </p>
      <div className="mt-5">
        <InterestPicker profile={selected} disabled={pending} onChange={(profile) => {
          setSelected(profile);
          setNotice(null);
        }} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" disabled={pending || !dirty} onClick={save}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? 'Saving…' : 'Save interests'}
        </button>
        <span className="text-sm text-white/75">{selected.selections.length} selected{dirty ? ' · Unsaved changes' : ''}</span>
        {selected.selections.length > 0 && <button type="button" disabled={pending}
          onClick={() => { setSelected({ version: 1, selections: [] }); setNotice(null); }}
          className="min-h-11 text-sm text-white/80 underline underline-offset-4">Clear choices</button>}
      </div>
      {notice && <p role={notice.error ? 'alert' : 'status'}
        className={`mt-4 text-sm ${notice.error ? 'text-red-200' : 'text-white'}`}>{notice.text}</p>}
      <GeniusMiningTeaser />
    </section>
  );
}
