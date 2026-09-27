'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Compass, Loader2 } from 'lucide-react';
import FormAlert from '@/components/FormAlert';
import TextField from '@/components/TextField';
import { signInDemoAccount } from '@/app/demo-login/actions';

export default function DemoLoginView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const result = await signInDemoAccount(email, password);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push('/activities');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-950 text-white flex flex-col">
      <header className="px-5 sm:px-8 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold">Demo sign in</h1>
              <p className="text-sm text-white/60">Sign in to the CampusQuest demo.</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" placeholder="you@campusquestapp.com" />
            <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
            {message ? <FormAlert message={message} /> : null}
            <button type="submit" disabled={pending} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
