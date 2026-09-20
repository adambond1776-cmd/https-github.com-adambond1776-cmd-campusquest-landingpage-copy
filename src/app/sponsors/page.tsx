import type { Metadata } from 'next';
import Link from 'next/link';
import LaunchPageShell from '@/components/LaunchPageShell';
import LaunchContact from '@/components/LaunchContact';
import { FOUNDING_OFFERS, SPONSOR_POLICY } from '@/lib/launch-offers';

export const metadata: Metadata = {
  title: 'Founding sponsor program | CampusQuest',
  description: 'A proposed, bounded campus discovery program with defined access, onboarding and aggregate reporting.',
};

export default function SponsorsPage() {
  const { sponsor, student, club } = FOUNDING_OFFERS;
  return (
    <LaunchPageShell eyebrow="Founding sponsor program" title="Support a program, not a promise of reach."
      intro="Help students discover campus activities and help clubs keep their information useful. This is a proposed CampusQuest program, subject to launch readiness and a written agreement, not a university sponsorship.">
      <section className="rounded-2xl bg-brand-950 p-6 sm:p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-gold-400">Proposed package</p>
        <h2 className="mt-3 text-4xl font-extrabold">${sponsor.amount.toLocaleString('en-US')} <span className="text-lg font-semibold">for {sponsor.days} days</span></h2>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          One defined program. No automatic renewal. No payment is collected on this page;
          dates and obligations must be agreed before funds are accepted.
        </p>
        <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/85">
          <li>{sponsor.studentPasses} sponsored student passes, each lasting {student.days} days. Activation would occur in the first 30 days of the program, so access ends within the program term.</li>
          <li>{sponsor.clubPlaces} club administration places for {club.days} days, starting at program launch, with club authorization and owner verification.</li>
          <li>One student onboarding session and two club onboarding sessions, scheduled with the launch team.</li>
          <li>A limited, clearly labeled homepage banner placement and sponsor acknowledgment. Creative, placement dates and any shared rotation would be agreed in writing.</li>
          <li>An aggregate program report covering available measures such as activated passes, participating clubs, published activities and reported improvements.</li>
        </ul>
      </section>
      <section className="rounded-2xl border border-cream-300 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold text-ink">Clear boundaries from the start</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          This proposal does not guarantee signups, attendance, impressions, leads or sales.
          Reporting depends on verified instrumentation; no audience size or result is
          claimed in advance. No student contact list, profile access, ownership, exclusivity
          or university endorsement is included.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">{SPONSOR_POLICY}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          Future introductions to companies would require the student’s separate choice.
          That feature is not available today. This is a commercial program proposal,
          not a representation that a payment is a tax-deductible donation.
        </p>
      </section>
      <section aria-labelledby="sponsor-next-step">
        <h2 id="sponsor-next-step" className="text-2xl font-extrabold text-ink">Start with a conversation</h2>
        <p className="mt-3 mb-5 text-sm leading-relaxed text-ink/70">
          Agree on scope, recipient eligibility, capacity, launch dates, reporting,
          payment schedule and remedies for undelivered work before signing.
          Sponsorship is separate from any legal-service or educational partnership.
        </p>
        <LaunchContact subject="CampusQuest founding sponsor program" label="Draft a sponsorship inquiry" />
        <p className="mt-5 text-sm"><Link href="/#pricing" className="font-semibold text-brand-700 underline underline-offset-2">Review the student and club offer previews</Link></p>
      </section>
    </LaunchPageShell>
  );
}
