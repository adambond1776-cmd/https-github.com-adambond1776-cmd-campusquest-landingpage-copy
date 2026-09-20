/**
 * Supabase credentials, read once and shared by the browser, server, and
 * middleware clients.
 *
 * Supabase is optional in development. Without credentials the auth flows fall
 * back to the local mock in `auth.ts`, so the marketing site stays clickable
 * locally. Production must never take that path. Nothing here throws at import.
 */

function unwrapQuoted(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function publicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = unwrapQuoted(raw);
  return value ? value : undefined;
}

export const supabaseUrl = publicEnv('NEXT_PUBLIC_SUPABASE_URL');
export const supabaseAnonKey = publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
