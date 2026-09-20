import { CAMPUS_EMAIL_CODE_TTL_SECONDS } from '@/lib/email-verification';
import { mailFrom, resendApiKey } from '@/lib/env';

export function buildCampusVerificationEmailText(code: string): string {
  const minutes = Math.round(CAMPUS_EMAIL_CODE_TTL_SECONDS / 60);
  return [
    'CampusQuest',
    '',
    'Verify your email',
    '',
    'Your verification code is:',
    '',
    code,
    '',
    `This code expires in ${minutes} minutes.`,
    '',
    "If you didn't request this code, you can ignore this email.",
  ].join('\n');
}

export async function sendCampusVerificationEmailViaResend(args: {
  to: string;
  code: string;
}): Promise<void> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: mailFrom(),
    to: [args.to],
    subject: 'Your CampusQuest verification code',
    text: buildCampusVerificationEmailText(args.code),
  });

  if (error) {
    throw new Error(error.message || 'Resend rejected the verification email.');
  }
}
