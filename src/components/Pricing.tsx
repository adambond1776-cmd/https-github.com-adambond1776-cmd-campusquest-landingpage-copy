import Link from 'next/link';
import { Check, Sparkles, User, Star, Building2, ArrowRight, Lock } from 'lucide-react';
import {
  CHECKOUT_LIVE,
  INSTITUTIONAL_SEAT_PRICE,
  INTRO_NOTICE_COPY,
  PLANS,
  PRICE_LOCK_COPY,
  STUDENT_PLANS,
  formatPrice,
  isDiscounted,
  type PlanId,
} from '@/lib/pricing';

const icons: Record<PlanId, typeof Sparkles> = {
  free: User,
  basic: Sparkles,
  premium: Star,
  club: Building2,
};

export default function Pricing() {
  const club = PLANS.club;

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink text-balance">
            Start free. Upgrade when you want more.
          </h2>
          <p className="mt-5 text-lg text-ink/60 leading-relaxed">
            Browse for free. Basic and Plus are planned paid options for profiles,
            activity planning and connecting with friends. Genius Mining is a later,
            deeper discovery experience, currently in development.
          </p>
        </div>

        {/* Student tiers */}
        <div className="mt-14 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {STUDENT_PLANS.map((plan) => {
            const Icon = icons[plan.id];
            const highlight = plan.id === 'premium';
            const discounted = isDiscounted(plan);

            return (
              <div
                key={plan.id}
                className={`relative p-7 rounded-2xl transition-all duration-200 hover:-translate-y-1 ${
                  highlight
                    ? 'bg-brand-950 text-white border border-brand-800 shadow-lift'
                    : 'bg-cream-50 border border-cream-200 shadow-soft'
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold-500 text-brand-950 text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Plan & share
                  </div>
                )}

                <div
                  className={`flex items-center justify-center w-11 h-11 rounded-xl mb-5 ${
                    highlight ? 'bg-gold-500 text-brand-950' : 'bg-brand-600 text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className={`text-lg font-bold ${highlight ? 'text-white' : 'text-ink'}`}>
                  {plan.name}
                </h3>

                <div className="mt-2 mb-1 flex items-baseline gap-2 flex-wrap">
                  <span
                    className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-ink'}`}
                  >
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className={`text-sm ${highlight ? 'text-white/50' : 'text-ink/50'}`}>
                      /month
                    </span>
                  )}
                  {discounted && (
                    <span
                      className={`text-sm line-through ${
                        highlight ? 'text-white/35' : 'text-ink/35'
                      }`}
                    >
                      {formatPrice(plan.standardPrice)}
                    </span>
                  )}
                </div>

                {discounted && (
                  <p
                    className={`mb-3 inline-flex items-center gap-1.5 text-xs font-semibold ${
                      highlight ? 'text-gold-400' : 'text-brand-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Price locked while you stay subscribed
                  </p>
                )}

                <p className={`text-sm mb-5 ${highlight ? 'text-white/60' : 'text-ink/60'}`}>
                  {plan.tagline}
                </p>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          highlight ? 'text-gold-400' : 'text-brand-600'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          feature.endsWith(':')
                            ? 'font-bold ' + (highlight ? 'text-white' : 'text-ink')
                            : highlight
                              ? 'text-white/70'
                              : 'text-ink/70'
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.price === 0 || CHECKOUT_LIVE ? (
                  <Link href="/signup" className={`w-full ${highlight ? 'btn-gold' : 'btn-primary'}`}>
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span
                    className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold ${
                      highlight
                        ? 'border-white/20 text-white/80'
                        : 'border-cream-300 text-ink/60'
                    }`}
                  >
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 max-w-4xl mx-auto rounded-2xl border border-cream-200 bg-cream-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="text-sm font-bold text-ink">{PRICE_LOCK_COPY}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{INTRO_NOTICE_COPY}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-ink/55">
                We are exploring institutional access through Level Up Rhode Island.
                Availability and any school-funded access will depend on future agreements.{' '}
                <Link
                  href="/institutions"
                  className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  Ask your school to cover it
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Club tier — full width */}
        <div className="mt-6 max-w-4xl mx-auto">
          <div className="relative p-8 lg:p-10 rounded-2xl bg-brand-950 text-white border border-brand-800 shadow-lift overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[300px] rounded-full bg-gold-500/10 blur-[100px]" />

            <div className="relative grid lg:grid-cols-2 gap-8 items-start">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold-500 text-brand-950">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{club.name}</h3>
                    <p className="text-xs text-white/50 font-medium">
                      For campus clubs
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-5xl font-extrabold text-white">
                    {formatPrice(club.price)}
                  </span>
                  <span className="text-sm text-white/50 ml-2">/month</span>
                </div>

                <p className="text-sm text-white/60 mb-6 max-w-md">{club.tagline}</p>

                {CHECKOUT_LIVE ? (
                  <Link href="/signup" className="btn-gold">
                    {club.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80">
                    Coming soon
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {club.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-white/70">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-ink/40">
          Schools can cover Genius Mining for their students at{' '}
          {formatPrice(INSTITUTIONAL_SEAT_PRICE)} a student.{' '}
          <Link href="/institutions" className="font-semibold text-brand-700 hover:text-brand-800">
            Level Up Rhode Island
          </Link>{' '}
          is selecting three founding partner institutions.
        </p>
      </div>
    </section>
  );
}
