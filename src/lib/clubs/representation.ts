import { isCanonicalRecordId } from '@/lib/activities/canonical';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';
export type ClubOfferState = 'signed-out' | 'unverified' | 'pending' | 'rejected' | 'approved' | 'active';

export function claimInsertGuard(): { status: 'pending'; reviewed_at: null; reviewed_by: null } {
  return { status: 'pending', reviewed_at: null, reviewed_by: null };
}

export function cleanClaimNote(value: string): string | null {
  const note = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  if (!note) return null;
  return note.slice(0, 500);
}

export function membershipElevationAllowed(
  authRole: string | null,
  nextRole: string,
  previousRole?: string,
): boolean {
  if (authRole === 'service_role' || authRole === 'postgres') return true;
  const elevated = nextRole === 'owner' || nextRole === 'admin' || nextRole === 'manager';
  if (!previousRole) return !elevated;
  const wasElevated = previousRole === 'owner' || previousRole === 'admin' || previousRole === 'manager';
  return !elevated || wasElevated;
}

export function reviewerMayDecide(input: {
  reviewerId: string;
  claimantId: string;
  reviewerEmail: string | null;
  allowlist: string[];
}): boolean {
  if (!input.reviewerId || input.reviewerId === input.claimantId) return false;
  const email = input.reviewerEmail?.trim().toLowerCase() ?? '';
  if (!email) return false;
  return input.allowlist.some((entry) => entry.trim().toLowerCase() === email);
}

export function clubOfferState(input: {
  signedIn: boolean;
  pending: boolean;
  rejected: boolean;
  approved: boolean;
  active: boolean;
}): ClubOfferState {
  if (!input.signedIn) return 'signed-out';
  if (input.active) return 'active';
  if (input.approved) return 'approved';
  if (input.pending) return 'pending';
  if (input.rejected) return 'rejected';
  return 'unverified';
}

export type CheckoutBlock =
  | 'sign-in'
  | 'demo'
  | 'organization'
  | 'unverified'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'closed';

export function clubCheckoutEligibility(input: {
  authenticated: boolean;
  demo: boolean;
  organizationId: string | null;
  organizationExists: boolean;
  approvedRepresentative: boolean;
  claimStatus: ClaimStatus | null;
  accessActive: boolean;
  checkoutConfigured: boolean;
}): { ok: true } | { ok: false; reason: CheckoutBlock } {
  if (!input.authenticated) return { ok: false, reason: 'sign-in' };
  if (input.demo) return { ok: false, reason: 'demo' };
  if (!input.organizationId || !isCanonicalRecordId(input.organizationId) || !input.organizationExists) {
    return { ok: false, reason: 'organization' };
  }
  if (!input.approvedRepresentative) {
    if (input.claimStatus === 'pending') return { ok: false, reason: 'pending' };
    if (input.claimStatus === 'rejected') return { ok: false, reason: 'rejected' };
    return { ok: false, reason: 'unverified' };
  }
  if (input.accessActive) return { ok: false, reason: 'active' };
  if (!input.checkoutConfigured) return { ok: false, reason: 'closed' };
  return { ok: true };
}

export function checkoutBlockMessage(reason: CheckoutBlock): string {
  if (reason === 'sign-in') return 'Founding Club checkout requires a signed-in account.';
  if (reason === 'demo') return 'Founding Club checkout is not available for this account.';
  if (reason === 'organization') return 'Founding Club checkout could not find that organization.';
  if (reason === 'pending') return 'Founding Club checkout is not available while verification is pending.';
  if (reason === 'rejected') return 'Founding Club checkout requires an approved representative.';
  if (reason === 'unverified') return 'Founding Club checkout requires an approved representative.';
  if (reason === 'active') return 'Founding Club is already active for this organization.';
  return 'Founding Club checkout is closed.';
}
