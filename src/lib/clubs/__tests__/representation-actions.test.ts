import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const getUser = vi.hoisted(() => vi.fn());
const insert = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn(async (_path: string) => ({ error: null })));
const remove = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const loadClubCheckoutFacts = vi.hoisted(() => vi.fn());
const reviewRepresentativeClaim = vi.hoisted(() => vi.fn());
const notifyRepresentativeClaim = vi.hoisted(() => vi.fn(async () => {}));
const notifyRepresentativeRejection = vi.hoisted(() => vi.fn(async () => {}));
const from = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, from: () => ({ insert }) }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from,
    storage: { from: () => ({ upload, remove }) },
  }),
}));

vi.mock('@/lib/clubs/representation-mail', () => ({
  notifyRepresentativeClaim,
  notifyRepresentativeRejection,
}));

vi.mock('@/lib/clubs/representation-store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/clubs/representation-store')>('@/lib/clubs/representation-store');
  return {
    ...actual,
    loadClubCheckoutFacts,
    reviewRepresentativeClaim,
    submitRepresentativeClaim: async (
      db: { from: () => { insert: typeof insert } },
      input: {
        organizationId: string;
        note: string | null;
        roleTitle: string | null;
        officialEmail: string | null;
        verificationUrl: string | null;
        proofStoragePath: string | null;
      },
    ) => {
      const { error } = await db.from().insert({
        status: 'pending',
        organization_id: input.organizationId,
        note: input.note,
        role_title: input.roleTitle,
        official_email: input.officialEmail,
        verification_url: input.verificationUrl,
        proof_storage_path: input.proofStoragePath,
      });
      if (error?.code === '23505') return { ok: false, message: 'Verification pending' };
      return { ok: true };
    },
  };
});

vi.mock('@/lib/session', () => ({
  sessionPrivileges: vi.fn(),
}));

import { requestRepresentativeAccess } from '@/app/clubs/represent/actions';
import { decideRepresentativeClaim } from '@/app/admin/club-representatives/actions';
import { sessionPrivileges } from '@/lib/session';

const ORG = '22222222-2222-4222-8222-222222222222';
const USER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '33333333-3333-4333-8333-333333333333';

function requestForm(fields: Record<string, string | File> = {}) {
  const form = new FormData();
  form.set('organizationId', ORG);
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => {
  getUser.mockReset();
  insert.mockReset();
  upload.mockClear();
  remove.mockClear();
  loadClubCheckoutFacts.mockReset();
  reviewRepresentativeClaim.mockReset();
  notifyRepresentativeClaim.mockClear();
  notifyRepresentativeRejection.mockClear();
  from.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: USER, email: 'rep@uri.edu' } } });
  loadClubCheckoutFacts.mockResolvedValue({
    organizationExists: true,
    approvedRepresentative: false,
    claimStatus: null,
    accessActive: false,
  });
  insert.mockResolvedValue({ error: null });
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: table === 'external_organizations' ? { id: ORG } : null, error: null }) }),
        maybeSingle: async () => ({ data: { user_id: USER }, error: null }),
      }),
    }),
  }));
  reviewRepresentativeClaim.mockResolvedValue({ ok: true });
  vi.mocked(sessionPrivileges).mockResolvedValue({
    state: 'signed-in',
    userId: ADMIN,
    email: 'admin@campusquestapp.com',
    privileges: { verified: true, plan: 'free', interests: false },
  } as never);
  vi.stubEnv('GM_ADMIN_EMAILS', 'admin@campusquestapp.com');
});

describe('representative request and review actions', () => {
  it('does not submit a note without proof', async () => {
    const result = await requestRepresentativeAccess(requestForm({ note: 'The current president can confirm me.' }));
    expect(result).toEqual({ ok: false, message: 'Provide at least one form of verification.' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('accepts an official organization email as proof', async () => {
    const result = await requestRepresentativeAccess(requestForm({ role: 'Treasurer', officialEmail: 'Club@URI.edu' }));
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      organization_id: ORG,
      role_title: 'Treasurer',
      official_email: 'club@uri.edu',
    }));
    expect(upload).not.toHaveBeenCalled();
    expect(notifyRepresentativeClaim).toHaveBeenCalledWith(expect.objectContaining({
      methods: ['official organization email'],
    }));
  });

  it('accepts a verification URL as proof', async () => {
    const result = await requestRepresentativeAccess(requestForm({
      verificationUrl: 'https://uri.campuslabs.com/engage/organization/outing',
    }));
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      verification_url: 'https://uri.campuslabs.com/engage/organization/outing',
    }));
    expect(notifyRepresentativeClaim).toHaveBeenCalledWith(expect.objectContaining({
      methods: ['URInvolved organization/officer URL'],
    }));
  });

  it('stores a valid upload on a generated private path', async () => {
    const file = new File([PNG], 'officer listing.png', { type: 'image/png' });
    const result = await requestRepresentativeAccess(requestForm({ proof: file }));
    expect(result.ok).toBe(true);
    const path = upload.mock.calls[0]?.[0] as string;
    expect(path.startsWith(`${USER}/`)).toBe(true);
    expect(path.endsWith('.png')).toBe(true);
    expect(path).not.toContain('officer');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ proof_storage_path: path }));
  });

  it('rejects a file whose type is not png, jpg, or pdf', async () => {
    const file = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], 'proof.gif', { type: 'image/gif' });
    const result = await requestRepresentativeAccess(requestForm({ proof: file }));
    expect(result).toEqual({ ok: false, message: 'Proof files must be a PNG, JPG, or PDF.' });
    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects an oversized proof file', async () => {
    const file = new File([PNG], 'roster.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 });
    const result = await requestRepresentativeAccess(requestForm({ proof: file }));
    expect(result).toEqual({ ok: false, message: 'Proof files must be 10 MB or smaller.' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not create a second pending claim', async () => {
    insert.mockResolvedValue({ error: { code: '23505' } });
    const result = await requestRepresentativeAccess(requestForm({ officialEmail: 'club@uri.edu' }));
    expect(result).toEqual({ ok: false, message: 'Verification pending' });
  });

  it('does not let the claimant approve the claim', async () => {
    vi.mocked(sessionPrivileges).mockResolvedValue({
      state: 'signed-in',
      userId: USER,
      email: 'rep@uri.edu',
      privileges: { verified: true, plan: 'free', interests: false },
    } as never);
    const form = new FormData();
    form.set('claim', 'claim-1');
    form.set('decision', 'approved');
    await decideRepresentativeClaim(form);
    expect(reviewRepresentativeClaim).not.toHaveBeenCalled();
  });

  it('lets an admin approve, which records the review decision', async () => {
    const form = new FormData();
    form.set('claim', 'claim-1');
    form.set('decision', 'approved');
    await decideRepresentativeClaim(form);
    expect(reviewRepresentativeClaim).toHaveBeenCalledWith(expect.objectContaining({
      claimId: 'claim-1',
      reviewerId: ADMIN,
      decision: 'approved',
    }));
  });

  it('lets an admin reject without granting a representative role', async () => {
    const form = new FormData();
    form.set('claim', 'claim-1');
    form.set('decision', 'rejected');
    await decideRepresentativeClaim(form);
    expect(reviewRepresentativeClaim).toHaveBeenCalledWith(expect.objectContaining({ decision: 'rejected' }));
    expect(insert).not.toHaveBeenCalled();
  });
});
