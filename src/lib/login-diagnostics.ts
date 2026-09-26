/**
 * Server logs for the magic-link login path.
 * Messages are redacted before they reach the terminal. Never pass keys,
 * tokens, or the emailed link into this helper.
 */

export type LoginDiagnostic = {
  stage: string;
  outcome: 'ok' | 'error' | 'missing';
  code?: string | null;
  message?: string | null;
};

export function redactLoginDiagnostic(value: string): string {
  return value
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/token_hash=[^&\s]+/gi, 'token_hash=[redacted]')
    .replace(/\b(re_|sb_secret_)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/https?:\/\/\S+/gi, (url) => {
      try {
        const parsed = new URL(url);
        if (parsed.searchParams.has('token_hash') || parsed.searchParams.has('token')) {
          return `${parsed.origin}${parsed.pathname}`;
        }
      } catch {
        return '[redacted-url]';
      }
      return url;
    })
    .slice(0, 240);
}

export function loginDiagnosticFromError(error: unknown): { code: string | null; message: string } {
  if (!error || typeof error !== 'object') {
    return { code: null, message: redactLoginDiagnostic(String(error ?? '')) };
  }
  const record = error as { code?: unknown; status?: unknown; statusCode?: unknown; name?: unknown; message?: unknown };
  const code = [record.code, record.statusCode, record.status, record.name].find(
    (value) => typeof value === 'string' || typeof value === 'number'
  );
  const message = typeof record.message === 'string' ? record.message : '';
  return {
    code: code == null ? null : String(code),
    message: redactLoginDiagnostic(message),
  };
}

export function logLoginDiagnostic(event: LoginDiagnostic): void {
  const payload = {
    stage: event.stage,
    outcome: event.outcome,
    code: event.code ?? null,
    message: event.message ? redactLoginDiagnostic(event.message) : null,
  };
  if (event.outcome === 'error') console.error('[login]', payload);
  else console.info('[login]', payload);
}
