import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { clubAccessActive } from '@/lib/clubs/founding-club';
import { clubOfferState, type ClaimStatus, type ClubOfferState } from '@/lib/clubs/representation';

const CLAIMS = 'organization_representative_claims';
const ACCESS = 'cq_club_founding_access';

export type ClubCheckoutFacts = {
  organizationExists: boolean;
  approvedRepresentative: boolean;
  claimStatus: ClaimStatus | null;
  accessActive: boolean;
};

export type RepresentativeClaim = {
  id: string;
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  roleTitle: string | null;
  officialEmail: string | null;
  verificationUrl: string | null;
  note: string | null;
  hasProofFile: boolean;
  logoUrl: string | null;
  status: ClaimStatus;
  submittedAt: string;
};

function missing(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === 'PGRST204';
}

export async function loadClubCheckoutFacts(userId: string, organizationId: string): Promise<ClubCheckoutFacts> {
  const empty = { organizationExists: false, approvedRepresentative: false, claimStatus: null, accessActive: false };
  if (!isCanonicalRecordId(organizationId)) return empty;
  const admin = createAdminClient();
  if (!admin) return empty;

  const organization = await admin.from('external_organizations').select('id').eq('id', organizationId).eq('is_active', true).maybeSingle();
  if (organization.error || !organization.data?.id) return empty;

  const claim = await admin.from(CLAIMS).select('status, submitted_at').eq('user_id', userId).eq('organization_id', organizationId).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
  const claimStatus = claim.error || !claim.data ? null : claim.data.status as ClaimStatus;

  const linked = await admin.from('student_organizations').select('id').eq('external_organization_id', organizationId).maybeSingle();
  let approvedRepresentative = false;
  if (!linked.error && linked.data?.id) {
    const member = await admin.from('organization_members').select('org_role, status').eq('organization_id', linked.data.id).eq('user_id', userId).maybeSingle();
    approvedRepresentative = !member.error && member.data?.status === 'approved' && (member.data.org_role === 'owner' || member.data.org_role === 'admin');
  }

  const access = await admin.from(ACCESS).select('starts_at, ends_at').eq('organization_id', organizationId).maybeSingle();
  const accessActive = !access.error && clubAccessActive(access.data?.starts_at ?? null, access.data?.ends_at ?? null);
  return { organizationExists: true, approvedRepresentative, claimStatus, accessActive };
}

export async function loadClubOfferState(userId: string | null): Promise<ClubOfferState> {
  if (!userId) return 'signed-out';
  const admin = createAdminClient();
  if (!admin) return clubOfferState({ signedIn: true, pending: false, rejected: false, approved: false, active: false });
  const claims = await admin.from(CLAIMS).select('status, organization_id').eq('user_id', userId);
  if (claims.error) {
    if (missing(claims.error)) return clubOfferState({ signedIn: true, pending: false, rejected: false, approved: false, active: false });
    return clubOfferState({ signedIn: true, pending: false, rejected: false, approved: false, active: false });
  }
  const rows = claims.data ?? [];
  const approvedIds = new Set<string>();
  const memberships = await admin.from('organization_members').select('organization_id, org_role, status').eq('user_id', userId).eq('status', 'approved');
  if (!memberships.error) {
    const studentIds = (memberships.data ?? []).filter((row) => row.org_role === 'owner' || row.org_role === 'admin').map((row) => row.organization_id);
    if (studentIds.length > 0) {
      const orgs = await admin.from('student_organizations').select('id, external_organization_id').in('id', studentIds);
      for (const org of orgs.data ?? []) {
        if (org.external_organization_id) approvedIds.add(org.external_organization_id);
      }
    }
  }
  let active = false;
  if (approvedIds.size > 0) {
    const access = await admin.from(ACCESS).select('organization_id, starts_at, ends_at').in('organization_id', [...approvedIds]);
    active = !access.error && (access.data ?? []).some((row) => clubAccessActive(row.starts_at, row.ends_at));
  }
  return clubOfferState({
    signedIn: true,
    pending: rows.some((row) => row.status === 'pending'),
    rejected: rows.some((row) => row.status === 'rejected'),
    approved: approvedIds.size > 0,
    active,
  });
}

