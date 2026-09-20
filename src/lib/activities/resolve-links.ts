import { createHmac, timingSafeEqual } from 'node:crypto';
import { cronSecret } from '@/lib/env';
import type { ReportStatus } from '@/lib/activities/reports';

/**
 * Signed one-click links for resolving a student's correction from an inbox.
 *
 * There is no admin screen for the review queue yet, and the reward mechanic
 * only works if somebody actually marks reports confirmed — a student who is
 * promised a free month for three confirmed corrections and never gets one is
 * worse off than a student who was promised nothing. So the queue is worked
 * from email, and the email carries the two buttons that close the loop.
 *
 * The signature covers the report id and the outcome together, so a link for
 * one report cannot be edited into a link for another, and a "confirmed" link
 * cannot be turned into a "rejected" one.
 */

export const RESOLVABLE: ReportStatus[] = ['confirmed', 'rejected'];

function secret(): string | undefined {
  return cronSecret();
}

export function signResolve(id: string, status: ReportStatus): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac('sha256', key).update(`${id}:${status}`).digest('hex');
}

export function verifyResolve(id: string, status: string, token: string): boolean {
  if (!RESOLVABLE.includes(status as ReportStatus)) return false;

  const expected = signResolve(id, status as ReportStatus);
  if (!expected) return false;

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(token, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function resolveUrl(
  siteUrl: string,
  id: string,
  status: ReportStatus
): string | null {
  const token = signResolve(id, status);
  if (!token) return null;
  return `${siteUrl}/api/reports/resolve?id=${encodeURIComponent(id)}&status=${status}&token=${token}`;
}
