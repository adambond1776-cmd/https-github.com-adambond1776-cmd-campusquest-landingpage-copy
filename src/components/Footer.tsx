import Link from 'next/link';
import { Compass, ShieldCheck } from 'lucide-react';
import { Instagram, Linkedin, Twitter } from '@/components/BrandIcons';
import { FOOTER_CONSENT_LINE } from '@/lib/legal';
import { socialLinks } from '@/lib/site';

const ICONS = { instagram: Instagram, twitter: Twitter, linkedin: Linkedin } as const;

const productLinks = [
  { href: '/activities', label: 'Find activities' },
  { href: '/#students', label: 'For Students' },
  { href: '/#organizations', label: 'For Organizations' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/institutions', label: 'For Schools' },
  { href: '/method', label: 'Where Genius Mining comes from' },
];

const companyLinks = [
  { href: '/signup', label: 'Sign up' },
  { href: '/login', label: 'Log in' },
  { href: '/settings', label: 'Account settings' },
  { href: '/privacy', label: 'Privacy and data use' },
  { href: '/terms', label: 'Terms of use' },
];

export default function Footer() {
  const socials = socialLinks();

  return (
    <footer className="bg-brand-950 text-white pt-16 pb-8">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white">
                <Compass className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-xl">
                Campus<span className="text-brand-400">Quest</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/50 max-w-xs leading-relaxed">
              The personalized discovery layer for college life. Students find
              their people. Clubs find their members.
            </p>
            {socials.length > 0 ? (
              <div className="flex items-center gap-3 mt-6">
                {socials.map(({ platform, href }) => {
                  const Icon = ICONS[platform];
                  return (
                    <a
                      key={platform}
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                      aria-label={`CampusQuest on ${platform}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white/40 mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {productLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white/40 mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {companyLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Standing privacy and consent notice. Present on every page on purpose:
            a student should not have to open a policy to learn the one thing that
            would change their mind about signing up. */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-4 sm:p-5">
            <ShieldCheck className="w-5 h-5 shrink-0 text-brand-400 mt-0.5" />
            <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed">
              {FOOTER_CONSENT_LINE}{' '}
              <Link href="/privacy" className="text-white/90 underline underline-offset-2 hover:text-white">
                Read what we collect and why
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © 2026 CampusQuest. Built by students, for students.
          </p>
          <p className="text-xs text-white/40">
            Level Up Rhode Island — selecting three founding partners
          </p>
        </div>
      </div>
    </footer>
  );
}
