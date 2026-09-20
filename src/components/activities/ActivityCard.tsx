import { BadgeCheck, CalendarDays, ExternalLink, MapPin, Trophy, Users } from 'lucide-react';
import type { Activity } from '@/lib/activities/types';
import { sourceLabel } from '@/lib/activities/types';
import { formatWhen, kindLabel } from '@/lib/activities/format';

const KIND_ICON = {
  game: Trophy,
  organization: Users,
  event: CalendarDays,
  facility: MapPin,
  place: MapPin,
} as const;

export default function ActivityCard({ activity }: { activity: Activity }) {
  const when = formatWhen(activity);
  const Icon = KIND_ICON[activity.kind];
  const homeGame = activity.athletics?.home === true;
  const verified = activity.status === 'verified';

  return (
    <article className="group relative flex flex-col h-full rounded-2xl bg-white border border-cream-300 p-5 shadow-soft hover:shadow-lift hover:border-brand-200 transition-all">
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-xl ${
            homeGame ? 'bg-gold-500/15 text-gold-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wide ${
                homeGame ? 'text-gold-600' : 'text-brand-500'
              }`}
            >
              {kindLabel(activity)}
            </span>
            {verified ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"
                title="A person has confirmed this listing"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : null}
          </div>

          <h3 className="mt-1 font-bold text-ink leading-snug text-[15px] break-words">
            {activity.name}
          </h3>
        </div>
      </div>

      {when ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <CalendarDays className="w-4 h-4 shrink-0" />
          {when}
        </p>
      ) : null}

      {activity.summary ? (
        <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
          {activity.summary}
        </p>
      ) : null}

      {activity.location ? (
        <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="break-words">{activity.location}</span>
        </p>
      ) : null}

      {activity.categories.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activity.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="px-2 py-0.5 rounded-md bg-cream-100 border border-cream-300 text-[11px] font-medium text-slate-600"
            >
              {category}
            </span>
          ))}
        </div>
      ) : null}

      {/* Provenance sits on every card on purpose. Our copy of someone else's
          calendar can be wrong, and a student deciding whether to travel across
          campus should be able to see where the claim came from and go check. */}
      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400 truncate">{sourceLabel(activity.source)}</span>
        {activity.url ? (
          <a
            href={activity.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors shrink-0"
          >
            Details
            <ExternalLink className="w-3 h-3" />
            <span className="sr-only">for {activity.name} (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
