'use client';

import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';

type CheckInboxProps = {
  email: string;
  /** The link was faked because no Supabase project is configured. */
  mock: boolean;
  /** The address was already on file, so the link signs them back in. */
  alreadyRegistered: boolean;
  /** Where the "Dev mode" shortcut jumps to, standing in for the email link. */
  continueHref: string;
  onUseDifferentEmail: () => void;
};

export default function CheckInbox({
  email,
  mock,
  alreadyRegistered,
  continueHref,
  onUseDifferentEmail,
}: CheckInboxProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm text-center animate-fade-in">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-5">
        <Mail className="w-6 h-6" strokeWidth={2.5} />
      </div>

      <h2 className="text-xl font-extrabold">Check your inbox</h2>
      <p className="mt-3 text-sm text-white/60 leading-relaxed">
        We sent a login link to{' '}
        <span className="text-white/90 font-medium break-all">{email}</span>. Open it on this
        device and you are in — no password to remember.
      </p>

      {alreadyRegistered && (
        <p className="mt-3 text-sm text-white/50 leading-relaxed">
          We already know this address, so the link takes you straight back to your existing
          account.
        </p>
      )}

      <p className="mt-5 text-xs text-white/40 leading-relaxed">
        The link works once and expires shortly. Nothing arrived? Check spam, then try again.
      </p>

      <button type="button" onClick={onUseDifferentEmail} className="btn-ghost-light w-full mt-6">
        Use a different email
      </button>

      {mock && (
        <div className="mt-6 pt-5 border-t border-white/10">
          <p className="text-xs text-white/40">
            Dev mode: no email will actually be sent.
          </p>
          <Link
            href={continueHref}
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-gold-400 hover:text-gold-500 transition-colors"
          >
            Continue without the link
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
