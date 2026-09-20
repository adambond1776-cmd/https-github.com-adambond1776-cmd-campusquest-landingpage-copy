/**
 * Sanitized Supabase credential checks. Never log or return key material.
 */

export type SupabaseKeyRole = 'anon' | 'service_role' | 'unknown' | 'unparseable';

export type ActivitiesFailureKind =
  | 'missing_url'
  | 'missing_anon_key'
  | 'project_mismatch'
  | 'invalid_credentials'
  | 'database';

export type SupabaseCredentialInspection = {
  urlPresent: boolean;
  anonKeyPresent: boolean;
  urlProjectRef: string | null;
  anonKeyProjectRef: string | null;
  anonKeyRole: SupabaseKeyRole;
  sameProject: boolean | null;
};

export const ACTIVITIES_USER_MESSAGES: Record<ActivitiesFailureKind, string> = {
  missing_url: 'The directory is unavailable because the database URL is not configured.',
  missing_anon_key: 'The directory is unavailable because the public API key is not configured.',
  project_mismatch:
    'The directory is unavailable because the database URL and public API key are from different projects.',
  invalid_credentials: 'The directory is unavailable because the database credentials are invalid.',
  database: 'The directory could not be read. Please try again.',
};

export function supabaseProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.(co|in|net)$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const json = Buffer.from(padded + pad, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function inspectSupabaseAnonCredentials(
  url: string | undefined,
  anonKey: string | undefined
): SupabaseCredentialInspection {
  const payload = anonKey ? decodeJwtPayload(anonKey) : null;
  const urlProjectRef = supabaseProjectRefFromUrl(url);
  const anonKeyProjectRef =
    payload && typeof payload.ref === 'string' && payload.ref.trim() ? payload.ref.trim() : null;
  const role = payload && typeof payload.role === 'string' ? payload.role : null;
  const anonKeyRole: SupabaseKeyRole = !anonKey
    ? 'unknown'
    : !payload
      ? 'unparseable'
      : role === 'anon' || role === 'service_role'
        ? role
        : 'unknown';

  return {
    urlPresent: Boolean(url),
    anonKeyPresent: Boolean(anonKey),
    urlProjectRef,
    anonKeyProjectRef,
    anonKeyRole,
    sameProject:
      urlProjectRef && anonKeyProjectRef ? urlProjectRef === anonKeyProjectRef : null,
  };
}

export function directoryReadBlocker(
  inspection: SupabaseCredentialInspection
): ActivitiesFailureKind | null {
  if (!inspection.urlPresent) return 'missing_url';
  if (!inspection.anonKeyPresent) return 'missing_anon_key';
  if (inspection.sameProject === false) return 'project_mismatch';
  return null;
}

export function classifyActivitiesReadError(error: unknown): ActivitiesFailureKind {
  const message = supabaseErrorMessage(error).toLowerCase();
  if (message.includes('invalid api key') || message.includes('invalid jwt') || message.includes('jwt expired')) {
    return 'invalid_credentials';
  }
  if (message.includes('malformed jwt') || message.includes('jwtexpired') || message.includes('bad_jwt')) {
    return 'invalid_credentials';
  }
  return 'database';
}

function supabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return String(error);
}

function isActivitiesFailureKind(value: unknown): value is ActivitiesFailureKind {
  return (
    value === 'missing_url' ||
    value === 'missing_anon_key' ||
    value === 'project_mismatch' ||
    value === 'invalid_credentials' ||
    value === 'database'
  );
}

export function publicActivitiesError(error: unknown): string {
  if (error && typeof error === 'object' && 'kind' in error && isActivitiesFailureKind(error.kind)) {
    return ACTIVITIES_USER_MESSAGES[error.kind];
  }
  return ACTIVITIES_USER_MESSAGES[classifyActivitiesReadError(error)];
}

export function logActivitiesFailure(event: {
  stage: string;
  kind: ActivitiesFailureKind;
  inspection?: SupabaseCredentialInspection;
}): void {
  console.error('[activities]', {
    stage: event.stage,
    kind: event.kind,
    urlPresent: event.inspection?.urlPresent ?? null,
    anonKeyPresent: event.inspection?.anonKeyPresent ?? null,
    urlProjectRef: event.inspection?.urlProjectRef ?? null,
    anonKeyProjectRef: event.inspection?.anonKeyProjectRef ?? null,
    anonKeyRole: event.inspection?.anonKeyRole ?? null,
    sameProject: event.inspection?.sameProject ?? null,
  });
}

export class ActivitiesDirectoryError extends Error {
  constructor(
    readonly kind: ActivitiesFailureKind,
    message: string = ACTIVITIES_USER_MESSAGES[kind]
  ) {
    super(message);
    this.name = 'ActivitiesDirectoryError';
  }
}
