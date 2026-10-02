import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLockup } from '@/components/Logo';

const NAV = [
  { href: '/admin', label: 'Dashboard', id: 'dashboard' },
  { href: '/admin/club-representatives', label: 'Claims', id: 'claims' },
  { href: '/admin/genius-mining', label: 'Genius Mining', id: 'genius-mining' },
] as const;

export type AdminSection = (typeof NAV)[number]['id'] | 'other';

export default function AdminShell({
  children,
  current = 'other',
}: {
  children: React.ReactNode;
  current?: AdminSection;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to CampusQuest
            </Link>
            <BrandLockup size={36} showTagline={false} onDark />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-950">
              Admin
            </span>
            <nav aria-label="Admin" className="flex flex-wrap gap-1">
              {NAV.map((item) => {
                const active = item.id === current;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                      active
                        ? 'bg-white text-brand-950'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
