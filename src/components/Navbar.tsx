'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandLockup } from '@/components/Logo';
import LogoutButton from '@/components/LogoutButton';
import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import { HERO_NAV_SELECTOR, heroCoversNavbar } from '@/lib/nav-hero';

export default function Navbar({
  appearance = 'auto',
}: {
  /** `auto` follows the homepage hero; inner pages can pin a tone. */
  appearance?: 'auto' | 'dark' | 'light';
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [overHero, setOverHero] = useState(appearance !== 'light');
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const onDark = appearance === 'dark' || (appearance === 'auto' && overHero);

  useLayoutEffect(() => {
    if (appearance !== 'auto') return;

    const hero = document.querySelector(HERO_NAV_SELECTOR);
    if (!hero) return;

    const sync = () => {
      const navHeight = barRef.current?.offsetHeight ?? 64;
      setOverHero(heroCoversNavbar(hero.getBoundingClientRect().bottom, navHeight));
    };

    let observer: IntersectionObserver | null = null;

    const attach = () => {
      const navHeight = barRef.current?.offsetHeight ?? 64;
      observer?.disconnect();
      observer = new IntersectionObserver(sync, {
        root: null,
        // Shrink the viewport by the sticky bar so "intersecting" means the
        // hero still sits under the nav, not merely under the overlay itself.
        rootMargin: `-${navHeight}px 0px 0px 0px`,
        threshold: 0,
      });
      observer.observe(hero);
    };

    attach();
    const raf = requestAnimationFrame(sync);
    window.addEventListener('scroll', sync, { passive: true, capture: true });
    const onResize = () => {
      attach();
      sync();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('scroll', sync, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [appearance]);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((resolved) => {
      if (active) setUser(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Absolute hrefs on the section anchors so the nav still works from a route
  // that is not the landing page.
  const links = [
    { label: 'Find Activities', href: '/activities' },
    { label: 'For Students', href: '/#students' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'For Schools', href: '/institutions' },
  ];

  const linkClass = onDark
    ? 'text-white/90 hover:text-white'
    : 'text-ink/80 hover:text-ink';
  const menuLinkClass = onDark
    ? 'text-white/90 hover:bg-white/10 hover:text-white'
    : 'text-ink/80 hover:bg-cream-100 hover:text-ink';
  const ghostButtonClass = onDark
    ? 'border-white/20 text-white hover:bg-white/10'
    : 'border-ink/15 text-ink hover:bg-cream-100';

  return (
    <header
      data-nav-tone={onDark ? 'dark' : 'light'}
      className={`sticky top-0 inset-x-0 z-50 border-b motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-300 motion-reduce:transition-none ${
        onDark
          ? 'border-white/10 bg-brand-950/80 shadow-none backdrop-blur-md'
          : 'border-cream-200 bg-white/[0.94] shadow-soft backdrop-blur-md'
      }`}
    >
      <nav className="max-w-content mx-auto px-5 sm:px-8">
        <div
          ref={barRef}
          className="flex h-16 items-center justify-between lg:h-[4.5rem]"
        >
          <Link href="/" className="group min-w-0" onClick={() => setOpen(false)}>
            <BrandLockup size={44} onDark={onDark} />
          </Link>

          <div className="hidden xl:flex items-center gap-7">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap text-sm font-medium motion-safe:transition-colors motion-safe:duration-300 ${linkClass}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/settings"
                  className={`text-sm font-semibold motion-safe:transition-colors motion-safe:duration-300 px-3 py-2 ${linkClass}`}
                >
                  Account
                </Link>
                <LogoutButton
                  className={`text-sm font-semibold motion-safe:transition-colors motion-safe:duration-300 px-3 py-2 ${linkClass}`}
                />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`text-sm font-semibold motion-safe:transition-colors motion-safe:duration-300 px-4 py-2 ${linkClass}`}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(42,95,191,0.35)] transition-all duration-200 hover:bg-brand-400 hover:-translate-y-0.5"
                >
                  Get the app
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className={`xl:hidden -mr-2 rounded-lg p-2 motion-safe:transition-colors motion-safe:duration-300 ${
              onDark ? 'text-white' : 'text-ink'
            }`}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="xl:hidden pb-5 animate-fade-in">
            <div
              className={`flex flex-col gap-1 pt-1 border-t ${
                onDark ? 'border-white/10' : 'border-cream-200'
              }`}
            >
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${menuLinkClass}`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 mt-4 px-2">
                {user ? (
                  <>
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className={`inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold transition-colors ${ghostButtonClass}`}
                    >
                      Account
                    </Link>
                    <LogoutButton className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white" />
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className={`inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold transition-colors ${ghostButtonClass}`}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white"
                    >
                      Get the app
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
