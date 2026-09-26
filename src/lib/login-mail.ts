import { mailFrom, resendApiKey } from '@/lib/env';

export function buildLoginEmailText(link: string): string {
  return [
    'CampusQuest',
    '',
    'Sign in',
    '',
    'Open this link to return to your existing account:',
    '',
    link,
    '',
    'This link works once and expires shortly.',
    '',
    "If you didn't ask to sign in, you can ignore this email.",
  ].join('\n');
}

export async function sendLoginEmail(args: { to: string; link: string }): Promise<void> {
  const apiKey = resendApiKey();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: mailFrom(),
    to: [args.to],
    subject: 'Your CampusQuest login link',
    text: buildLoginEmailText(args.link),
  });

  if (error) {
    const failure = new Error(error.message || 'Resend rejected the login email.') as Error & {
      code?: string;
    };
    failure.code = error.name || (error.statusCode == null ? undefined : String(error.statusCode));
    throw failure;
  }
}
