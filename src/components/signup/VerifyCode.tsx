'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import FormAlert from '@/components/FormAlert';
import TextField from '@/components/TextField';
import { CAMPUS_EMAIL_USER_MESSAGES, isValidCampusEmailCode } from '@/lib/email-verification';

export default function VerifyCode({
  email,
  emailMasked,
  mock,
  onVerified,
  onResend,
  onUseDifferentEmail,
}: {
  email: string;
  emailMasked: string;
  mock: boolean;
  onVerified: (code: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  onResend: () => Promise<{ ok: true } | { ok: false; message: string }>;
  onUseDifferentEmail: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!isValidCampusEmailCode(code)) {
      setError(CAMPUS_EMAIL_USER_MESSAGES.incorrect);
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await onVerified(code.trim());
      if (!result.ok) setError(result.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending || submitting) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const result = await onResend();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(CAMPUS_EMAIL_USER_MESSAGES.sent);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-5">
          <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-extrabold">Enter your verification code</h2>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          We sent a 6-digit code to{' '}
          <span className="text-white/90 font-medium break-all">{emailMasked || email}</span>.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <FormAlert message={error} />}
        {notice && (
          <p className="rounded-xl border border-brand-400/30 bg-brand-500/10 px-4 py-3 text-sm text-white/80">
            {notice}
          </p>
        )}

        <TextField
          label="Verification code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          disabled={submitting}
        />

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying
            </>
          ) : (
            'Verify code'
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-3 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || submitting}
          className="text-sm font-semibold text-gold-400 hover:text-gold-500 disabled:opacity-40"
        >
          {resending ? 'Sending a new code…' : 'Resend code'}
        </button>
        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="text-sm text-white/50 hover:text-white/80"
        >
          Use a different email
        </button>
      </div>

      {mock && (
        <p className="mt-6 pt-5 border-t border-white/10 text-xs text-white/40 text-center">
          Dev mode: no email is sent. Enter any 6-digit code to continue.
        </p>
      )}
    </div>
  );
}
