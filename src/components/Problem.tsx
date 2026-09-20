import { SearchX, Megaphone, CalendarX } from 'lucide-react';

const problems = [
  {
    icon: SearchX,
    title: 'Students can\'t find what\'s happening',
    body: 'Events are scattered across Instagram, flyers, and word-of-mouth. Most students miss out on things they would have loved.',
  },
  {
    icon: Megaphone,
    title: 'Clubs struggle to reach new students',
    body: 'Posting into the void, competing for attention, and relying on friends-of-friends to spread the word.',
  },
  {
    icon: CalendarX,
    title: 'Discovery is broken',
    body: 'There\'s no single place that says "here\'s what fits your interests this week." So everyone settles for FOMO.',
  },
];

export default function Problem() {
  return (
    <section className="py-20 lg:py-28 bg-cream-50">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow">The Problem</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink text-balance">
            College discovery is broken on both sides
          </h2>
          <p className="mt-5 text-lg text-ink/60 leading-relaxed">
            Students miss out. Clubs shout into the void. Everyone loses.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-white rounded-2xl p-7 shadow-soft border border-cream-200 transition-all duration-200 hover:shadow-lift hover:-translate-y-1"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-500 mb-5">
                <p.icon className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-ink leading-snug">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-ink/60 leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
