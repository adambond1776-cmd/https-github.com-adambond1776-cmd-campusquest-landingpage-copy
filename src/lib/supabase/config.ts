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

function publicEnv(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = unwrapQuoted(raw);
  return value ? value : undefined;
}

// Static property access is required. Next only inlines NEXT_PUBLIC values
// into the browser bundle when the name is written out directly. A dynamic
// process.env[name] lookup is empty in client components, which made login
// look unconfigured and fall through to the development bypass.
export const supabaseUrl = publicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = publicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
