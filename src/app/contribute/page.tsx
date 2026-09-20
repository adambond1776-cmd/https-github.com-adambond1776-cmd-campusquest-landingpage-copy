import type { Metadata } from 'next';
import Link from 'next/link';
import LaunchPageShell from '@/components/LaunchPageShell';
import LaunchContact from '@/components/LaunchContact';

export const metadata: Metadata = {
  title: 'Help shape CampusQuest',
  description: 'Make campus information more useful, share thoughtful feedback and document your real contributions.',
};

const opportunities = [
  ['Find a reproducible issue', 'Tell us the page, the steps you took, what you expected and what happened. Include your device and browser, but no passwords or private account information.'],
  ['Improve a listing', 'Flag an outdated meeting, incorrect location or missing public activity. Include a public source the team can check.'],
  ['Validate a fix', 'When the team asks, repeat the original steps and explain whether the issue is resolved. Useful follow-through matters as much as finding the problem.'],
  ['Make the experience more accessible', 'Describe where reading, keyboard navigation or completing a task becomes difficult. Explain what would make the experience easier.'],
  ['Help a club get started', 'Introduce an authorized club representative and help them prepare accurate public information. Do not claim ownership or publish on a club’s behalf without permission.'],
  ['Suggest a useful improvement', 'Start with the student problem, show an example and explain what a better outcome would look like. Thoughtful feedback beats a large number of duplicate reports.'],
];

export default function ContributePage() {
  return (
    <LaunchPageShell eyebrow="Build with us" title="Help make campus life easier to find."
      intro="CampusQuest is an early release. You may encounter incomplete features or incorrect listings. Help us find what matters, improve it and learn from the people using it.">
      <section aria-labelledby="opportunities">
        <h2 id="opportunities" className="text-2xl font-extrabold text-ink">Six ways to make a useful contribution</h2>
        <p className="mt-3 text-sm text-ink/70">You do not need a paid membership to help. Use the site normally; do not disrupt the service, probe security or access anyone else’s account.</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {opportunities.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-cream-300 bg-white p-6">
              <h3 className="font-bold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-2xl bg-brand-950 p-6 sm:p-8 text-white">
        <h2 className="text-2xl font-extrabold">Real contributions. Honest credit.</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          Keep a record of the work you did, when you did it and any outcome the team
          confirms. That is the foundation for a truthful resume description or portfolio example.
          Payment alone does not establish leadership or earn an achievement credential.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          A contribution-recognition program is being designed. Titles, eligibility,
          certificates, appreciation letters and any rewards are not finalized or
          guaranteed. This is not an accredited qualification, employment offer or ownership interest.
        </p>
      </section>
      <section className="rounded-2xl border border-cream-300 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold text-ink">Make feedback easy to act on</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          For a listing correction, use the directory’s report form. For usability
          feedback, prepare a short description, steps to reproduce and the expected result.
          Redact personal information from screenshots. Report security concerns privately;
          do not post exploit details or continue testing without permission.
        </p>
        <div className="mt-5 flex flex-col items-start gap-4">
          <Link href="/activities#report-listing" className="btn-secondary">Report a listing correction</Link>
          <LaunchContact subject="CampusQuest feedback" label="Draft a feedback email" />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink/60">
          An email link opens your email app; it does not submit a report automatically.
          Please do not send the same issue repeatedly. The team will review submissions;
          response times and acceptance are not guaranteed.
        </p>
      </section>
    </LaunchPageShell>
  );
}
