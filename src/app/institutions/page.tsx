import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  Compass,
  FileText,
  FlaskConical,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import AskYourSchool from '@/components/institutions/AskYourSchool';
import Footer from '@/components/Footer';
import { CAMPUSES } from '@/lib/campuses';
import { getDemandStore } from '@/lib/gm/demand';
import { INSTITUTIONAL_SEAT_PRICE, formatPrice } from '@/lib/pricing';
import { partnershipEmail } from '@/lib/env';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Level Up Rhode Island — Genius Mining for institutions | CampusQuest',
  description:
    'Three founding partner institutions in Rhode Island. A nine-month pilot of Genius Mining, a self-authored diagnostic that helps students name how they think before they commit to a major.',
  alternates: siteUrl ? { canonical: `${siteUrl}/institutions` } : undefined,
};

// The page reads live demand counts, so it cannot be prerendered at build time.
export const dynamic = 'force-dynamic';

const seatIncludes = [
  {
    icon: Compass,
    title: 'The full instrument',
    body: 'A guided session of roughly forty minutes, taken across as many sittings as the student needs. Version 1.3, sequential, no backtracking, every answer autosaved.',
  },
  {
    icon: FileText,
    title: 'An advisor printout',
    body: 'One page: the working word, the evidence behind it, the confidence rating, and an explicit list of where the read is thin. Written for a fifteen-minute advising appointment.',
  },
  {
    icon: ClipboardCheck,
    title: 'A year of revision',
    body: 'Students edit their own profile for the length of the contract. Advisors see what the student changed and what the instrument said first.',
  },
  {
    icon: ShieldCheck,
    title: 'Deletion on request',
    body: 'Identified answers are deleted within thirty days of a student leaving the programme, or immediately on request. Anonymised copies carry no name, email, or student identifier.',
  },
];

const pilotPhases = [
  {
    label: 'Months 1–2',
    title: 'Consent, cohort, and baseline',
    body: 'IRB submission through your review board with a faculty co-investigator. Recruit the treatment cohort and a matched waitlist comparison group. Collect baseline measures of major confidence and belonging.',
  },
  {
    label: 'Months 3–6',
    title: 'Administration and advising',
    body: 'Students complete the instrument. Advisors receive printouts ahead of scheduled appointments and rate whether the profile was useful in the session. We measure completion rate, time on task, and test-retest stability of the primary result.',
  },
  {
    label: 'Months 7–9',
    title: 'Readout',
    body: 'Post-measures, advisor interviews, and a written report against the endpoints registered at the start. Your institutional research office receives the analysis dataset and the code that produced the numbers.',
  },
];

