'use client';

import { useState } from 'react';
import { CheckCircle2, Flag, Gift, Loader2 } from 'lucide-react';
import { reportListing } from '@/app/activities/actions';
import {
  MAX_FREE_MONTHS_PER_TERM,
  REPORTS_PER_FREE_MONTH,
  type ReportKind,
} from '@/lib/activities/reports';

type Option = { id: string; name: string };

const KINDS: { value: ReportKind; label: string; hint: string }[] = [
  {
    value: 'defunct',
    label: 'This one is dead',
    hint: 'A club or event in the list that has stopped happening.',
  },
  {
    value: 'details_wrong',
    label: 'A detail is wrong',
    hint: 'It exists, but the time, place, or description is off.',
  },
  {
    value: 'still_active',
    label: 'This one is alive',
    hint: 'Confirming something is real is worth as much as reporting something dead.',
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
  const [kind, setKind] = useState<ReportKind>('defunct');
  const [activityId, setActivityId] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; toNext: number } | null>(null);

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

    setDone({ message: result.message, toNext: result.toNextReward });
    setDetail('');
    setSuggestedName('');
    setActivityId('');
  }

  if (done) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
        <div className="flex gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-extrabold text-emerald-900">Got it, thank you.</h2>
            <p className="mt-2 text-sm text-emerald-800 leading-relaxed">{done.message}</p>
            {done.toNext > 0 ? (
              <p className="mt-2 text-sm text-emerald-800">
                {done.toNext} more confirmed {done.toNext === 1 ? 'correction' : 'corrections'} and
                your next month is free.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setDone(null)}
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
            This list comes from the university&rsquo;s own systems, which know which clubs are
            registered but not which ones still meet. You do. Tell us about a club that folded, a
            detail that is off, or something real we are missing entirely.
          </p>
          <p className="mt-3 inline-flex items-start gap-2 text-sm font-medium text-brand-800">
            <Gift className="w-4 h-4 shrink-0 mt-0.5 text-gold-600" />
            <span>
              {REPORTS_PER_FREE_MONTH} corrections we confirm earn you a free month, up to{' '}
              {MAX_FREE_MONTHS_PER_TERM} a term. We credit corrections we can check, not reports we
              cannot.
            </span>
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
              Something we can check. A report we cannot verify does not earn credit.
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
                Email me when this is resolved. Without this we keep only a one-way hash of your
                address, which means we cannot credit your account either.
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
