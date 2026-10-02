export type ClaimQueueFilter = 'pending' | 'approved' | 'rejected' | 'all';

export function claimQueueFilter(value: string | undefined): ClaimQueueFilter {
  if (value === 'approved' || value === 'rejected' || value === 'all') return value;
  return 'pending';
}

export function claimQueueHref(filter: ClaimQueueFilter): string {
  if (filter === 'pending') return '/admin/club-representatives';
  return `/admin/club-representatives?status=${filter}`;
}
