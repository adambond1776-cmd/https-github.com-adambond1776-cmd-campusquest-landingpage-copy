import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

let browserClient: SupabaseClient | null = null;

/**
 * Supabase client for client components. Returns null when the project has no
 * credentials so callers can fall back to the mock instead of crashing.
 */
export function createClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  browserClient ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

export { isSupabaseConfigured };