export default async function InstitutionsPage() {
  const tally = await getDemandStore().tally();
  const initialCounts = Object.fromEntries(tally.map((row) => [row.campus_id, row.count]));
  const totalAsks = tally.reduce((sum, row) => sum + row.count, 0);
  const rhodeIslandCampuses = CAMPUSES.filter((campus) => campus.id !== 'other').length;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 pt-20 pb-20 text-white lg:pt-28 lg:pb-28">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-brand-600/30 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-gold-500/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-content px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Compass className="h-4 w-4" strokeWidth={2.5} />
            </div>
            Campus<span className="-ml-1.5 text-brand-400">Quest</span>
          </Link>

          <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-gold-400">
                Level Up Rhode Island
              </span>
              <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
                Students pick a major before anyone asks them how they think.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Genius Mining is a self-authored diagnostic, not a personality
                test. It asks a student to describe three things they handled
                well, then works back to the pattern underneath them. The output
                is a page an advisor can use in a fifteen-minute appointment.
              </p>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
                We are selecting three founding partner institutions in Rhode
                Island for a nine-month pilot. Applications are open.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={`mailto:${partnershipEmail()}`} className="btn-gold">
                  <Mail className="h-4 w-4" />
                  Talk to us about a pilot
                </a>
                <a href="#ask" className="btn-ghost-light">
                  I&apos;m a student
                </a>
              </div>

              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    Per student
                  </dt>
                  <dd className="mt-1 text-2xl font-extrabold text-white">
                    {formatPrice(INSTITUTIONAL_SEAT_PRICE)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    Pilot length
                  </dt>
                  <dd className="mt-1 text-2xl font-extrabold text-white">9 mo</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    Partner slots
                  </dt>
                  <dd className="mt-1 text-2xl font-extrabold text-white">3</dd>
                </div>
              </dl>
            </div>

            <div id="ask" className="scroll-mt-24">
              <AskYourSchool initialCounts={initialCounts} />
              {totalAsks > 0 && (
                <p className="mt-4 text-center text-sm text-white/40">
                  {totalAsks.toLocaleString()}{' '}
                  {totalAsks === 1 ? 'student has' : 'students have'} asked across{' '}
                  {rhodeIslandCampuses} Rhode Island campuses.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What we will and will not claim */}
      <section className="border-b border-cream-200 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-content px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow">Where we stand</span>
            <h2 className="mt-4 text-balance text-3xl font-extrabold text-ink sm:text-4xl">
              We are not going to tell you this fixes retention.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/60">
              Not yet, and not from a pilot this size. Detecting a few points of
              movement in first-year retention takes cohorts in the thousands.
              Anyone quoting you a retention number off a pilot of a few hundred
              students is quoting you noise.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-cream-200 bg-cream-50 p-7">
              <h3 className="text-base font-bold text-ink">What a nine-month pilot can show</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/65">
                <li>Completion rate, and where in the instrument students stop.</li>
                <li>Test-retest stability of the primary result over a semester.</li>
                <li>
                  Whether advisors rate the printout as useful in an actual
                  appointment, measured per session rather than by survey at the
                  end.
                </li>
                <li>
                  Pre and post movement in student-rated major confidence and
                  sense of belonging.
                </li>
                <li>
                  Whether students who complete it change or declare a major at a
                  different rate than a matched waitlist group.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-cream-200 bg-cream-50 p-7">
              <h3 className="text-base font-bold text-ink">What comes after</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/65">
                <li>
                  Endpoints registered before the first student takes it, so the
                  analysis cannot be rewritten around whatever the data happens to
                  show.
                </li>
                <li>
                  Retention and persistence read out in year two, against the
                  matched comparison group built in year one.
                </li>
                <li>
                  Your institutional research office gets the analysis dataset and
                  the code, not a slide with a number on it.
                </li>
                <li>
                  Findings are yours to publish. We would like to co-author; we do
                  not need to control it.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <p className="text-sm leading-relaxed text-ink/70">
              The pilot runs under your institution&apos;s IRB with a faculty
              co-investigator, not ours. The research arm is 18 and over, consent
              for research is separate from consent to use the product, and either
              can be withdrawn without affecting the other. If your review board
              determines the study exempt, we would still rather run it as if it
              were not.
            </p>
          </div>
        </div>
      </section>

      {/* What the seat buys */}
      <section className="bg-cream-50 py-20 lg:py-28">
        <div className="mx-auto max-w-content px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow">The seat</span>
            <h2 className="mt-4 text-balance text-3xl font-extrabold text-ink sm:text-4xl">
              {formatPrice(INSTITUTIONAL_SEAT_PRICE)} a student, for a year
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/60">
              A covered student gets Genius Mining and their profile for free.
              They do not get a social network on your dime — the seat buys the
              instrument and the advisor printout, and nothing that would put your
              general counsel in a conversation about student moderation.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {seatIncludes.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-cream-200 bg-white p-6 transition-shadow hover:shadow-soft"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <item.icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-base font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-cream-200 bg-white p-6">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-ink/65">
              Students already paying for CampusQuest when their school signs up
              stop being charged. We cancel the subscription, refund the unused
              days, and hold the rate they signed up at in case they ever want the
              social side on their own. Nobody pays twice for the same thing.
            </p>
          </div>
        </div>
      </section>

      {/* Pilot shape */}
      <section className="border-t border-cream-200 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-content px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow">The pilot</span>
            <h2 className="mt-4 text-balance text-3xl font-extrabold text-ink sm:text-4xl">
              Nine months, three phases, one report
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/60">
              Scoped so it can start inside a single department — an athletics
              academic support office, an advising centre, a first-year programme
              — without waiting on campus-wide approval.
            </p>
          </div>

          <ol className="mt-12 space-y-4">
            {pilotPhases.map((phase) => (
              <li
                key={phase.label}
                className="grid gap-4 rounded-2xl border border-cream-200 bg-cream-50 p-6 sm:grid-cols-[140px_1fr] sm:gap-8 sm:p-7"
              >
                <span className="text-sm font-bold uppercase tracking-wide text-brand-700">
                  {phase.label}
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{phase.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-950 py-20 text-white lg:py-24">
        <div className="mx-auto max-w-content px-5 text-center sm:px-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Users className="h-7 w-7" strokeWidth={2} />
          </div>
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold sm:text-4xl">
            Three institutions. One state. Nine months.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
            If you run advising, first-year programming, or academic support and
            you want to see the instrument before you decide anything, we will
            walk you through a real profile end to end.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={`mailto:${partnershipEmail()}`} className="btn-gold">
              <Mail className="h-4 w-4" />
              {partnershipEmail()}
            </a>
            <Link href="/#pricing" className="btn-ghost-light">
              See student pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
