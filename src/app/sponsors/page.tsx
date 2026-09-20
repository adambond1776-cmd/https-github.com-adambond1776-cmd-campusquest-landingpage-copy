import type { Metadata } from 'next';
import Link from 'next/link';
import LaunchPageShell from '@/components/LaunchPageShell';
import LaunchContact from '@/components/LaunchContact';
import { FOUNDING_OFFERS, SPONSOR_POLICY } from '@/lib/launch-offers';

export const metadata: Metadata = {
  title: 'Founding sponsor program | CampusQuest',
  description: 'A focused campus discovery program with student access, club support and aggregate reporting.',
};

export default function SponsorsPage() {
  const { sponsor, student, club } = FOUNDING_OFFERS;
  return (
    <LaunchPageShell eyebrow="Founding sponsor program" title="Fund something students and clubs can use."
      intro="Help students discover campus activities while helping clubs keep their information current. This is a proposed CampusQuest program, subject to launch readiness and a written agreement.">
      <section className="rounded-2xl bg-brand-950 p-6 sm:p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-gold-400">Proposed package</p>
        <h2 className="mt-3 text-4xl font-extrabold">${sponsor.amount.toLocaleString('en-US')} <span className="text-lg font-semibold">for {sponsor.days} days</span></h2>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          One clearly defined program with no automatic renewal. This page does not
          accept payment. Dates, responsibilities and deliverables must be agreed first.
        </p>
        <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/85">
          <li>{sponsor.studentPasses} student passes, each lasting {student.days} days. Students would activate them during the first 30 days so every pass ends within the program term.</li>
          <li>{sponsor.clubPlaces} club administration places for {club.days} days, starting at program launch, with club authorization and a verified representative.</li>
          <li>One student onboarding session and two club onboarding sessions, scheduled with the launch team.</li>
          <li>A limited, clearly labeled homepage banner and sponsor acknowledgment. Message, placement dates and any rotation would be agreed in writing.</li>
          <li>A program report using available aggregate measures, such as activated passes, participating clubs, published activities and reported improvements.</li>
        </ul>
      </section>
      <section className="rounded-2xl border border-cream-300 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold text-ink">Clear boundaries from the start</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          Sponsorship supports access and launch work; it does not guarantee signups,
          attendance, impressions, leads or sales. No student contact list, private
          profile access, ownership, exclusivity or university endorsement is included.
          Reports will include only measures we can verify, not assumed results.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">{SPONSOR_POLICY}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          In the future, students may be able to choose whether they want an introduction
          to a company. That feature is not available today. This is a commercial
          sponsorship proposal, not a promise that payment is a tax-deductible donation.
        </p>
      </section>
      <section aria-labelledby="sponsor-next-step">
        <h2 id="sponsor-next-step" className="text-2xl font-extrabold text-ink">Start with a conversation</h2>
        <p className="mt-3 mb-5 text-sm leading-relaxed text-ink/70">
          Before signing, agree on who receives access, launch dates, deliverables,
          reporting, payment schedule and what happens if the program cannot be delivered.
          Sponsorship is separate from any legal-service or educational partnership.
        </p>
        <LaunchContact subject="CampusQuest founding sponsor program" label="Draft a sponsorship inquiry" />
        <p className="mt-5 text-sm"><Link href="/#pricing" className="font-semibold text-brand-700 underline underline-offset-2">Review the student and club offer previews</Link></p>
      </section>
    </LaunchPageShell>
  );
}
