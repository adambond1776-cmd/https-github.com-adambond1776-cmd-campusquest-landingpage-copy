import { NextResponse, type NextRequest } from 'next/server';
import { getReportStore } from '@/lib/activities/report-store';
import { verifyResolve } from '@/lib/activities/resolve-links';
import { rewardStateFor } from '@/lib/activities/reports';
import type { ReportStatus } from '@/lib/activities/reports';

export const dynamic = 'force-dynamic';

/**
 * Resolves one student correction from the link in the operator's email.
 *
 * A GET that changes something is normally a mistake, because a link preview or
 * a prefetcher can fire it. It is the right shape here anyway: the whole point
 * is that the queue can be cleared by tapping a button in a mail client, and a
 * form post cannot be delivered by email. The risk is bounded — the signature
 * makes the link unguessable, resolving twice is a no-op, and either outcome
 * can be corrected by following the other link.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title: string, detail: string, tone: 'good' | 'bad'): NextResponse {
  const color = tone === 'good' ? '#34d399' : '#f87171';
  const safeTitle = escapeHtml(title);
  const safeDetail = escapeHtml(detail);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${safeTitle}</title></head>
<body style="margin:0;background:#0b1020;color:#fff;font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px">
<div style="max-width:32rem">
<h1 style="color:${color};font-size:1.35rem;margin:0 0 12px">${safeTitle}</h1>
<p style="color:rgba(255,255,255,.7);margin:0">${safeDetail}</p>
</div></body></html>`;

  return new NextResponse(html, {
    status: tone === 'good' ? 200 : 400,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const id = params.get('id') ?? '';
  const status = params.get('status') ?? '';
  const token = params.get('token') ?? '';

  if (!id || !verifyResolve(id, status, token)) {
    return page(
      'That link is not valid',
      'It may have been truncated by a mail client, or the signing secret may have changed. Resolve the report by hand instead.',
      'bad'
    );
  }

  const store = getReportStore();

  try {
    await store.resolve(id, status as ReportStatus, 'email-link', null);

    if (status !== 'confirmed') {
      return page('Marked as not a problem', 'The report is closed and no credit was given.', 'good');
    }

    // Confirmed reports are what earn credit, so the reply says where the
    // student now stands rather than making someone go and look it up.
    const queue = await store.queue();
    const report = queue.find((row) => row.id === id);
    const owed = report ? rewardStateFor(await store.byReporter(report.reporter_hash)) : null;

    const detail = owed
      ? `The report is confirmed. That student now has ${owed.unspent} unspent confirmed correction${owed.unspent === 1 ? '' : 's'}${owed.unspent >= 3 ? ' — a free month is owed.' : '.'}`
      : 'The report is confirmed and counts towards that student\u2019s free month.';

    return page('Confirmed', detail, 'good');
  } catch (error) {
    return page('Could not save that', (error as Error).message, 'bad');
  }
}
