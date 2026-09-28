'use server';

import { isDemoAccountEmail } from '@/lib/account/demo-account';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { activityImageUrl } from '@/lib/activities/image';
import { billingIdentity } from '@/lib/billing/identity';
import { createFoundingClubCheckout } from '@/lib/clubs/founding-club-checkout';
import { notifyRepresentativeClaim } from '@/lib/clubs/representation-mail';
import {
  PROOF_BUCKET,
  PROOF_MAX_BYTES,
  assessRepresentativeProof,
  inspectProofFile,
  proofStoragePath,
} from '@/lib/clubs/representation-proof';
import { loadClubCheckoutFacts, submitRepresentativeClaim } from '@/lib/clubs/representation-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sessionPrivileges } from '@/lib/session';

export type DirectoryOrganization = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  logoUrl: string | null;
};

export type RepresentResult = { ok: true; message: string } | { ok: false; message: string };
export type ClubCheckoutResult = { ok: true; url: string } | { ok: false; message: string };

export async function requestRepresentativeAccess(formData: FormData): Promise<RepresentResult> {
  const client = await createClient();
  if (!client) return { ok: false, message: 'Sign in before requesting representative access.' };
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user?.id || !user.email) return { ok: false, message: 'Sign in before requesting representative access.' };
  if (isDemoAccountEmail(user.email)) return { ok: false, message: 'Representative requests are not available for this account.' };
  const organizationId = String(formData.get('organizationId') ?? '');
  if (!isCanonicalRecordId(organizationId)) return { ok: false, message: 'Choose an organization from the directory.' };

  const upload = formData.get('proof');
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  const proof = assessRepresentativeProof({
    role: String(formData.get('role') ?? ''),
    officialEmail: String(formData.get('officialEmail') ?? ''),
    verificationUrl: String(formData.get('verificationUrl') ?? ''),
    note: String(formData.get('note') ?? ''),
    hasUpload: Boolean(file),
  });
  if (!proof.ok) return proof;

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: 'Representative requests are not available yet.' };
  const organization = await admin.from('external_organizations').select('id, name').eq('id', organizationId).eq('is_active', true).maybeSingle();
  if (organization.error || !organization.data?.id) return { ok: false, message: 'Choose an organization from the directory.' };

  const facts = await loadClubCheckoutFacts(user.id, organizationId);
  if (facts.approvedRepresentative) return { ok: false, message: 'You already represent this organization.' };
  if (facts.claimStatus === 'pending') return { ok: false, message: 'Verification pending' };

  let storagePath: string | null = null;
  let proofFileName: string | null = null;
  let proofMimeType: string | null = null;
  if (file) {
    if (file.size > PROOF_MAX_BYTES) return { ok: false, message: 'Proof files must be 10 MB or smaller.' };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectProofFile({ type: file.type, size: file.size, bytes });
    if (!inspected.ok) return inspected;
    storagePath = proofStoragePath(user.id, inspected.extension);
    const uploaded = await admin.storage.from(PROOF_BUCKET).upload(storagePath, bytes, {
      contentType: inspected.mime,
      upsert: false,
    });
    if (uploaded.error) return { ok: false, message: 'The proof file could not be saved.' };
    proofFileName = file.name.replace(/[^\w.\- ]+/g, '').slice(0, 120) || `proof.${inspected.extension}`;
    proofMimeType = inspected.mime;
  }

  const saved = await submitRepresentativeClaim(client, {
    userId: user.id,
    email: user.email,
    organizationId,
    note: proof.note,
    roleTitle: proof.roleTitle,
    officialEmail: proof.officialEmail,
    verificationUrl: proof.verificationUrl,
    proofStoragePath: storagePath,
    proofFileName,
    proofMimeType,
  });
  if (!saved.ok) {
    if (storagePath) await admin.storage.from(PROOF_BUCKET).remove([storagePath]);
    return saved;
  }
  await notifyRepresentativeClaim({
    organizationName: typeof organization.data.name === 'string' ? organization.data.name : 'the organization',
    claimantEmail: user.email,
    methods: proof.methods,
  });
  return { ok: true, message: 'Verification pending' };
}

/** Directory search for the representative page. Does not create or review a claim. */
export async function searchOrganizations(query: string): Promise<DirectoryOrganization[]> {
  const session = await sessionPrivileges();
  if (session.state !== 'signed-in') return [];
  const term = query.trim().slice(0, 80).replace(/[%_]/g, '');
  if (term.length < 2) return [];
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from('external_organizations')
    .select('id, name, description, category, logo_url')
    .eq('is_active', true)
    .ilike('name', `%${term}%`)
    .order('name')
    .limit(8);
  if (error || !data) return [];
  return data.flatMap((row) => {
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name || !isCanonicalRecordId(row.id)) return [];
    const description = typeof row.description === 'string' ? row.description.trim().slice(0, 180) : '';
    const category = typeof row.category === 'string' ? row.category.trim().slice(0, 80) : '';
    return [{
      id: row.id,
      name,
      description: description || null,
      category: category || null,
      logoUrl: activityImageUrl(typeof row.logo_url === 'string' ? row.logo_url : null),
    }];
  });
}

/** Starts one-time Founding Club checkout. The return URL does not grant access or ownership. */
export async function startFoundingClubCheckout(organizationId: string): Promise<ClubCheckoutResult> {
  if (!isCanonicalRecordId(organizationId)) {
    return { ok: false, message: 'Founding Club checkout could not find that organization.' };
  }
  try {
    const user = await billingIdentity();
    const url = await createFoundingClubCheckout(user.id, user.email, organizationId);
    return { ok: true, url };
  } catch (error) {
    const message = error instanceof Error && !('type' in error) ? error.message : '';
    return {
      ok: false,
      message: message.startsWith('Founding Club')
        ? message
        : 'Founding Club checkout could not be started. No access was granted.',
    };
  }
}
