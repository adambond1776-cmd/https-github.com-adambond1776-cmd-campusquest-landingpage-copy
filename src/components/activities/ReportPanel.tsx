'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Flag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { reportListing } from '@/app/activities/actions';
import { type ReportKind } from '@/lib/activities/reports';

type Option = { id: string; name: string };

const KINDS: { value: ReportKind; label: string; hint: string }[] = [
  {
    value: 'defunct',
    label: 'No longer active',
    hint: 'A listed club or facility that is no longer operating.',
  },
  {
    value: 'details_wrong',
    label: 'A detail is wrong',
    hint: 'It exists, but the time, place, or description is off.',
  },
  {
    value: 'still_active',
    label: 'Still active',
    hint: 'Share a current public source that confirms this listing is active.',
  },
  {
    value: 'missing',
    label: 'Something is missing',
    hint: 'A real club or activity that is not in the list at all.',
  },
];

export default function ReportPanel({
  campusId,
  options,
}: {
  campusId: string;
  options: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind>(options.length ? 'defunct' : 'missing');
  const [activityId, setActivityId] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const successRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!done) return;
    // A collapsed form can leave the viewport down in the footer. Bring the
    // confirmation into view and announce it to keyboard/screen-reader users.
    successRef.current?.focus({ preventScroll: true });
    successRef.current?.scrollIntoView({ block: 'center' });
  }, [done]);

  const needsListing = kind !== 'missing';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await reportListing({
      campusId,
      activityId: needsListing ? activityId || null : null,
      kind,
      detail,
      suggestedName,
      email,
      notify,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // The legacy server result contains test reward claims. Do not display those
    // as a live offer; Nick owns final recognition and reward implementation.
    setDone(true);
    setDetail('');
    setSuggestedName('');
    setActivityId('');
  }

  if (done) {
    return (
      <section ref={successRef} tabIndex={-1} aria-label="Report submitted" className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
        <div className="flex gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-extrabold text-emerald-900">Got it, thank you.</h2>
            <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
              Your report is in the review queue. We will check it before changing
              the listing or recording it as a verified contribution.
            </p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-4 text-sm font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
            >
              Report something else
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cream-300 bg-white p-6 sm:p-8 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-ink">
            <Flag className="w-5 h-5 text-brand-600" />
            Found something wrong?
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Tell us about a club that no longer meets, a detail that is wrong or
            an activity we are missing. Corrections are free, and you do not need
            a paid membership to submit one.
          </p>
          <p className="mt-3 text-sm text-brand-800">
            We review useful contributions before recording credit.
            Recognition details are still being designed.{' '}
            <Link href="/contribute" className="font-semibold underline underline-offset-2">See other ways to help</Link>.
          </p>
        </div>

        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="btn-primary shrink-0">
            Tell us
          </button>
        ) : null}
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-6 pt-6 border-t border-cream-200 space-y-5">
          <fieldset>
            <legend className="text-sm font-bold text-ink mb-3">What is going on?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {KINDS.map((option) => (
                <label
                  key={option.value}
                  className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    kind === option.value
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-cream-300 hover:border-brand-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={option.value}
                    checked={kind === option.value}
                    onChange={() => setKind(option.value)}
                    className="mt-1 w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{option.label}</span>
                    <span className="block mt-0.5 text-xs text-slate-500 leading-snug">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {needsListing ? (
            <div>
              <label htmlFor="report-activity" className="block text-sm font-bold text-ink mb-2">
                Which one?
              </label>
              <select
                id="report-activity"
                value={activityId}
                onChange={(event) => setActivityId(event.target.value)}
                required
                className="w-full px-3 py-3 rounded-xl border border-cream-300 bg-white text-[15px] text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Pick a listing</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="report-name" className="block text-sm font-bold text-ink mb-2">
                What is it called?
              </label>
              <input
                id="report-name"
                value={suggestedName}
                onChange={(event) => setSuggestedName(event.target.value)}
                required
                placeholder="Rhody Rock Climbing"
                className="w-full px-3 py-3 rounded-xl border border-cream-300 bg-white text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )}

          <div>
            <label htmlFor="report-detail" className="block text-sm font-bold text-ink mb-2">
              What did you see?
            </label>
            <textarea
              id="report-detail"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              required
              rows={3}
              placeholder="No meetings since last spring and the officer email bounces."
              className="w-full px-3 py-3 rounded-xl border border-cream-300 bg-white text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Include a public source we can check. Do not include private student data or passwords.
            </p>
          </div>

          <div>
            <label htmlFor="report-email" className="block text-sm font-bold text-ink mb-2">
              Your email
            </label>
            <input
              id="report-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@uri.edu"
              className="w-full px-3 py-3 rounded-xl border border-cream-300 bg-white text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-cream-400 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 leading-snug">
                Keep my email so the team can contact me about this report.
                Without this, the report stores only a one-way hash of my address.
              </span>
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? 'Sending' : 'Send it'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-slate-500 hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
