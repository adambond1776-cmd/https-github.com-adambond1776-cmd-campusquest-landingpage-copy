import type { Metadata } from 'next';
import Link from 'next/link';
import LaunchPageShell from '@/components/LaunchPageShell';
import LaunchContact from '@/components/LaunchContact';

export const metadata: Metadata = {
  title: 'Help shape CampusQuest',
  description: 'Make campus information more useful, share thoughtful feedback and document your real contributions.',
};

const opportunities = [
  ['Report a problem we can repeat', 'Tell us which page you were using, what you did, what you expected and what happened. Include your device and browser, but never a password or private account information.'],
  ['Improve a listing', 'Flag an outdated meeting, incorrect location or missing public activity. Include a public source the team can check.'],
  ['Test a fix', 'When the team asks, repeat the original steps and tell us whether the issue is resolved. Following through matters as much as finding the problem.'],
  ['Make the site easier to use', 'Tell us where reading, keyboard navigation or completing a task becomes difficult, and what would make the experience easier.'],
  ['Help a club get started', 'Introduce an authorized club representative and help them prepare accurate public information. Do not claim ownership or publish on a club’s behalf without permission.'],
  ['Suggest an improvement', 'Start with the student problem, share an example and describe a better outcome. One thoughtful report is more useful than many copies of the same idea.'],
];

export default function ContributePage() {
  return (
    <LaunchPageShell eyebrow="Build with us" title="Help make campus life easier to find."
      intro="CampusQuest is an early release, so some features may be incomplete and some listings may need correction. Help us learn quickly and build a better experience for students and clubs.">
      <section aria-labelledby="opportunities">
        <h2 id="opportunities" className="text-2xl font-extrabold text-ink">Six ways to make a useful contribution</h2>
        <p className="mt-3 text-sm text-ink/70">You do not need a paid membership to contribute. Use the site normally. Do not disrupt the service, probe security or access other people’s accounts.</p>
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
          Keep a record of what you did, when you did it and the outcome the team
          confirms. That can become a truthful resume bullet, portfolio example or
          letter describing your work. Credit will reflect verified contributions,
          not simply whether someone purchased a membership.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          We are designing a contribution-recognition program that may include
          certificates and letters of appreciation. The final titles, requirements
          and rewards are still being developed, not guaranteed. Any recognition
          would describe real, reviewed work; it is not an accredited qualification,
          job offer or ownership interest.
        </p>
      </section>
      <section className="rounded-2xl border border-cream-300 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold text-ink">Make feedback easy to act on</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          Use the directory form for listing corrections. For a site problem, tell us
          what you did, what happened and what you expected instead. Remove personal
          information from screenshots. Report security concerns privately and stop
          testing once you have enough information to explain the concern.
        </p>
        <div className="mt-5 flex flex-col items-start gap-4">
          <Link href="/activities#report-listing" className="btn-secondary">Report a listing correction</Link>
          <LaunchContact subject="CampusQuest feedback" label="Draft a feedback email" />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink/60">
          The email option opens a draft in your email app; it does not send anything
          automatically. Send each issue once. The team will review submissions and
          follow up when more information is needed.
        </p>
      </section>
    </LaunchPageShell>
  );
}
