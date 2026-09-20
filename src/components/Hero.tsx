import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Calendar,
  MapPin,
  MessageCircle,
  Sparkles,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import Logo, { CAMPUSQUEST_LOGO_SRC } from '@/components/Logo';
import { PLANS, formatPrice } from '@/lib/pricing';

export default function Hero() {
  return (
    <section
      data-cq-hero
      className="relative overflow-hidden bg-brand-950 text-white pt-14 lg:pt-20 pb-20 lg:pb-28"
    >
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/4 w-[420px] h-[420px] rounded-full bg-brand-600/25 blur-[140px]" />
        <div className="absolute top-24 right-[8%] w-[380px] h-[380px] rounded-full bg-brand-500/20 blur-[130px]" />
        <div className="absolute bottom-8 left-[20%] w-[280px] h-[280px] rounded-full bg-gold-500/8 blur-[110px]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="pointer-events-none absolute top-[8%] right-[-6%] hidden lg:block lg:right-[2%] xl:right-[8%] w-[520px] h-[520px] lg:w-[640px] lg:h-[640px] opacity-[0.11] mix-blend-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CAMPUSQUEST_LOGO_SRC}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>

      <div className="relative max-w-content mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 xl:gap-16 items-center">
          <div className="text-center lg:text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm mb-6">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-xs font-semibold tracking-wide text-white/90">
                Level Up Rhode Island — pilot opening this year
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] xl:text-6xl font-extrabold leading-[1.08]">
              Discover more
              <br />
              of{' '}
              <span className="relative inline-block pb-1">
                <span className="relative z-10">college.</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-gold-500/55 -z-0 rounded-sm" />
              </span>
            </h1>

            <p className="mt-6 text-lg lg:text-xl text-white/70 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Your personalized guide to campus life. We surface the clubs,
              events, and opportunities that match your interests — every week,
              automatically.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="btn-gold h-12 px-7 text-[15px] shadow-[0_10px_28px_rgba(212,175,55,0.28)]"
              >
                Start browsing free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="btn-ghost-light h-12 px-7 text-[15px] border-white/35"
              >
                See how it works
              </a>
            </div>

            <p className="mt-5 text-sm text-white/50">
              Browse free. Basic {formatPrice(PLANS.basic.price)}/mo. Premium{' '}
              {formatPrice(PLANS.premium.price)}/mo with Genius Mining.
            </p>
          </div>

          <div className="relative flex items-center justify-center xl:justify-end gap-10 animate-fade-up [animation-delay:150ms]">
            <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] rounded-full bg-brand-400/25 blur-3xl" />
              <PhoneMockup />
            </div>

            <aside className="hidden xl:flex w-48 shrink-0 flex-col gap-5 self-start pt-10">
              <p className="text-[15px] font-semibold italic text-white/80">
                More Than an App
              </p>
              <Benefit icon={Users} label="Find Your People" />
              <Benefit icon={MapPin} label="Discover Campus" />
              <Benefit icon={Zap} label="Make College More Fun" />
            </aside>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0">
        <svg viewBox="0 0 1440 80" className="w-full h-auto" preserveAspectRatio="none">
          <path d="M0,80 L0,40 C240,0 480,0 720,20 C960,40 1200,60 1440,30 L1440,80 Z" fill="#fbfcfd" />
        </svg>
      </div>
    </section>
  );
}

function Benefit({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-medium text-white/80 leading-snug">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 border border-white/10 text-brand-300">
        <Icon className="w-4 h-4" />
      </span>
      {label}
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto">
      <div className="relative bg-[#0b1228] rounded-[2.6rem] p-[10px] shadow-2xl border border-white/15">
        <div className="absolute top-3 left-1/2 z-10 h-[18px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        <div className="bg-cream-50 rounded-[2.1rem] overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-4 pb-2 text-[10px] font-semibold text-ink">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-sm bg-ink/40" />
              <div className="w-3 h-1.5 rounded-sm bg-ink/60" />
              <div className="w-4 h-2 rounded-sm bg-ink/80" />
            </div>
          </div>

          <div className="px-4 pt-2 pb-2 bg-white flex items-center gap-2">
            <Logo size={20} />
            <p className="text-[13px] font-extrabold leading-none text-ink">
              Campus<span className="text-brand-600">Quest</span>
            </p>
          </div>

          <div className="px-5 py-3 bg-brand-600 text-white flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">
                This Week
              </p>
              <p className="text-lg font-bold leading-tight">Your Quest</p>
            </div>
            <Bell className="w-4 h-4 text-white/80" />
          </div>

          <div className="p-4 space-y-3">
            <FeedCard
              icon={<Users className="w-4 h-4" />}
              tag="Club"
              tagColor="bg-brand-100 text-brand-700"
              title="Photography Club"
              meta="Tue 6pm · Memorial Union"
            />
            <FeedCard
              icon={<Trophy className="w-4 h-4" />}
              tag="Event"
              tagColor="bg-gold-500/20 text-gold-600"
              title="Intramural Basketball Finals"
              meta="Thu 7pm · Ryan Center"
            />
            <FeedCard
              icon={<Calendar className="w-4 h-4" />}
              tag="Activity"
              tagColor="bg-brand-100 text-brand-700"
              title="Free Yoga on the Quad"
              meta="Fri 8am · Quad Lawn"
            />
          </div>

          <div className="flex items-center justify-around px-3 py-3 border-t border-cream-200 text-cream-400">
            <PhoneTab label="Feed" />
            <PhoneTab label="Clubs" />
            <PhoneTab label="Map" icon={<MapPin className="w-3.5 h-3.5" />} active />
            <PhoneTab label="Messages" icon={<MessageCircle className="w-3.5 h-3.5" />} />
            <PhoneTab label="Profile" icon={<User className="w-3.5 h-3.5" />} />
          </div>
        </div>
      </div>

      <div className="absolute z-20 top-[38%] -left-2 sm:-left-10 xl:-left-16 w-max bg-white rounded-2xl shadow-lift p-3 flex items-center gap-2.5 animate-fade-in [animation-delay:600ms]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-100">
          <MapPin className="w-4 h-4 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-ink">3 events near you</p>
          <p className="text-[10px] text-ink/50">Within 5 min walk</p>
        </div>
      </div>
    </div>
  );
}

function PhoneTab({
  label,
  icon,
  active = false,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-brand-600' : ''}`}>
      {icon ?? <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-brand-600' : 'bg-cream-400'}`} />}
      <span className={`text-[9px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </div>
  );
}

function FeedCard({
  icon,
  tag,
  tagColor,
  title,
  meta,
}: {
  icon: React.ReactNode;
  tag: string;
  tagColor: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3.5 shadow-soft border border-cream-200">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cream-100 text-brand-600 shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${tagColor}`}
          >
            {tag}
          </span>
          <p className="text-sm font-bold text-ink mt-1 leading-snug">{title}</p>
          <p className="text-[11px] text-ink/50 mt-0.5">{meta}</p>
        </div>
      </div>
    </div>
  );
}
