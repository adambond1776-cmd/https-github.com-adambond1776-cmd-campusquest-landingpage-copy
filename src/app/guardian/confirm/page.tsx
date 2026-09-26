import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckCircle2, Clock, ShieldQuestion, XCircle } from 'lucide-react';
import { inspectGuardianConsent, type GuardianPreview } from '@/lib/guardian-consent';
import { legalEntity, privacyEmail } from '@/lib/legal';
import { approveGuardianConsent } from './actions';

export const metadata: Metadata = {
  title: 'Approve a CampusQuest account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Shown = GuardianPreview['state'] | 'approved';

function shownState(
  done: string | undefined,
  preview: GuardianPreview | null
): Shown {
  if (done === 'approved' || done === 'already' || done === 'expired' || done === 'unknown') {
    return done;
  }
  return preview?.state ?? 'unknown';
}

export default async function GuardianConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const done = Array.isArray(params.done) ? params.done[0] : params.done;
  const preview = done ? null : await inspectGuardianConsent(raw);
  const outcome = shownState(done, preview);
  const operator = legalEntity() ?? 'CampusQuest';

  return (
    <main className="min-h-screen bg-brand-950 px-5 py-16 text-white sm:py-24">
      <div className="mx-auto w-full max-w-xl">
        {outcome === 'approved' && (
          <Panel
            tone="good"
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
            title="Thank you — their account is open."
          >
            <p>We have told the student that they can start using CampusQuest.</p>
            <p>
              Their account can browse campus clubs, events and home games, and flag
              listings that look out of date. It cannot be charged for anything, and it
              cannot reach Genius Mining, our strengths questionnaire, which stays 18 and
              over.
            </p>
            <p>
              If you change your mind, email{' '}
              <a className="text-gold-400 hover:text-gold-500" href={`mailto:${privacyEmail()}`}>
                {privacyEmail()}
              </a>{' '}
              and we will close the account and delete what we hold.
            </p>
          </Panel>
        )}

        {outcome === 'already' && (
          <Panel
            tone="good"
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
            title="This one is already approved."
          >
            <p>You have approved this account already, so there is nothing more to do.</p>
          </Panel>
        )}

        {outcome === 'pending' && (
          <Panel
            tone="warn"
            icon={<ShieldQuestion className="h-6 w-6 text-gold-300" />}
            title="Approve this CampusQuest account?"
          >
            <p>
              A student named you as their parent or guardian. Opening this page does not
              approve the account. Press the button if you want their account to open.
            </p>
            <p>
              The account can browse campus clubs, events and home games. It cannot be
              charged, and it cannot reach Genius Mining.
            </p>
            <form action={approveGuardianConsent} className="pt-2">
              <input type="hidden" name="token" value={raw ?? ''} />
              <button type="submit" className="btn-gold">
                Approve this account
              </button>
            </form>
          </Panel>
        )}

        {outcome === 'expired' && (
          <Panel
            tone="warn"
            icon={<Clock className="h-6 w-6 text-gold-300" />}
            title="This link has expired."
          >
            <p>
              Approval links last two weeks. Ask your student to sign in and request a new
              one, and we will email you again.
            </p>
            <p>Nothing was opened. Their account is still waiting on a new approval.</p>
          </Panel>
        )}

        {outcome === 'unknown' && (
          <Panel
            tone="bad"
            icon={<XCircle className="h-6 w-6 text-red-300" />}
            title="We could not find that request."
          >
            <p>
              The link may have been copied incompletely, or the request may have already
              been withdrawn. Email addresses and half-links are easy to break across two
              lines, so it is worth trying again from the original email.
            </p>
            <p>
              Still stuck? Email{' '}
              <a className="text-gold-400 hover:text-gold-500" href={`mailto:${privacyEmail()}`}>
                {privacyEmail()}
              </a>{' '}
              and a person will sort it out.
            </p>
          </Panel>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-white/50">
          <p className="flex items-center gap-2 font-semibold text-white/70">
            <ShieldQuestion className="h-4 w-4" />
            Not sure what this is?
          </p>
          <p className="mt-2">
            CampusQuest is a directory of clubs, events and athletics at Rhode Island
            universities, run by {operator}. Someone gave your address as their parent or
            guardian when signing up. If that was not expected, close this page. Nothing
            opens unless you press Approve.
          </p>
          <p className="mt-3">
            <Link href="/privacy" className="text-gold-400 hover:text-gold-500">
              Privacy policy
            </Link>
            <span className="px-2 text-white/25">·</span>
            <Link href="/terms" className="text-gold-400 hover:text-gold-500">
              Terms of use
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Panel({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'good' | 'warn' | 'bad';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const border =
    tone === 'good'
      ? 'border-emerald-500/25 bg-emerald-500/10'
      : tone === 'warn'
        ? 'border-gold-500/25 bg-gold-500/10'
        : 'border-red-500/25 bg-red-500/10';

  return (
    <div className={`rounded-2xl border p-6 sm:p-8 ${border}`}>
      <div className="flex items-start gap-3">
        {icon}
        <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">{title}</h1>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}
