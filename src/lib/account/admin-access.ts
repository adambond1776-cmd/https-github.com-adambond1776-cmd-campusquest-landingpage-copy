import { normalizeEmail } from '@/lib/signup-email-policy';

export type AdminRouteDecision = 'sign-in' | 'deny' | 'allow';

export type AdminDashboardItem = {
  href: string;
  title: string;
  detail: string;
  status: string;
};

/**
 * CampusQuest operators are the GM_ADMIN_EMAILS allowlist.
 * profiles.role is a game role and is not an admin privilege.
 */
export function isAllowlistedAdminEmail(
  email: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return allowlist.some((entry) => normalizeEmail(entry) === normalized);
}

export function adminRouteDecision(input: {
  signedIn: boolean;
  email: string | null;
  allowlist: readonly string[];
}): AdminRouteDecision {
  if (!input.signedIn) return 'sign-in';
  if (!isAllowlistedAdminEmail(input.email, input.allowlist)) return 'deny';
  return 'allow';
}

/** Student login lands on /welcome. An allowlisted admin lands on the control panel instead. */
export function adminPostLoginPath(input: { admin: boolean; resolvedNext: string }): string {
  if (input.admin && input.resolvedNext === '/welcome') return '/admin';
  return input.resolvedNext;
}

export function signedInAccountLinks(admin: boolean): { href: string; label: string }[] {
  const links = [
    { href: '/saved', label: 'Saved' },
    { href: '/settings', label: 'Account' },
  ];
  if (admin) links.unshift({ href: '/admin', label: 'Admin Dashboard' });
  return links;
}

export function adminDashboardItems(input: {
  pendingRepresentatives: number | null;
  clubReview: boolean;
}): AdminDashboardItem[] {
  const pending = input.pendingRepresentatives;
  const items: AdminDashboardItem[] = [
    {
      href: '/admin/club-representatives',
      title: 'Club representative requests',
      detail:
        'Review proof and approve or reject organization representative claims. A payment does not grant this status.',
      status: pending === null ? 'Open review' : pending === 0 ? 'None waiting' : `${pending} pending`,
    },
    {
      href: '/admin/genius-mining',
      title: 'Genius Mining',
      detail: 'Pathway coverage and questionnaire operations for the instrument.',
      status: 'Open',
    },
  ];
  if (input.clubReview) {
    items.push({
      href: '/clubs/review',
      title: 'Organization page review',
      detail: 'Review club pages submitted in the test organization workspace.',
      status: 'Review',
    });
  }
  return items;
}
