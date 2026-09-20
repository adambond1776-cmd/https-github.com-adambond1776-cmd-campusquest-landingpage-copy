'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import FormAlert from '@/components/FormAlert';
import { deleteMyAccount } from '@/app/settings/actions';

const PHRASE = 'delete my account';

/**
 * Self-service account deletion.
 *
 * Two steps rather than one button. The first click only reveals the second,
 * and the second needs a typed phrase — enough friction that nobody deletes
 * four years of saved activities with a mis-tap on a phone, and not so much
 * that someone who means it has to email support and wait.
 *
 * The list of what goes and what stays is shown before the button, not after.
 * Someone deciding whether to delete needs it then.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    const result = await deleteMyAccount(phrase);

    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }

    router.push('/?deleted=1');
  };

  return (
    <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
        <div>
          <h2 className="text-lg font-extrabold">Delete my account</h2>
          <p className="mt-1 text-sm text-white/50">
            Permanent, immediate, and not something we can undo for you afterwards.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm leading-relaxed sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-white/80">What goes</p>
          <ul className="mt-2 space-y-1.5 text-white/50">
            <li>Your sign-in and your email address</li>
            <li>Your Genius Mining answers and profile</li>
            <li>Corrections you sent us about listings</li>
            <li>Any request you made for your school to cover seats</li>
            <li>Your age and guardian record</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-white/80">What stays</p>
          <ul className="mt-2 space-y-1.5 text-white/50">
            <li>
              The anonymized copy of your answers described when you started: the shape of
              what you wrote, none of the words, no name or email, and no way back to you.
            </li>
            <li>
              Listings themselves. Telling us a club had folded does not un-fold the club.
            </li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="mt-5">
          <FormAlert message={error} />
        </div>
      )}

      {!armed ? (
        <button
          onClick={() => setArmed(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/15"
        >
          <Trash2 className="h-4 w-4" />
          Delete my account
        </button>
      ) : (
        <div className="mt-6 space-y-3">
          <label htmlFor="confirm-phrase" className="block text-sm text-white/70">
            Type <span className="font-mono font-semibold text-white">{PHRASE}</span> to
            confirm.
          </label>
          <input
            id="confirm-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            disabled={busy}
            autoComplete="off"
            placeholder={PHRASE}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/20 outline-none transition-colors focus:border-red-400 disabled:opacity-50 sm:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={run}
              disabled={busy || phrase.trim().toLowerCase() !== PHRASE}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500/90 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete permanently
                </>
              )}
            </button>
            <button
              onClick={() => {
                setArmed(false);
                setPhrase('');
                setError(null);
              }}
              disabled={busy}
              className="text-sm font-medium text-white/50 transition-colors hover:text-white disabled:opacity-40"
            >
              Keep my account
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
