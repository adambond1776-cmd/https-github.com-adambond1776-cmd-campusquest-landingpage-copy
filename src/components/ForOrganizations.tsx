import { PLANS, formatPrice } from '@/lib/pricing';
import Link from 'next/link';
import {
  Globe,
  CalendarRange,
  FileText,
} from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Custom club page with your URL',
    body: 'One editable page with your club description, logo, meeting details and upcoming events. A shareable address inside CampusQuest.',
  },
  {
    icon: CalendarRange,
    title: 'Post and maintain your events',
    body: 'Create, edit or cancel individual events. Reviewed listings join the existing campus directory and interest-based discovery.',
  },
  {
    icon: FileText,
    title: 'Keep membership interest organized',
    body: 'Students choose to share their contact information with your club. Requests are saved privately for the owner; notification emails are preview-only during testing.',
  },
];

export default function ForOrganizations() {
  return (
    <section
      id="organizations"
      className="py-20 lg:py-28 bg-brand-950 text-white relative overflow-hidden"
    >
      {/* Background accents */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-brand-600/20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gold-500/10 blur-[100px]" />
      </div>

      <div className="relative max-w-content mx-auto px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-gold-400">
            For Campus Clubs
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-balance">
            Your club page, events and inquiries. {formatPrice(PLANS.club.price)}/month.
          </h2>
          <p className="mt-5 text-lg text-white/70 leading-relaxed">
            A focused first product, built into the campus discovery experience.
            Club ownership and content are reviewed before publication. Tools
            are in testing; no real subscription charges are enabled.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:-translate-y-1"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold-500 text-brand-950 transition-transform group-hover:scale-110">
                <f.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <h3 className="mt-5 text-base font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link href="/clubs/manage" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80">
            Explore the club workspace
          </Link>
        </div>
      </div>
    </section>
  );
}
