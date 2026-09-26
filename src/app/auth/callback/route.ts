import { NextResponse } from 'next/server';
import { accountPrivileges } from '@/lib/account/authorization';
import { loadAccountForSessionUser } from '@/lib/account/profile';
import { campusVerificationPath } from '@/lib/gate';
import { safeReturnPath } from '@/lib/return-path';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_NEXT = '/welcome';
const ERROR_PATH = '/auth/auth-code-error';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeReturnPath(searchParams.get('next'), DEFAULT_NEXT);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const failure = (reason: string) =>
    NextResponse.redirect(new URL(`${ERROR_PATH}?reason=${reason}`, origin));

  // Supabase reports a rejected or expired link on the query string.
  if (searchParams.get('error')) return failure('link');

  const supabase = await createClient();
  if (!supabase) return failure('unconfigured');

  const exchanged = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type === 'magiclink'
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      : null;

  if (!exchanged) return failure('missing');
  if (exchanged.error || !exchanged.data.user?.id) return failure('link');

  const metadata = (exchanged.data.user.user_metadata ?? {}) as Record<string, unknown>;
  const profile = await loadAccountForSessionUser(supabase, exchanged.data.user.id);
  const privileges = accountPrivileges(profile, metadata);
  if (!privileges.verified) {
    return NextResponse.redirect(new URL(campusVerificationPath(next), origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
