import { NextResponse } from 'next/server';
import { needsCampusEmailVerification } from '@/lib/email-verification';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_NEXT = '/welcome';
const ERROR_PATH = '/auth/auth-code-error';
const FINISH_ONBOARDING_PATH = '/signup?finish=1';
const VERIFY_EMAIL_PATH = '/signup?verify=1';

/**
 * Only same-origin relative paths are honoured, so a tampered link cannot turn
 * the callback into an open redirect.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_NEXT;
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));
  const code = searchParams.get('code');

  const failure = (reason: string) =>
    NextResponse.redirect(new URL(`${ERROR_PATH}?reason=${reason}`, origin));

  // Supabase reports a rejected or expired link on the query string.
  if (searchParams.get('error')) return failure('link');
  if (!code) return failure('missing');

  const supabase = await createClient();
  if (!supabase) return failure('unconfigured');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failure('link');

  const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  if (needsCampusEmailVerification(metadata)) {
    return NextResponse.redirect(new URL(VERIFY_EMAIL_PATH, origin));
  }

  // Login of an address that never finished onboarding lands here signed in
  // but with no role, plan or interests. Those accounts finish onboarding
  // instead of dropping onto a welcome page that has nothing to tell them.
  const role = data.user?.user_metadata?.role;
  if (role !== 'student' && role !== 'organization') {
    return NextResponse.redirect(new URL(FINISH_ONBOARDING_PATH, origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
