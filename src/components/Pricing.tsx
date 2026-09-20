import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import {
  CLUB_DISCOVERY_POLICY,
  FOUNDING_OFFERS,
  FOUNDING_TERMS,
  LAUNCH_AVAILABILITY,
  SPONSOR_POLICY,
} from '@/lib/launch-offers';

export default function Pricing() {
  const { student, club } = FOUNDING_OFFERS;
  const offers = [
    {
      name: 'Free discovery',
      amount: 0,
      period: 'Free to explore',
      description: 'See what is happening and find one thing worth trying. No account required.',
      features: ['Browse available clubs, events and activities', 'Search by category and location', 'Check details with the original source', 'Send a listing correction for free'],
    },
    {
      name: 'Founding Basic',
      amount: student.amount,
      period: `One payment for ${student.days} days`,
      description: 'Planned: return to the searches and activities that caught your interest.',
      features: ['Everything in free discovery', 'Planned: save searches and activities', 'Keep your interests up to date', 'Help us improve the early experience'],
    },
    {
      name: 'Founding Club',
      amount: club.amount,
      period: `One payment for ${club.days} days`,
      description: 'Planned: tools for a verified representative to keep club information current.',
      features: ['Edit club information and meeting details', 'Publish, update and cancel events', 'Keep membership inquiries organized', 'Verified ownership and reviewed content'],
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white scroll-mt-24">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow">Founding offers</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink text-balance">
            Start free. Help shape what comes next.
          </h2>
          <p className="mt-5 text-lg text-ink/60 leading-relaxed">
            Explore campus life for free. When the founding offers open, one payment
            will cover the full period with no automatic renewal.
          </p>
          <p className="mt-4 text-sm font-semibold text-brand-800">{LAUNCH_AVAILABILITY}</p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const highlighted = offer.name === 'Founding Basic';
            return (
              <article key={offer.name} className={`flex flex-col rounded-2xl border p-7 shadow-soft ${highlighted ? 'bg-brand-950 border-brand-800 text-white' : 'bg-cream-50 border-cream-200 text-ink'}`}>
                <h3 className="text-lg font-bold">{offer.name}</h3>
                <p className="mt-5 text-5xl font-extrabold">${offer.amount}</p>
                <p className={`mt-2 text-sm font-semibold ${highlighted ? 'text-gold-400' : 'text-brand-700'}`}>{offer.period}</p>
                <p className={`mt-4 text-sm leading-relaxed ${highlighted ? 'text-white/75' : 'text-ink/70'}`}>{offer.description}</p>
                <ul className="my-6 space-y-3">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? 'text-gold-400' : 'text-brand-600'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {offer.amount === 0 ? (
                    <Link href="/activities" className="btn-primary w-full">Browse free<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                  ) : (
                    <p className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold ${highlighted ? 'border-white/25 text-white/80' : 'border-cream-300 text-ink/65'}`}>
                      Not yet available to purchase
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-cream-200 bg-cream-50 p-6">
          <p className="font-bold text-ink">{FOUNDING_TERMS}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            When the founding period ends, you can stop or choose a new plan.
            The proposed ongoing rates are ${student.optionalMonthly}/month for Basic and{' '}
            ${club.optionalMonthly}/month for club tools. Nothing starts automatically.
            Final purchase and refund terms will appear before checkout opens.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{CLUB_DISCOVERY_POLICY}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{SPONSOR_POLICY}</p>
        </div>

        <div className="mt-8 flex items-start gap-3 text-sm text-ink/65">
          <Sparkles aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <p>
            Plus activity planning and sharing will come later. Genius Mining is also
            in development and is separate from Basic and Plus. It is not part of these offers.
            {' '}<Link href="/contribute" className="font-semibold text-brand-700 underline underline-offset-2">Help improve CampusQuest</Link>
            {' '}or{' '}<Link href="/sponsors" className="font-semibold text-brand-700 underline underline-offset-2">explore the founding sponsor program</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
