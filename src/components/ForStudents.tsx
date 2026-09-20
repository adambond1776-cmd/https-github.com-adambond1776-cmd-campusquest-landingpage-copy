import Link from 'next/link';
import {
  Search,
  Bookmark,
  Filter,
  Compass,
  FileText,
  PencilLine,
  ArrowRight,
} from 'lucide-react';
import { PLANS, formatPrice, type PlanId } from '@/lib/pricing';

const features: {
  icon: typeof Search;
  title: string;
  body: string;
  tier: PlanId;
}[] = [
  {
    icon: Search,
    title: 'Browse everything on campus',
    body: 'See all the clubs, events, and activities happening around you. No account needed to start exploring.',
    tier: 'free',
  },
  {
    icon: Bookmark,
    title: 'Save events for later',
    body: "Bookmark events you're interested in and come back to them. Never lose track of that thing you wanted to go to.",
    tier: 'basic',
  },
  {
    icon: Filter,
    title: 'Filter by what you love',
    body: 'Music, sports, volunteering, gaming, academics, and more. Zero noise — only the things that fit you.',
    tier: 'basic',
  },
  {
    icon: Compass,
    title: 'Genius Mining, the full session',
    body: 'About forty minutes of real questions about three things you handled well. It comes back with the pattern underneath them — the one you have been running without noticing.',
    tier: 'premium',
  },
  {
    icon: FileText,
    title: 'A page you can hand to an advisor',
    body: 'Your working word, the evidence for it, and where the read is thin. Printed on one page, in language an advisor can actually use in a meeting.',
    tier: 'premium',
  },
  {
    icon: PencilLine,
    title: 'Refine it all year',
    body: 'The profile is yours to edit. Change a line that does not sound like you, add what the questions missed, and print it again before advising week.',
    tier: 'premium',
  },
];

const tierStyles: Record<PlanId, string> = {
  free: 'bg-cream-200 text-ink/60',
  basic: 'bg-brand-100 text-brand-700',
  premium: 'bg-gold-500/20 text-gold-600',
  club: 'bg-brand-100 text-brand-700',
};

function tierLabel(tier: PlanId): string {
  const plan = PLANS[tier];
  return plan.price === 0 ? 'Free' : `${formatPrice(plan.price)}/mo`;
}

export default function ForStudents() {
  return (
    <section id="students" className="py-20 lg:py-28 bg-white">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="eyebrow">For Students</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink text-balance">
            Stop scrolling. Start showing up.
          </h2>
          <p className="mt-5 text-lg text-ink/60 leading-relaxed">
            Browse for free. Keep a profile for the price of a coffee. Premium
            adds Genius Mining — a guided session that names how you actually
            think, so the rest of your decisions stop being guesses.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-cream-50 border border-cream-200 transition-all duration-200 hover:bg-white hover:shadow-lift hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand-600 text-white transition-transform group-hover:scale-110">
                  <f.icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${tierStyles[f.tier]}`}
                >
                  {tierLabel(f.tier)}
                </span>
              </div>
              <h3 className="mt-5 text-base font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ink/60 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link href="/signup" className="btn-primary">
            Start browsing free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-sm text-ink/50">Upgrade anytime. Cancel anytime.</span>
        </div>
      </div>
    </section>
  );
}
