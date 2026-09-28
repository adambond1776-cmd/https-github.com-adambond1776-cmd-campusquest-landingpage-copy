'use server';

import { revalidatePath } from 'next/cache';
import { adminEmails } from '@/lib/env';
import { reviewerMayDecide } from '@/lib/clubs/representation';
import { notifyRepresentativeRejection } from '@/lib/clubs/representation-mail';
import { reviewRepresentativeClaim } from '@/lib/clubs/representation-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { sessionPrivileges } from '@/lib/session';

export async function decideRepresentativeClaim(formData: FormData): Promise<void> {
  const decision = formData.get('decision') === 'rejected' ? 'rejected' : formData.get('decision') === 'approved' ? 'approved' : null;
  const claimId = String(formData.get('claim') ?? '');
  if (!decision || !claimId) return;
  const session = await sessionPrivileges();
  if (session.state !== 'signed-in') return;
  const admin = createAdminClient();
  if (!admin) return;
  const claim = await admin.from('organization_representative_claims').select('user_id, contact_email, organization_id').eq('id', claimId).maybeSingle();
  if (claim.error || !claim.data?.user_id) return;
  if (!reviewerMayDecide({
    reviewerId: session.userId,
    claimantId: claim.data.user_id,
    reviewerEmail: session.email,
    allowlist: adminEmails(),
  })) return;
  const reason = String(formData.get('note') ?? '').trim().slice(0, 1000);
  const reviewed = await reviewRepresentativeClaim({
    claimId,
    reviewerId: session.userId,
    decision,
    note: reason,
  });
  if (reviewed.ok && decision === 'rejected' && typeof claim.data.contact_email === 'string') {
    const organization = await admin.from('external_organizations').select('name').eq('id', claim.data.organization_id).maybeSingle();
    await notifyRepresentativeRejection({
      to: claim.data.contact_email,
      organizationName: typeof organization.data?.name === 'string' ? organization.data.name : 'the organization',
      reason: reason || null,
    });
  }
  revalidatePath('/admin/club-representatives');
  revalidatePath('/clubs/represent');
}
