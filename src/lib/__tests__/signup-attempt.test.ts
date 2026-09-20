import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGNUP_RETRY_MESSAGE } from '@/lib/signup-diagnostics';
import { TimeoutError, withTimeout } from '@/lib/timeout';
import { createSubmitGate, runSignupAttempt } from '@/lib/signup-attempt';

const never = <T,>() => new Promise<T>(() => {});

const baseInput = {
  email: 'student@uri.edu',
  role: 'student' as const,
  interests: ['Sports'],
  plan: 'free' as const,
  birthYear: 2004,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createSubmitGate', () => {
  it('allows only one in-flight attempt until finish() is called', () => {
    const gate = createSubmitGate();
    expect(gate.tryStart()).toBe(true);
    expect(gate.tryStart()).toBe(false);
    expect(gate.tryStart()).toBe(false);
    gate.finish();
    expect(gate.tryStart()).toBe(true);
  });
});

describe('runSignupAttempt', () => {
  it('starts signup and returns the verification payload on success', async () => {
    const startSignup = vi.fn().mockResolvedValue({
      ok: true,
      mock: false,
      alreadyRegistered: false,
      needsVerification: true,
      emailMasked: 's••••••@uri.edu',
    });

    const result = await runSignupAttempt(baseInput, { startSignup });

    expect(result).toEqual({
      ok: true,
      mock: false,
      alreadyRegistered: false,
      needsVerification: true,
      emailMasked: 's••••••@uri.edu',
    });
    expect(startSignup).toHaveBeenCalledOnce();
    expect(startSignup).toHaveBeenCalledWith(baseInput);
  });

  it('returns a start-signup failure without claiming a code was sent', async () => {
    const startSignup = vi.fn().mockResolvedValue({
      ok: false,
      message: "We couldn't send your code. Please try again.",
    });

    const result = await runSignupAttempt(baseInput, { startSignup });

    expect(result).toEqual({
      ok: false,
      message: "We couldn't send your code. Please try again.",
    });
  });

  it('turns a thrown start-signup failure into an error result', async () => {
    const startSignup = vi.fn().mockRejectedValue(
      new Error('Could not save verification challenge: relation does not exist')
    );

    const result = await runSignupAttempt(baseInput, { startSignup });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.message).not.toMatch(/relation|verification challenge/i);
  });

  it('times out a hung start-signup request', async () => {
    const result = await runSignupAttempt(baseInput, {
      startSignup: never,
      timeoutMs: 20,
    });

    expect(result).toEqual({ ok: false, message: SIGNUP_RETRY_MESSAGE });
  });

  it('lets the submit gate block a second attempt until the first finishes', () => {
    const gate = createSubmitGate();
    const startSignup = vi.fn();

    if (gate.tryStart()) {
      startSignup();
    }
    if (gate.tryStart()) {
      startSignup();
    }

    expect(startSignup).toHaveBeenCalledTimes(1);
    gate.finish();
    if (gate.tryStart()) {
      startSignup();
    }
    expect(startSignup).toHaveBeenCalledTimes(2);
  });
});

describe('withTimeout', () => {
  it('rejects with TimeoutError when the promise never settles', async () => {
    await expect(withTimeout(never(), 15, 'test_op')).rejects.toBeInstanceOf(TimeoutError);
  });
});
