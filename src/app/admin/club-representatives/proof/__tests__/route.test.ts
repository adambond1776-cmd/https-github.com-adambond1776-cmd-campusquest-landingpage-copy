import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '44444444-4444-4444-8444-444444444444';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const CLAIM = '55555555-5555-4555-8555-555555555555';
const FILE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';

const sessionPrivileges = vi.hoisted(() => vi.fn());
const download = vi.hoisted(() => vi.fn());
const claim = vi.hoisted(() => {
  const owner = '11111111-1111-4111-8111-111111111111';
  const file = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  return {
    user_id: owner,
    proof_storage_path: `${owner}/${file}`,
    proof_file_name: 'roster.png',
    proof_mime_type: 'image/png',
  };
});

vi.mock('@/lib/session', () => ({ sessionPrivileges }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { ...claim }, error: null }),
        }),
      }),
    }),
    storage: { from: () => ({ download }) },
  }),
}));

import { GET } from '../route';

function signedIn(userId: string, email: string) {
  sessionPrivileges.mockResolvedValue({
    state: 'signed-in',
    userId,
    email,
    privileges: { verified: true, plan: 'free', interests: false },
  });
}

beforeEach(() => {
  download.mockReset();
  download.mockResolvedValue({ data: new Blob(['proof']), error: null });
  claim.user_id = OWNER;
  claim.proof_storage_path = `${OWNER}/${FILE}`;
  claim.proof_file_name = 'roster.png';
  claim.proof_mime_type = 'image/png';
  vi.stubEnv('GM_ADMIN_EMAILS', 'admin@campusquestapp.com');
});

describe('private representative proof', () => {
  it('lets an admin download proof without a public file URL', async () => {
    signedIn(ADMIN, 'admin@campusquestapp.com');
    const response = await GET(new Request(`http://localhost/admin/club-representatives/proof?claim=${CLAIM}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(download).toHaveBeenCalledWith(`${OWNER}/${FILE}`);
    expect(response.headers.get('content-disposition')).not.toContain('http');
  });

  it('blocks another student from a claimant proof file', async () => {
    signedIn(OTHER, 'student@uri.edu');
    const response = await GET(new Request(`http://localhost/admin/club-representatives/proof?claim=${CLAIM}`));
    expect(response.status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });

  it('refuses a stored path outside the claimant folder', async () => {
    signedIn(OWNER, 'rep@uri.edu');
    claim.proof_storage_path = `../${OTHER}/${FILE}`;
    const response = await GET(new Request(`http://localhost/admin/club-representatives/proof?claim=${CLAIM}`));
    expect(response.status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });
});
