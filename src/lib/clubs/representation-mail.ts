import { Resend } from 'resend';
import { alertRecipients, alertsConfigured, mailFrom, resendApiKey } from '@/lib/env';
import { isProductionRuntime } from '@/lib/runtime';
import { LOCAL_DEV_ORIGIN, PRODUCTION_SITE_ORIGIN, publicOrigin } from '@/lib/site';

export function representativeReviewUrl(): string {
  const origin = isProductionRuntime() ? PRODUCTION_SITE_ORIGIN : (publicOrigin() ?? LOCAL_DEV_ORIGIN);
  return `${origin}/admin/club-representatives`;
}

export async function notifyRepresentativeClaim(input: {
  organizationName: string;
  claimantEmail: string;
  methods: string[];
}): Promise<void> {
  const methods = input.methods.length > 0 ? input.methods.join(', ') : 'none';
  const body = [
    `${input.claimantEmail} asked to represent ${input.organizationName}.`,
    `Proof provided: ${methods}.`,
    'The uploaded file is not attached. Review it in CampusQuest.',
    representativeReviewUrl(),
  ].join('\n');
  await deliver(alertRecipients(), 'Representative verification request', body);
}

export async function notifyRepresentativeRejection(input: {
  to: string;
  organizationName: string;
  reason: string | null;
}): Promise<void> {
  const reason = input.reason?.trim();
  const body = [
    `Your request to represent ${input.organizationName} was not approved.`,
    reason ? `Reason: ${reason}` : 'No additional reason was provided.',
    'Payment does not grant representative access. You can submit another request with proof of your role.',
  ].join('\n');
  await deliver([input.to], 'CampusQuest representative request', body);
}

async function deliver(to: string[], subject: string, body: string): Promise<void> {
  if (to.length === 0) return;
  if (!alertsConfigured()) {
    console.warn(`[CampusQuest] would email ${to.join(', ')}: ${subject}\n${body}`);
    return;
  }
  try {
    const resend = new Resend(resendApiKey());
    const { error } = await resend.emails.send({ from: mailFrom(), to, subject, text: body });
    if (error) console.error(`[CampusQuest] representative email failed: ${error.message}`);
  } catch (error) {
    console.error(`[CampusQuest] representative email failed: ${(error as Error).message}`);
  }
}
