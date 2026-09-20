'use server';

import { sendOperatorAlert } from '@/lib/alerts';
import { getActivityStore } from '@/lib/activities/store';
import { getReportStore } from '@/lib/activities/report-store';
import {
  MAX_FREE_MONTHS_PER_TERM,
  REPORTS_PER_FREE_MONTH,
  canFileAnother,
  hashReporter,
  rewardStateFor,
  validateReport,
  type ActivityReport,
  type ReportInput,
  type ReportKind,
} from '@/lib/activities/reports';
import { validateEmail } from '@/lib/validation';
import { resolveUrl } from '@/lib/activities/resolve-links';
import { kindLabel } from '@/lib/activities/format';
import { siteUrl } from '@/lib/site';
import type { Activity } from '@/lib/activities/types';

export type ReportResult =
  | { ok: true; message: string; unspent: number; toNextReward: number }
  | { ok: false; message: string };

const KINDS: ReportKind[] = ['defunct', 'details_wrong', 'still_active', 'missing'];

/**
 * A student telling us the directory is wrong.
 *
 * Nothing here changes a listing. The report queues for a person, because one
 * student should not be able to delist a rival society and a hundred students
 * saying the same thing can be one person with a hundred addresses.
 */
export async function reportListing(input: {
  campusId: string;
  activityId: string | null;
  kind: string;
  detail: string;
  suggestedName?: string;
  email: string;
  notify: boolean;
}): Promise<ReportResult> {
  if (!KINDS.includes(input.kind as ReportKind)) {
    return { ok: false, message: 'We did not understand that report.' };
  }

  const emailError = validateEmail(input.email);
  if (emailError) return { ok: false, message: emailError };

  const payload: ReportInput = {
    campus_id: input.campusId,
    activity_id: input.activityId,
    kind: input.kind as ReportKind,
    detail: input.detail.trim(),
    suggested_name: input.suggestedName?.trim() || null,
    email: input.email.trim().toLowerCase(),
    notify: input.notify,
  };

  const valid = validateReport(payload);
  if (!valid.ok) return { ok: false, message: valid.error };

  // A report about a listing that does not exist is a bug on our side or a
  // stale tab on theirs; either way, saying so beats filing it.
  let activity: Activity | null = null;
  if (payload.activity_id) {
    activity = await getActivityStore().get(payload.activity_id);
    if (!activity) {
      return { ok: false, message: 'That listing is no longer here. Reload and try again.' };
    }
  }

  const store = getReportStore();
  const hash = hashReporter(payload.email);

  try {
    const open = await store.openByReporter(hash);
    const allowed = canFileAnother(open);
    if (!allowed.ok) return { ok: false, message: allowed.error };

    if (await store.duplicateOf(hash, payload.activity_id, payload.kind)) {
      return {
        ok: false,
        message: 'You have already told us about this one. It is in the queue.',
      };
    }

    const filed = await store.create({
      campus_id: payload.campus_id,
      activity_id: payload.activity_id,
      kind: payload.kind,
      detail: payload.detail,
      suggested_name: payload.suggested_name ?? null,
      reporter_hash: hash,
      reporter_email: payload.notify ? payload.email : null,
      created_at: new Date().toISOString(),
      status: 'pending',
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      credited: false,
    });

    await emailReport(filed, activity);

    const state = rewardStateFor(await store.byReporter(hash));

    return {
      ok: true,
      unspent: state.unspent,
      toNextReward: state.toNextReward,
      message: state.atCap
        ? `Thank you. You have already earned the maximum ${MAX_FREE_MONTHS_PER_TERM} free months this term, but the correction still helps everyone else.`
        : `Thank you. We will check it. ${REPORTS_PER_FREE_MONTH} confirmed corrections earn you a free month.`,
    };
  } catch (error) {
    console.error(`[activities] filing report failed: ${(error as Error).message}`);
    return { ok: false, message: 'We could not file that just now. Try again in a moment.' };
  }
}

/**
 * Emails one correction to the operator, with the two buttons that close it.
 *
 * Every report is emailed rather than batched, because the queue is worked from
 * an inbox and a report nobody sees is a promise nobody keeps. At the volumes
 * this runs at — a few a day across a state — one email each is the right
 * trade. If that stops being true, the fix is a digest, not silence.
 *
 * Never throws: a mail failure must not lose a student's report, which is
 * already safely in the store by the time this runs.
 */
async function emailReport(
  report: ActivityReport,
  activity: Activity | null
): Promise<void> {
  // Relative links are useless in an inbox, so without a configured origin the
  // email carries the details and the operator resolves by hand.
  const origin = siteUrl;
  const confirm = origin ? resolveUrl(origin, report.id, 'confirmed') : null;
  const reject = origin ? resolveUrl(origin, report.id, 'rejected') : null;

  const listing = activity
    ? [
        `Listing: ${activity.name}`,
        `  kind: ${kindLabel(activity)}`,
        `  status: ${activity.status}`,
        `  source: ${activity.source}`,
        activity.url ? `  url: ${activity.url}` : null,
        origin ? `  on CampusQuest: ${origin}/activities?q=${encodeURIComponent(activity.name)}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : `Listing: none — the student says something is missing${
        report.suggested_name ? ` ("${report.suggested_name}")` : ''
      }.`;

  const actions = confirm && reject
    ? [
        'RESOLVE FROM HERE',
        '',
        `  This is right, credit them:  ${confirm}`,
        `  Not a problem, close it:     ${reject}`,
        '',
        'Confirming is what earns the student credit towards a free month, so a',
        'report left sitting is a promise going unkept.',
      ].join('\n')
    : [
        'NO RESOLVE LINKS',
        '',
        origin
          ? 'CRON_SECRET is not set, so the one-click links could not be signed.'
          : 'NEXT_PUBLIC_SITE_URL is not set, so there is no origin to link to.',
        'Set it and future reports will be resolvable from the email.',
      ].join('\n');

  await sendOperatorAlert({
    severity: 'info',
    subject: `Directory correction: ${kindLabelForReport(report.kind)} at ${report.campus_id}`,
    body: [
      `What they say: ${report.kind}`,
      '',
      listing,
      '',
      `Their note: ${report.detail || '(none given)'}`,
      '',
      `Reporter: ${report.reporter_email ?? 'asked not to be contacted'}`,
      `Report id: ${report.id}`,
      '',
      actions,
    ].join('\n'),
  });
}

function kindLabelForReport(kind: ReportKind): string {
  const labels: Record<ReportKind, string> = {
    defunct: 'this club is dead',
    details_wrong: 'the details are wrong',
    still_active: 'this one is still going',
    missing: 'something is missing',
  };
  return labels[kind];
}

/**
 * Alert when the review queue grows past what one person clears in a sitting.
 *
 * Called by the ingest cron rather than on every submission, so a busy evening
 * does not send fifty emails.
 */
export async function alertOnQueueDepth(campusId: string, threshold = 25): Promise<void> {
  const queue = await getReportStore().queue(campusId);
  if (queue.length < threshold) return;

  await sendOperatorAlert({
    severity: 'action_required',
    subject: `${queue.length} directory corrections waiting for review`,
    body: [
      `${queue.length} student reports are unresolved for ${campusId}.`,
      '',
      'Students are told a confirmed correction earns them credit, so a queue that',
      'sits is a promise going unkept.',
    ].join('\n'),
  });
}
