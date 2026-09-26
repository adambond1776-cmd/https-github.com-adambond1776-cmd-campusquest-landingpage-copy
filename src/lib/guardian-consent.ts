import { ageStore, type AgeStore } from '@/lib/age-store';
import { consentTokenExpired, hashConsentToken } from '@/lib/age';
import { sendGuardianApproved } from '@/lib/alerts';

export type GuardianPreview =
  | { state: 'unknown' }
  | { state: 'already' }
  | { state: 'expired' }
  | { state: 'pending' };

export type GuardianApproval =
  | { state: 'approved' }
  | { state: 'already' }
  | { state: 'expired' }
  | { state: 'unknown' };

/**
 * Reads a guardian link. Must not record consent.
 * A mail scanner, preview, or prefetch stops here.
 */
export async function inspectGuardianConsent(
  token: string | undefined,
  store: AgeStore = ageStore()
): Promise<GuardianPreview> {
  const found = await findOpenRequest(token, store);
  if (found === 'unknown' || found === 'already' || found === 'expired') return { state: found };
  return { state: 'pending' };
}

/**
 * Records consent only after an explicit confirmation submit.
 */
export async function confirmGuardianConsent(
  token: string | undefined,
  store: AgeStore = ageStore()
): Promise<GuardianApproval> {
  const found = await findOpenRequest(token, store);
  if (found === 'unknown' || found === 'already' || found === 'expired') return { state: found };

  await store.recordConsent(found.email, new Date().toISOString());
  await sendGuardianApproved(found.email);
  return { state: 'approved' };
}

async function findOpenRequest(
  token: string | undefined,
  store: AgeStore
): Promise<{ email: string } | 'unknown' | 'already' | 'expired'> {
  if (!token) return 'unknown';
  const found = await store.findByTokenHash(hashConsentToken(token));
  const consent = found?.record.guardian;
  if (!found || !consent) return 'unknown';
  if (consent.consented_at) return 'already';
  if (consentTokenExpired(consent)) return 'expired';
  if (!found.email) return 'unknown';
  return { email: found.email };
}

/** Enough of an address to recognise it, without printing the local part in full. */
export function maskGuardianStudent(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return 'a student';
  const head = name.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(name.length - 1, 1))}@${domain}`;
}
