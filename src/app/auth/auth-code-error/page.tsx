import Link from 'next/link';
import { ArrowLeft, Compass, MailX } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login link problem | CampusQuest',
  description: 'That login link could not be used. Request a fresh one.',
};

const reasons: Record<string, string> = {
  link: 'That link has already been used or has expired. Login links are good for one sign-in, and only for a short while.',
  missing: 'That link was missing its sign-in code, which usually means the email client rewrote the URL.',
  unconfigured: 'This deploy has no Supabase project attached, so there is nothing to exchange the link against.',
};

const fallbackReason =
  'We could not use that login link. Request a fresh one and it should go through.';

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reason } = await searchParams;
  const key = Array.isArray(reason) ? reason[0] : reason;
  const explanation = (key && reasons[key]) || fallbackReason;

  return (
    <div className="min-h-screen bg-brand-950 text-white flex flex-col">
      <header className="px-5 sm:px-8 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-5">
              <Compass className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-extrabold">That link didn&apos;t work</h1>
            <p className="mt-3 text-white/60">{explanation}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-5">
              <MailX className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Nothing is lost — ask for a new link and we will email it straight away.
            </p>
            <Link href="/login" className="btn-gold w-full mt-6">
              Send me a new link
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-white/50">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/signup"
              className="text-gold-400 font-semibold hover:text-gold-500 transition-colors"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
