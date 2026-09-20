import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckCircle2, Clock, ShieldQuestion, XCircle } from 'lucide-react';
import { ageStore } from '@/lib/age-store';
import { consentTokenExpired, hashConsentToken } from '@/lib/age';
import { sendGuardianApproved } from '@/lib/alerts';
import { legalEntity, privacyEmail } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Approve a CampusQuest account',
  // A consent link in an inbox is not something to index or preview.
  robots: { index: false, follow: false },
};

// The token is checked against the database on every load, so nothing here can
// be served from a cache.
export const dynamic = 'force-dynamic';

type Outcome =
  | { state: 'approved'; student: string }
  | { state: 'already' }
  | { state: 'expired' }
  | { state: 'unknown' };

/**
 * Where a guardian lands when they follow the link in their email.
 *
 * Approving happens on load rather than behind a second button. The guardian
 * has already made the decision — the email said what following the link means
 * — and adding a confirm step mostly produces people who followed the link,
 * saw a button, assumed they were done, and closed the tab. The link is single
 * use and unguessable, so nothing else can trigger it.
 */
async function resolveToken(token: string | undefined): Promise<Outcome> {
  if (!token) return { state: 'unknown' };

  const store = ageStore();
  const found = await store.findByTokenHash(hashConsentToken(token));
  const consent = found?.record.guardian;
  if (!found || !consent) return { state: 'unknown' };

  // Checked before the address, because after consent the address is gone by
  // design and a second tap on the link should still get a sensible answer.
  if (consent.consented_at) return { state: 'already' };
  if (consentTokenExpired(consent)) return { state: 'expired' };

  const { email } = found;
  if (!email) return { state: 'unknown' };

  await store.recordConsent(email, new Date().toISOString());
  await sendGuardianApproved(email);

  return { state: 'approved', student: email };
}

/** Shows enough of an address to be recognised without printing it in full. */
function mask(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const head = name.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

export default async function GuardianConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const outcome = await resolveToken(raw);
  const operator = legalEntity() ?? 'CampusQuest';

  return (
    <main className="min-h-screen bg-brand-950 px-5 py-16 text-white sm:py-24">
      <div className="mx-auto w-full max-w-xl">
        {outcome.state === 'approved' && (
          <Panel
            tone="good"
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
            title="Thank you — their account is open."
          >
            <p>
              We have told {mask(outcome.student)} that they can start using CampusQuest.
            </p>
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

        {outcome.state === 'already' && (
          <Panel
            tone="good"
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
            title="This one is already approved."
          >
            <p>
              You have approved this account already, so there is nothing more to do. Your
              student can sign in and use the directory.
            </p>
          </Panel>
        )}

        {outcome.state === 'expired' && (
          <Panel
            tone="warn"
            icon={<Clock className="h-6 w-6 text-gold-300" />}
            title="This link has expired."
          >
            <p>
              Approval links last two weeks. Ask your student to sign in and request a new
              one, and we will email you again.
            </p>
            <p>
              Nothing was opened in the meantime — their account has been waiting on this.
            </p>
          </Panel>
        )}

        {outcome.state === 'unknown' && (
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
            guardian when signing up. If that was not expected, ignore this page — nothing
            opens without the link — or write to us and we will delete the record.
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
