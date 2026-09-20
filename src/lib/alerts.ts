import { Resend } from 'resend';
import { alertRecipients, alertsConfigured, mailFrom, resendApiKey } from '@/lib/env';

export type AlertSeverity = 'critical' | 'action_required' | 'warning' | 'info';

export type OperatorAlert = {
  severity: AlertSeverity;
  subject: string;
  body: string;
  participantCode?: string;
};

export type DeliveryResult = { delivered: boolean; detail: string };

function render(alert: OperatorAlert): string {
  const lines = [
    `Severity: ${alert.severity.toUpperCase()}`,
    alert.participantCode ? `Participant: ${alert.participantCode}` : null,
    `Time: ${new Date().toISOString()}`,
    '',
    alert.body,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Sends an operational alert to the Genius Mining alert group.
 *
 * Never throws. Callers use this on paths where the alert is the safety net —
 * a de-identification failure blocks a purge and alerts — so an alert that
 * itself failed must not take down the caller's error handling. It always logs,
 * so an undelivered alert is still recoverable from the platform logs.
 */
export async function sendOperatorAlert(alert: OperatorAlert): Promise<DeliveryResult> {
  const body = render(alert);
  const subject = `[Genius Mining] ${alert.subject}`;

  const logLine = `${subject}\n${body}`;
  if (alert.severity === 'critical' || alert.severity === 'action_required') {
    console.error(logLine);
  } else {
    console.warn(logLine);
  }

  if (!alertsConfigured()) {
    return {
      delivered: false,
      detail: 'RESEND_API_KEY is not set; the alert was logged only.',
    };
  }

  try {
    const resend = new Resend(resendApiKey());
    const { error } = await resend.emails.send({
      from: mailFrom(),
      to: alertRecipients(),
      subject,
      text: body,
    });

    if (error) {
      console.error(`[Genius Mining] alert delivery failed: ${error.message}`);
      return { delivered: false, detail: error.message };
    }

    return { delivered: true, detail: `Sent to ${alertRecipients().join(', ')}.` };
  } catch (error) {
    const detail = (error as Error).message;
    console.error(`[Genius Mining] alert delivery threw: ${detail}`);
    return { delivered: false, detail };
  }
}

/**
 * The day-7 and day-25 warnings before identified data is deleted.
 *
 * The copy states plainly that deletion is permanent and that coming back means
 * retaking the questionnaire, because a student who reads this and assumes their
 * answers are recoverable has been misled.
 */
/**
 * Sends a plain email, logging instead when Resend is not configured.
 *
 * Local development has no key, and a missing key should not turn a sign-up
 * into an error page. The message goes to the console so the flow can still be
 * followed end to end.
 */
async function send(to: string, subject: string, body: string): Promise<DeliveryResult> {
  if (!alertsConfigured()) {
    console.warn(`[CampusQuest] would email ${to}: ${subject}\n${body}`);
    return { delivered: false, detail: 'RESEND_API_KEY is not set; the email was logged only.' };
  }

  try {
    const resend = new Resend(resendApiKey());
    const { error } = await resend.emails.send({ from: mailFrom(), to: [to], subject, text: body });
    if (error) return { delivered: false, detail: error.message };
    return { delivered: true, detail: `Sent to ${to}.` };
  } catch (error) {
    return { delivered: false, detail: (error as Error).message };
  }
}

/**
 * Asks a parent or guardian to approve a 16 or 17 year old's account.
 *
 * Written to be read by someone who has never heard of CampusQuest and is
 * suspicious of an unexpected email about their child, because that is the
 * common case. It says who we are, what the account can do, what it cannot do,
 * and how to make it stop — before it asks for anything.
 */
export async function sendGuardianRequest(options: {
  guardianEmail: string;
  guardianName: string;
  studentEmail: string;
  confirmUrl: string;
  operator: string;
}): Promise<DeliveryResult> {
  const { guardianEmail, guardianName, studentEmail, confirmUrl, operator } = options;

  const body = [
    `Hello ${guardianName},`,
    '',
    `${studentEmail} signed up for CampusQuest and told us they are under 18, so we need`,
    'your say-so before their account opens.',
    '',
    'WHAT CAMPUSQUEST IS',
    'A directory of clubs, events and home games at Rhode Island universities. It is run by',
    `${operator}.`,
    '',
    'WHAT THEIR ACCOUNT CAN DO',
    '  - Browse and search campus clubs, events and athletics schedules',
    '  - Save activities they are interested in',
    '  - Tell us when a listing is out of date',
    '',
    'WHAT IT CANNOT DO, BECAUSE THEY ARE UNDER 18',
    '  - No paid subscription. Their account is free and cannot be charged.',
    '  - No Genius Mining. That is our questionnaire about strengths and interests,',
    '    which involves long-form writing analysed by an AI service. It is 18+ only',
    '    and their account cannot reach it.',
    '',
    'WHAT WE STORE ABOUT THEM',
    'Their email address, their campus, the activities they save, and the year they were',
    'born. Not a full date of birth. We do not sell personal information.',
    '',
    'TO APPROVE, FOLLOW THIS LINK:',
    confirmUrl,
    '',
    'The link works once and expires in 14 days.',
    '',
    'TO REFUSE: ignore this email. Nothing opens and the request lapses on its own. You can',
    'also reply to this message and we will delete what we hold about them.',
    '',
    'You can withdraw your approval at any time by replying to this email.',
    '',
    'Full policies: privacy and terms are linked from the bottom of every page on our site.',
  ].join('\n');

  return send(guardianEmail, 'Approve a CampusQuest account for your student', body);
}

/** Tells the student their account is open, once the guardian has confirmed. */
export async function sendGuardianApproved(studentEmail: string): Promise<DeliveryResult> {
  const body = [
    'Good news — your parent or guardian approved your CampusQuest account.',
    '',
    'The activity directory is open to you now. Sign in and take a look at what is on',
    'at your campus this week.',
    '',
    'A reminder of what stays closed until you turn 18: paid plans and Genius Mining.',
    'Everything else works.',
  ].join('\n');

  return send(studentEmail, 'Your CampusQuest account is open', body);
}

export async function sendRetentionWarning(options: {
  to: string;
  day: 7 | 25;
  daysUntilPurge: number;
}): Promise<DeliveryResult> {
  const { to, day, daysUntilPurge } = options;

  const subject =
    day === 7
      ? 'Your Genius Mining profile will be deleted in 23 days'
      : `Last reminder: your Genius Mining profile is deleted in ${daysUntilPurge} days`;

  const body = [
    'Your CampusQuest membership has ended, so your Genius Mining profile, your saved',
    `answers and your recommendations are scheduled for deletion in ${daysUntilPurge} days.`,
    '',
    'Deletion is permanent. If you come back later you take the questionnaire again from',
    "the start — we won't have your old answers to restore.",
    '',
    'If you downloaded or printed your profile, that copy is yours and stays yours.',
    '',
    'Restarting your membership before then cancels the deletion and nothing is lost.',
    '',
    'The anonymized copy described when you started is not part of this deletion. It holds the',
    'structure of your answers and none of the words you wrote, carries no name or email, and is',
    'kept to improve the questionnaire.',
  ].join('\n');

  if (!alertsConfigured()) {
    console.warn(`[Genius Mining] would email ${to}: ${subject}`);
    return { delivered: false, detail: 'RESEND_API_KEY is not set; the warning was logged only.' };
  }

  try {
    const resend = new Resend(resendApiKey());
    const { error } = await resend.emails.send({
      from: mailFrom(),
      to: [to],
      subject,
      text: body,
    });

    if (error) return { delivered: false, detail: error.message };
    return { delivered: true, detail: `Sent to ${to}.` };
  } catch (error) {
    return { delivered: false, detail: (error as Error).message };
  }
}
