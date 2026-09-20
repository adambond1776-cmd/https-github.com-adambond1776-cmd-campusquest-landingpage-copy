import Link from 'next/link';
import { UserPlus, Sliders, Compass, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Create your profile',
    body: 'Sign up in 30 seconds with your school email. Tell us your interests — sports, music, volunteering, gaming, anything.',
  },
  {
    icon: Sliders,
    step: '02',
    title: 'Set your preferences',
    body: 'Pick your categories and how often you want updates. You\'re in full control of what shows up in your feed.',
  },
  {
    icon: Compass,
    step: '03',
    title: 'Get your weekly quest',
    body: 'Every week, we deliver a personalized feed of events, clubs, and activities that match your interests. Just show up.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-cream-50">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow">How It Works</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink text-balance">
            Three steps to never missing out
          </h2>
          <p className="mt-5 text-lg text-ink/60 leading-relaxed">
            Set it up once. Get value every week.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200" />

          {steps.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-lift border border-cream-200">
                <s.icon className="w-10 h-10 text-brand-600" strokeWidth={1.75} />
                <span className="absolute -top-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-ink">{s.title}</h3>
              <p className="mt-3 text-sm text-ink/60 leading-relaxed max-w-xs mx-auto">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link href="/signup" className="btn-primary">
            Start your quest
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
