'use server';

import { redirect } from 'next/navigation';
import { confirmGuardianConsent } from '@/lib/guardian-consent';

export async function approveGuardianConsent(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const result = await confirmGuardianConsent(token);
  redirect(`/guardian/confirm?done=${result.state}`);
}
