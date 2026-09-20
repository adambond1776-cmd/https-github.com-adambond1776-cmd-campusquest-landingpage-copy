import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

/**
 * Supabase client for server components, server actions, and route handlers.
 * A fresh client per request is required — the cookie store is request scoped.
 * Returns null when the project has no credentials.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components render after headers are committed and cannot
          // write cookies. The middleware refresh handles those cases.
        }
      },
    },
  });
}

export { isSupabaseConfigured };