export async function approvedOrganizationIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const memberships = await admin.from('organization_members').select('organization_id, org_role, status').eq('user_id', userId).eq('status', 'approved');
  if (memberships.error) return [];
  const studentIds = (memberships.data ?? []).filter((row) => row.org_role === 'owner' || row.org_role === 'admin').map((row) => row.organization_id);
  if (studentIds.length === 0) return [];
  const orgs = await admin.from('student_organizations').select('external_organization_id').in('id', studentIds);
  return (orgs.data ?? []).map((row) => row.external_organization_id).filter((id): id is string => typeof id === 'string');
}

export async function submitRepresentativeClaim(
  db: SupabaseClient,
  input: {
    userId: string;
    email: string;
    organizationId: string;
    note: string | null;
    roleTitle: string | null;
    officialEmail: string | null;
    verificationUrl: string | null;
    proofStoragePath: string | null;
    proofFileName: string | null;
    proofMimeType: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await db.from(CLAIMS).insert({
    user_id: input.userId,
    organization_id: input.organizationId,
    status: 'pending',
    note: input.note,
    role_title: input.roleTitle,
    official_email: input.officialEmail,
    verification_url: input.verificationUrl,
    proof_storage_path: input.proofStoragePath,
    proof_file_name: input.proofFileName,
    proof_mime_type: input.proofMimeType,
    contact_email: input.email,
    reviewed_at: null,
    reviewed_by: null,
  });
  if (!error) return { ok: true };
  if (error.code === '23505') return { ok: false, message: 'Verification pending' };
  if (missing(error)) return { ok: false, message: 'Representative requests are not available yet.' };
  return { ok: false, message: 'The request could not be saved.' };
}

export async function listRepresentativeClaims(
  filter: ClaimStatus | 'all' = 'pending',
): Promise<RepresentativeClaim[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  let query = admin
    .from(CLAIMS)
    .select('id, user_id, organization_id, note, role_title, official_email, verification_url, proof_storage_path, status, submitted_at, contact_email')
    .order('submitted_at', { ascending: true })
    .limit(100);
  if (filter !== 'all') query = query.eq('status', filter);
  const claims = await query;
  if (claims.error || !claims.data) return [];
  const orgIds = [...new Set(claims.data.map((row) => row.organization_id))];
  const userIds = [...new Set(claims.data.map((row) => row.user_id))];
  const orgs = orgIds.length
    ? await admin.from('external_organizations').select('id, name, logo_url').in('id', orgIds)
    : { data: [] };
  const profiles = userIds.length ? await admin.from('profiles').select('id, display_name').in('id', userIds) : { data: [] };
  const orgName = new Map((orgs.data ?? []).map((row) => [row.id, row.name]));
  const orgLogo = new Map((orgs.data ?? []).map((row) => [row.id, row.logo_url]));
  const person = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name]));
  return claims.data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.contact_email,
    name: person.get(row.user_id) || 'CampusQuest member',
    organizationId: row.organization_id,
    organizationName: orgName.get(row.organization_id) || 'Organization',
    roleTitle: row.role_title,
    officialEmail: row.official_email,
    verificationUrl: row.verification_url,
    note: row.note,
    hasProofFile: Boolean(row.proof_storage_path),
    logoUrl: typeof orgLogo.get(row.organization_id) === 'string' ? String(orgLogo.get(row.organization_id)) : null,
    status: row.status,
    submittedAt: row.submitted_at,
  }));
}

export async function listPendingClaims(): Promise<RepresentativeClaim[]> {
  return listRepresentativeClaims('pending');
}

export async function reviewRepresentativeClaim(input: {
  claimId: string;
  reviewerId: string;
  decision: 'approved' | 'rejected';
  note: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: 'Review is unavailable right now.' };
  const { error } = await admin.rpc('review_organization_representative_claim', {
    p_claim_id: input.claimId,
    p_reviewer_id: input.reviewerId,
    p_decision: input.decision,
    p_review_note: input.note ?? '',
  });
  if (error) return { ok: false, message: 'The claim could not be reviewed.' };
  return { ok: true };
}
