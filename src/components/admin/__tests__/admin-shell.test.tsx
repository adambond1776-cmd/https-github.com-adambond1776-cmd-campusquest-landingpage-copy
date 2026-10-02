import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminShell from '@/components/admin/AdminShell';
import { claimQueueFilter, claimQueueHref } from '@/components/admin/claim-queue';

describe('admin shell', () => {
  it('sends the back control to the public site and keeps the dashboard link', () => {
    const html = renderToStaticMarkup(<AdminShell current="claims">Queue</AdminShell>);
    expect(html).toContain('href="/"');
    expect(html).toContain('Back to CampusQuest');
    expect(html).toContain('href="/admin"');
    expect(html).toContain('Dashboard');
    expect(html).toContain('overflow-x-hidden');
    expect(html).not.toContain('ADMIN Admin dashboard');
  });

  it('defaults the claim queue to pending', () => {
    expect(claimQueueFilter(undefined)).toBe('pending');
    expect(claimQueueFilter('nope')).toBe('pending');
    expect(claimQueueFilter('approved')).toBe('approved');
    expect(claimQueueHref('pending')).toBe('/admin/club-representatives');
    expect(claimQueueHref('rejected')).toBe('/admin/club-representatives?status=rejected');
  });
});
