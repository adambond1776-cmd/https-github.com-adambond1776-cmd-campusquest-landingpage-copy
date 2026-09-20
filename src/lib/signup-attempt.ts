import type { SignupStartInput, SignupStartResult } from '@/lib/signup-types';
import {
  classifySignupError,
  logSignupFailure,
  userFacingSignupMessage,
} from '@/lib/signup-diagnostics';
import { SIGNUP_NETWORK_TIMEOUT_MS, withTimeout } from '@/lib/timeout';

export type SignupAttemptDeps = {
  startSignup: (input: SignupStartInput) => Promise<SignupStartResult>;
  timeoutMs?: number;
};

/**
 * Sends the 6-digit verification code after validation. The startSignup
 * implementation records age itself; this wrapper exists so the client can
 * timeout the whole hop.
 */
export async function runSignupAttempt(
  input: SignupStartInput,
  deps: SignupAttemptDeps
): Promise<SignupStartResult> {
  const timeoutMs = deps.timeoutMs ?? SIGNUP_NETWORK_TIMEOUT_MS;

  try {
    return await withTimeout(deps.startSignup(input), timeoutMs, 'start_signup');
  } catch (error) {
    const kind = classifySignupError(error);
    logSignupFailure({ stage: 'signup_attempt', kind });
    return { ok: false, message: userFacingSignupMessage(kind) };
  }
}

/** Sync lock so the first click wins before React re-renders `submitting`. */
export function createSubmitGate() {
  let busy = false;

  return {
    tryStart(): boolean {
      if (busy) return false;
      busy = true;
      return true;
    },
    finish(): void {
      busy = false;
    },
    get busy(): boolean {
      return busy;
    },
  };
}
