'use client';

import { useState } from 'react';

export default function ClaimDecisionForm({
  claimId,
  action,
}: {
  claimId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <form action={action} className="rounded-2xl border border-cream-300 bg-cream-50 p-4">
      <input type="hidden" name="claim" value={claimId} />
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">Decision</p>
      {rejecting ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-ink" htmlFor={`note-${claimId}`}>
            Reason
          </label>
          <textarea
            id={`note-${claimId}`}
            name="note"
            maxLength={1000}
            className="min-h-24 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-ink"
            placeholder="Optional note for the claimant"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              name="decision"
              value="rejected"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:w-auto"
            >
              Reject claim
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-cream-300 bg-white px-4 text-sm font-bold text-ink hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            name="decision"
            value="approved"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:w-auto"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-800 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:w-auto"
          >
            Reject
          </button>
        </div>
      )}
    </form>
  );
}
