import { AUTH_UNCONFIGURED_MESSAGE } from '@/lib/runtime';
import { TimeoutError } from '@/lib/timeout';

export type SignupFailureKind =
  | 'validation'
  | 'supabase_auth'
  | 'database'
  | 'email'
  | 'configuration'
  | 'timeout'
  | 'unexpected';

export const SIGNUP_RETRY_MESSAGE =
  "We couldn't complete that. Please try again.";

export const SIGNUP_CODE_RETRY_MESSAGE =
  "We couldn't send your code. Please try again.";

export function classifySignupError(error: unknown): SignupFailureKind {
  if (error instanceof TimeoutError) return 'timeout';

  const message = error instanceof Error ? error.message : '';
  if (message.includes('production storage is not configured')) return 'configuration';
  if (message.includes('Could not save age') || message.includes('Could not save the guardian')) {
    return 'database';
  }
  if (message.includes('Could not save verification') || message.includes('Could not read verification')) {
    return 'database';
  }
  if (message.includes('RESEND_API_KEY') || message.includes('Resend rejected')) return 'email';
  if (message.includes('sign-in is temporarily unavailable')) return 'configuration';
  if (message.includes('EMAIL_VERIFICATION_SECRET')) return 'configuration';
  return 'unexpected';
}

export function userFacingSignupMessage(kind: SignupFailureKind): string {
  switch (kind) {
    case 'validation':
      return SIGNUP_RETRY_MESSAGE;
    case 'configuration':
      return AUTH_UNCONFIGURED_MESSAGE;
    case 'database':
    case 'email':
    case 'supabase_auth':
    case 'timeout':
    case 'unexpected':
      return SIGNUP_RETRY_MESSAGE;
  }
}

/**
 * Distinguishes signup failures in server/browser logs without emails, tokens,
 * or provider payloads.
 */
export function logSignupFailure(event: {
  stage: string;
  kind: SignupFailureKind;
}): void {
  console.error('[signup]', { stage: event.stage, kind: event.kind, outcome: 'error' });
}

export function logSignupSuccess(stage: string): void {
  console.info('[signup]', { stage, outcome: 'ok' });
}

export { AUTH_UNCONFIGURED_MESSAGE };
