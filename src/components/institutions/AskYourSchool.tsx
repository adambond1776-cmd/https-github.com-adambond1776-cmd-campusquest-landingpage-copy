'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Loader2, Users } from 'lucide-react';
import { askMySchool } from '@/app/institutions/actions';
import { CAMPUSES, DEMAND_THRESHOLD, campusName } from '@/lib/campuses';

type Sent = { campusId: string; count: number; alreadyAsked: boolean };

const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50';

/**
 * The demand button.
 *
 * It counts rather than emails. A student sees their campus total move and gets
 * told what the number has to reach; the aggregate is what we take to an
 * administration. Sending a few hundred near-identical emails to a vice
 * president from a vendor they have never heard of would read as astroturf.
 */
export default function AskYourSchool({ initialCounts }: { initialCounts: Record<string, number> }) {
  const [campusId, setCampusId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  const selectedCount = campusId ? (initialCounts[campusId] ?? 0) : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    const result = await askMySchool({ campusId, schoolName, email, notify });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSent({ campusId, count: result.count, alreadyAsked: result.alreadyAsked });
  };

  if (sent) {
    const remaining = Math.max(0, DEMAND_THRESHOLD - sent.count);

    return (
      <div className="rounded-2xl border border-gold-500/25 bg-gold-500/10 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-brand-950">
            <Check className="h-5 w-5" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {sent.alreadyAsked ? 'We already had you down' : 'Counted'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {sent.count.toLocaleString()}{' '}
              {sent.count === 1 ? 'student has' : 'students have'} asked{' '}
              {campusName(sent.campusId)} to cover Genius Mining.{' '}
              {remaining > 0
                ? `${remaining} more and we take the number to their administration.`
                : 'That is past the number we said we would take to their administration, and we have.'}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              We are not emailing anyone at your school on your behalf. The count
              is the ask, and it carries a lot further than a forwarded form
              letter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(null);
                setEmail('');
              }}
              className="mt-4 text-sm font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
            >
              Ask for a different school
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <h3 className="text-xl font-bold text-white">Ask your school to cover it</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        If your school joins Level Up Rhode Island, Genius Mining is free for
        you. Add your name to the count and we will bring the number to them.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="ask-campus" className="mb-1.5 block text-sm font-medium text-white/80">
            Your school
          </label>
          <select
            id="ask-campus"
            value={campusId}
            onChange={(event) => {
              setCampusId(event.target.value);
              setError(null);
            }}
            disabled={submitting}
            className={inputClass}
          >
            <option value="" className="bg-brand-950">
              Choose your school
            </option>
            {CAMPUSES.map((campus) => (
              <option key={campus.id} value={campus.id} className="bg-brand-950">
                {campus.name}
              {campus.id !== 'other' && !campus.directoryLive ? ' (Coming soon)' : ''}
              </option>
            ))}
          </select>
          {selectedCount !== null && campusId !== 'other' && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/45">
              <Users className="h-3.5 w-3.5" />
              {selectedCount.toLocaleString()} already asked
            </p>
          )}
        </div>

        {campusId === 'other' && (
          <div>
            <label htmlFor="ask-school" className="mb-1.5 block text-sm font-medium text-white/80">
              School name
            </label>
            <input
              id="ask-school"
              type="text"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="Where do you go?"
              disabled={submitting}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label htmlFor="ask-email" className="mb-1.5 block text-sm font-medium text-white/80">
            Your email
          </label>
          <input
            id="ask-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="you@uri.edu"
            autoComplete="email"
            disabled={submitting}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-white/40">
            Used to make sure one student counts once. We store it as a hash
            unless you tick the box below.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-white/10 accent-gold-500"
          />
          Email me if my school signs up. Nothing else, ever.
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !campusId || !email}
          className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Counting you
            </>
          ) : (
            <>
              Add me to the count
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
