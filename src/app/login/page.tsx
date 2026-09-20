'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass, Loader2, Mail } from 'lucide-react';
import CheckInbox from '@/components/CheckInbox';
import FormAlert from '@/components/FormAlert';
import TextField from '@/components/TextField';
import { signInWithEmail } from '@/lib/auth';
import { createSubmitGate } from '@/lib/signup-attempt';
import { SIGNUP_RETRY_MESSAGE } from '@/lib/signup-diagnostics';
import { validateEmail } from '@/lib/validation';

type SentLink = {
  email: string;
  mock: boolean;
  alreadyRegistered: boolean;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<SentLink | null>(null);
  const submitGate = useRef(createSubmitGate());

  // Clear a field's complaint as soon as it is being corrected, so stale errors
  // never sit under freshly typed input.
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitGate.current.tryStart()) return;

    const emailError = validateEmail(email);

    if (emailError) {
      submitGate.current.finish();
      setFieldErrors({ email: emailError });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const result = await signInWithEmail({ email });

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setSent({
        email: email.trim(),
        mock: result.mock,
        alreadyRegistered: result.alreadyRegistered,
      });
    } catch {
      setFormError(SIGNUP_RETRY_MESSAGE);
    } finally {
      submitGate.current.finish();
      setSubmitting(false);
    }
  };

  const retry = () => {
    setSent(null);
    setEmail('');
  };

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
            <h1 className="text-3xl font-extrabold">Welcome back</h1>
            <p className="mt-3 text-white/60">Log in to see what&apos;s happening this week.</p>
          </div>

          {sent ? (
            <CheckInbox
              email={sent.email}
              mock={sent.mock}
              alreadyRegistered={sent.alreadyRegistered}
              // An unknown address is a new account with no answers on it yet.
              // The real callback sends those to onboarding, so the dev shortcut
              // that stands in for the email link has to land in the same place.
              continueHref={sent.alreadyRegistered ? '/welcome' : '/signup?finish=1'}
              onUseDifferentEmail={retry}
            />
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                {formError && <FormAlert message={formError} />}

                <TextField
                  label="School email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@uri.edu"
                  autoComplete="email"
                  error={fieldErrors.email}
                  disabled={submitting}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending your link
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Email me a login link
                    </>
                  )}
                </button>

                <p className="text-xs text-white/40 text-center leading-relaxed">
                  No password needed. We email you a link that signs you straight in.
                </p>
              </form>
            </div>
          )}

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
