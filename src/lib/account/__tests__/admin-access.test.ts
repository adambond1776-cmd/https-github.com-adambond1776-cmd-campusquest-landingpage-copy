import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { reviewerMayDecide } from '@/lib/clubs/representation';
import {
  adminDashboardItems,
  adminPostLoginPath,
  adminRouteDecision,
  isAllowlistedAdminEmail,
  signedInAccountLinks,
} from '@/lib/account/admin-access';

const PRIMARY_ADMIN = 'campusquest@campusquestapp.com';
const ALLOWLIST = [PRIMARY_ADMIN];

describe('admin access', () => {
  it('lets the configured admin reach /admin without a student onboarding record', () => {
    expect(adminRouteDecision({
      signedIn: true,
      email: PRIMARY_ADMIN,
      allowlist: ALLOWLIST,
    })).toBe('allow');
    expect(adminPostLoginPath({ admin: true, resolvedNext: '/welcome' })).toBe('/admin');
  });

  it('does not treat a normal student as an admin, even with an admin-looking role', () => {
    expect(isAllowlistedAdminEmail('ram@uri.edu', ALLOWLIST)).toBe(false);
    expect(adminRouteDecision({
      signedIn: true,
      email: 'ram@uri.edu',
      allowlist: ALLOWLIST,
    })).toBe('deny');
    expect(adminRouteDecision({
      signedIn: false,
      email: null,
      allowlist: ALLOWLIST,
    })).toBe('sign-in');
  });

  it('shows the admin dashboard link only for an authorized admin', () => {
    expect(signedInAccountLinks(true).map((link) => link.label)).toContain('Admin Dashboard');
    expect(signedInAccountLinks(true).some((link) => link.href === '/admin')).toBe(true);
    expect(signedInAccountLinks(false).some((link) => link.href === '/admin')).toBe(false);
  });

  it('links club representative approvals from the admin dashboard', () => {
    const items = adminDashboardItems({ pendingRepresentatives: 2, clubReview: false });
    const representatives = items.find((item) => item.href === '/admin/club-representatives');
    expect(representatives?.status).toBe('2 pending');
    expect(representatives?.cta).toBe('Review requests');
    expect(items.find((item) => item.href === '/admin/genius-mining')?.cta).toBe('Open operations');
    expect(reviewerMayDecide({
      reviewerId: 'admin-user',
      claimantId: 'student-user',
      reviewerEmail: PRIMARY_ADMIN,
      allowlist: ALLOWLIST,
    })).toBe(true);
    expect(reviewerMayDecide({
      reviewerId: 'student-user',
      claimantId: 'student-user',
      reviewerEmail: 'ram@uri.edu',
      allowlist: ALLOWLIST,
    })).toBe(false);
  });

  it('uses the support mailbox and does not keep the retired partnership address', () => {
    const retired = ['partners', '@campusquestapp.com'].join('');
    const root = process.cwd();
    const skip = new Set(['node_modules', '.next', '.next-build', '.git', 'coverage']);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (skip.has(entry) || (entry.startsWith('.env') && entry !== '.env.example')) continue;
        const full = path.join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|mjs|md|json|example)$/.test(entry) || entry === '.env.example') files.push(full);
      }
    };
    walk(root);
    const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(retired));
    expect(offenders).toEqual([]);
  });
});
