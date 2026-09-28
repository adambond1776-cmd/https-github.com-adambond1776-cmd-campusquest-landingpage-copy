import { describe, expect, it } from 'vitest';
import {
  checkoutBlockMessage,
  claimInsertGuard,
  clubCheckoutEligibility,
  clubOfferState,
  membershipElevationAllowed,
  reviewerMayDecide,
} from '@/lib/clubs/representation';
import { clubAccessActive, clubGrantDecision, foundingClubWindow } from '@/lib/clubs/founding-club';

const ORG = '22222222-2222-4222-8222-222222222222';
const USER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '33333333-3333-4333-8333-333333333333';

describe('representative claims', () => {
  it('forces a new claim to pending', () => {
    expect(claimInsertGuard()).toEqual({ status: 'pending', reviewed_at: null, reviewed_by: null });
  });

  it('stops a user from approving their own claim or elevating their own role', () => {
    expect(reviewerMayDecide({
      reviewerId: USER,
      claimantId: USER,
      reviewerEmail: 'admin@campusquestapp.com',
      allowlist: ['admin@campusquestapp.com'],
    })).toBe(false);
    expect(reviewerMayDecide({
      reviewerId: ADMIN,
      claimantId: USER,
      reviewerEmail: 'student@uri.edu',
      allowlist: ['admin@campusquestapp.com'],
    })).toBe(false);
    expect(membershipElevationAllowed('authenticated', 'admin')).toBe(false);
    expect(membershipElevationAllowed('authenticated', 'owner')).toBe(false);
    expect(membershipElevationAllowed('authenticated', 'member')).toBe(true);
  });

  it('lets an allowlisted admin approve or reject someone else', () => {
    expect(reviewerMayDecide({
      reviewerId: ADMIN,
      claimantId: USER,
      reviewerEmail: 'Admin@CampusQuestApp.com',
      allowlist: ['admin@campusquestapp.com'],
    })).toBe(true);
    expect(membershipElevationAllowed('service_role', 'admin')).toBe(true);
  });

  it('shows the pricing states in review order', () => {
    expect(clubOfferState({ signedIn: false, pending: false, rejected: false, approved: false, active: false })).toBe('signed-out');
    expect(clubOfferState({ signedIn: true, pending: true, rejected: false, approved: false, active: false })).toBe('pending');
    expect(clubOfferState({ signedIn: true, pending: false, rejected: true, approved: false, active: false })).toBe('rejected');
    expect(clubOfferState({ signedIn: true, pending: true, rejected: false, approved: true, active: false })).toBe('approved');
    expect(clubOfferState({ signedIn: true, pending: false, rejected: false, approved: true, active: true })).toBe('active');
  });
});

describe('Founding Club checkout eligibility', () => {
  const ready = {
    authenticated: true,
    demo: false,
    organizationId: ORG,
    organizationExists: true,
    approvedRepresentative: true,
    claimStatus: 'approved' as const,
    accessActive: false,
    checkoutConfigured: true,
  };

  it('blocks unverified, pending, and rejected users', () => {
    expect(clubCheckoutEligibility({ ...ready, approvedRepresentative: false, claimStatus: null })).toEqual({ ok: false, reason: 'unverified' });
    expect(clubCheckoutEligibility({ ...ready, approvedRepresentative: false, claimStatus: 'pending' })).toEqual({ ok: false, reason: 'pending' });
    expect(clubCheckoutEligibility({ ...ready, approvedRepresentative: false, claimStatus: 'rejected' })).toEqual({ ok: false, reason: 'rejected' });
  });

  it('allows an approved representative when the organization has no active access', () => {
    expect(clubCheckoutEligibility(ready)).toEqual({ ok: true });
  });

  it('rejects an unknown organization, an active window, a demo account, and a closed checkout', () => {
    expect(clubCheckoutEligibility({ ...ready, organizationId: 'not-an-id', organizationExists: false })).toEqual({ ok: false, reason: 'organization' });
    expect(clubCheckoutEligibility({ ...ready, accessActive: true })).toEqual({ ok: false, reason: 'active' });
    expect(clubCheckoutEligibility({ ...ready, demo: true })).toEqual({ ok: false, reason: 'demo' });
    expect(clubCheckoutEligibility({ ...ready, checkoutConfigured: false })).toEqual({ ok: false, reason: 'closed' });
    expect(checkoutBlockMessage('demo')).toContain('not available for this account');
  });

  it('treats an expired window as eligible and keeps an active window closed', () => {
    const paid = '2026-09-27T12:00:00.000Z';
    const window = foundingClubWindow(new Date(paid));
    expect(Date.parse(window.endsAt) - Date.parse(window.startsAt)).toBe(90 * 24 * 60 * 60 * 1000);
    expect(clubAccessActive(window.startsAt, window.endsAt, Date.parse(paid) + 1000)).toBe(true);
    expect(clubAccessActive(window.startsAt, window.endsAt, Date.parse(window.endsAt))).toBe(false);
    expect(clubGrantDecision({
      applied: false,
      storedEndsAt: window.endsAt,
      accessEndsAt: window.endsAt,
      paidAt: paid,
    }).writeAccess).toBe(false);
    expect(clubGrantDecision({
      applied: true,
      storedEndsAt: window.endsAt,
      accessEndsAt: null,
      paidAt: new Date(Date.parse(window.endsAt) + 1000).toISOString(),
    }).writeAccess).toBe(false);
    expect(clubGrantDecision({
      applied: false,
      storedEndsAt: foundingClubWindow(new Date(Date.parse(window.endsAt) + 1000)).endsAt,
      accessEndsAt: window.endsAt,
      paidAt: new Date(Date.parse(window.endsAt) + 1000).toISOString(),
    }).writeAccess).toBe(true);
  });
});
