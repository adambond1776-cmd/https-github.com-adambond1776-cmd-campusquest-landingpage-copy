import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, FileText, Lock } from 'lucide-react';
import { questionnaire } from '@hiddengeniuslabs/genius-mining';
import ConsentScreen from '@/components/gm/ConsentScreen';
import SupportResources from '@/components/gm/SupportResources';
import GmHeader from '@/components/gm/GmHeader';
import AgeLocked from '@/components/gm/AgeLocked';
import { loadCurrentRecord } from '@/lib/gm/load';
import { requireGeniusMiningAccess } from '@/lib/gate';

export const metadata: Metadata = {
  title: 'Genius Mining | CampusQuest',
  description:
    'A questionnaire that works out the role you play rather than the subject you play it in, then points you at real things on your campus.',
};

const facts = [
  {
    icon: Clock,
    label: `About ${questionnaire.rules.estimated_minutes} minutes`,
    detail: `${questionnaire.pages} pages across ${questionnaire.sittings} sittings. You can stop after any section and pick up where you left off, on any device.`,
  },
  {
    icon: Lock,
    label: 'Your name never reaches the analysis',
    detail: 'Your form is tracked by a participant code. The name comes off before anything is analyzed.',
  },
  {
    icon: FileText,
    label: 'Nothing is filed until you sign off',
    detail: 'The profile comes back to you first. You can rewrite any line on it.',
  },
];

export default async function GeniusMiningPage() {
  // Checked before the record is loaded, so an under-18 never starts a session
  // that they would not be allowed to finish.
  const access = await requireGeniusMiningAccess();
  if (!access.allowed) return <AgeLocked reason={access.reason} />;

  const record = await loadCurrentRecord();

  if (record?.consent) {
    redirect('/genius-mining/questionnaire');
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <GmHeader />

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8">
        <p className="eyebrow">Genius Mining</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-950 text-balance sm:text-4xl">
          Find the thing you actually do.
        </h1>
        <p className="mt-4 text-lg text-brand-700">
          Most questionnaires ask what you are interested in. This one asks what you were doing with
          your hands. It separates the subject you work on from the role you play inside it, because
          the role is the part that follows you around.
        </p>
        <p className="mt-4 text-brand-700">
          At the end you get one word, the evidence from your own answers that produced it, and the
          sentence you wrote to say it better. It is a starting place, not a verdict.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {facts.map((fact) => (
            <li
              key={fact.label}
              className="rounded-xl border border-cream-300 bg-white p-5 shadow-soft"
            >
              <fact.icon className="h-5 w-5 text-brand-600" aria-hidden />
              <p className="mt-3 font-bold text-brand-900">{fact.label}</p>
              <p className="mt-1.5 text-sm text-brand-700">{fact.detail}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <h2 className="sr-only">Consent</h2>
          <ConsentScreen />
        </div>

        <p className="mt-8 text-sm text-brand-600">
          Not ready?{' '}
          <Link href="/welcome" className="font-semibold text-brand-700 underline">
            Go back to your dashboard
          </Link>{' '}
          and come to this when you have twenty quiet minutes.
        </p>

        <div className="mt-12">
          <SupportResources />
        </div>
      </main>
    </div>
  );
}

export const dynamic = 'force-dynamic';
