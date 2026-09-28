import { adminEmails } from '@/lib/env';
import { reviewerMayDecide } from '@/lib/clubs/representation';
import { canReadProof, proofPathAllowed, PROOF_BUCKET } from '@/lib/clubs/representation-proof';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { createAdminClient } from '@/lib/supabase/admin';
import { sessionPrivileges } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Private proof download. The address is not a public file URL. */
export async function GET(request: Request): Promise<Response> {
  const claimId = new URL(request.url).searchParams.get('claim') ?? '';
  if (!isCanonicalRecordId(claimId)) return new Response('Not found', { status: 404 });
  const session = await sessionPrivileges();
  if (session.state !== 'signed-in') return new Response('Not found', { status: 404 });
  const admin = createAdminClient();
  if (!admin) return new Response('Not found', { status: 404 });
  const claim = await admin
    .from('organization_representative_claims')
    .select('user_id, proof_storage_path, proof_file_name, proof_mime_type')
    .eq('id', claimId)
    .maybeSingle();
  const path = claim.data?.proof_storage_path;
  const ownerId = claim.data?.user_id;
  if (claim.error || typeof path !== 'string' || typeof ownerId !== 'string') return new Response('Not found', { status: 404 });
  const adminReader = reviewerMayDecide({
    reviewerId: session.userId,
    claimantId: ownerId,
    reviewerEmail: session.email,
    allowlist: adminEmails(),
  });
  if (!canReadProof({ readerId: session.userId, ownerId, admin: adminReader }) || !proofPathAllowed(path, ownerId)) {
    return new Response('Not found', { status: 404 });
  }
  const downloaded = await admin.storage.from(PROOF_BUCKET).download(path);
  if (downloaded.error || !downloaded.data) return new Response('Not found', { status: 404 });
  const mime = claim.data?.proof_mime_type === 'image/png' || claim.data?.proof_mime_type === 'image/jpeg' || claim.data?.proof_mime_type === 'application/pdf'
    ? claim.data.proof_mime_type
    : 'application/octet-stream';
  const filename = safeDownloadName(claim.data?.proof_file_name, path);
  return new Response(downloaded.data, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function safeDownloadName(name: string | null | undefined, path: string): string {
  const extension = path.split('.').pop() || 'bin';
  const clean = (name ?? `proof.${extension}`).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
  return clean || `proof.${extension}`;
}
