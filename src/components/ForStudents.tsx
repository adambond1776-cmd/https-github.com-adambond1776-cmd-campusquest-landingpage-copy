import Link from 'next/link';
import {
  Search,
  Bookmark,
  Filter,
  Calendar,
  Share2,
  User,
  ArrowRight,
} from 'lucide-react';
import { type PlanId } from '@/lib/pricing';
import { FOUNDING_OFFERS } from '@/lib/launch-offers';
import GeniusMiningTeaser from '@/components/GeniusMiningTeaser';

const features: {
  icon: typeof Search;
  title: string;
  body: string;
  tier: PlanId;
}[] = [
  {
    icon: Search,
    title: 'Browse everything on campus',
    body: 'Explore available clubs, events, and activities around you. No account needed to start exploring.',
    tier: 'free',
  },
  {
    icon: Bookmark,
    title: 'Save events for later',
    body: "Planned for Basic: bookmark events you're interested in and come back to them. Event saving is not enabled in the current test build.",
    tier: 'basic',
  },
  {
    icon: Filter,
    title: 'Filter by what you love',
    body: 'Explore music, sports, volunteering, gaming and academics. Public category and search filters are free.',
    tier: 'free',
  },
  {
    icon: User,
    title: 'Keep your interests up to date',
    body: 'Choose your interests, rate your favorites and update your preferences as you explore. Recommendations start with what you enjoy, without an assessment.',
    tier: 'free',
  },
  {
    icon: Calendar,
    title: 'Plan your next month',
    body: 'Planned for Plus: collect the events you want to attend in a next-month activity plan. Monthly planning is not enabled in the current test build.',
    tier: 'premium',
  },
  {
    icon: Share2,
    title: 'Make plans with friends',
    body: 'Planned for Plus: share selected events and send invitations through your own messaging app. Sharing is not enabled in the current test build.',
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
  if (tier === 'free') return 'Free';
  if (tier === 'basic') return 'Basic: planned';
  return 'Later';
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
            Start with your interests and discover campus activities that fit.
            Founding Basic is planned at ${FOUNDING_OFFERS.student.amount} for {FOUNDING_OFFERS.student.days} days
            for saved searches and events. Existing interest preferences stay available;
            Plus adds planned
            activity planning and sharing. Genius Mining is a future optional
            discovery experience, not a requirement for finding your next activity.
          </p>
        </div>

        <GeniusMiningTeaser />

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
          <Link href="/activities" className="btn-primary">
            Start browsing free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-sm text-ink/50">Paid plans are in testing. Live checkout is not open.</span>
        </div>
      </div>
    </section>
  );
}
