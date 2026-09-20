import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from '@/lib/env';

const DEV_COOKIE = 'cq_dev_participant';

export type Identity = {
  userId: string;
  email: string | null;
  /** True when the identity came from a dev cookie rather than a real session. */
  isDev: boolean;
};

/**
 * Who is filling in the form.
 *
 * The instrument runs across two sittings and has to resume on a different
 * device, so progress is keyed to the account rather than to a browser. When
 * Supabase is not configured the identity comes from a cookie instead, which
 * keeps the flow demoable but does not survive clearing cookies — the UI says so.
 */
export async function currentIdentity(): Promise<Identity | null> {
  const jar = await cookies();

  if (supabaseConfigured()) {
    const client = createServerClient(supabaseUrl()!, supabaseAnonKey()!, {
      cookies: {
        getAll: () => jar.getAll(),
        // Read-only: refreshing the session is the proxy's job.
        setAll: () => {},
      },
    });

    const { data } = await client.auth.getUser();
    if (data.user) {
      return { userId: data.user.id, email: data.user.email ?? null, isDev: false };
    }
    return null;
  }

  const existing = jar.get(DEV_COOKIE)?.value;
  if (existing) return { userId: existing, email: null, isDev: true };

  return null;
}

/**
 * Issues a dev identity so the questionnaire can be walked end to end with no
 * Supabase project attached. Never called when Supabase is configured.
 */
export async function ensureDevIdentity(): Promise<Identity> {
  if (supabaseConfigured()) {
    throw new Error('Supabase is configured; sign in rather than issuing a dev identity.');
  }

  const jar = await cookies();
  const existing = jar.get(DEV_COOKIE)?.value;
  if (existing) return { userId: existing, email: null, isDev: true };

  const userId = `dev_${crypto.randomUUID()}`;
  jar.set(DEV_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return { userId, email: null, isDev: true };
}
