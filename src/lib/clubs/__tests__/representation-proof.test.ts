import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PROOF_MAX_BYTES,
  assessRepresentativeProof,
  canReadProof,
  inspectProofFile,
  proofPathAllowed,
  proofStoragePath,
} from '@/lib/clubs/representation-proof';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '44444444-4444-4444-8444-444444444444';
const FILE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

describe('representative proof', () => {
  it('refuses a note by itself', () => {
    const result = assessRepresentativeProof({
      role: 'President',
      officialEmail: '',
      verificationUrl: '',
      note: 'An existing representative can confirm me.',
      hasUpload: false,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts an official email, a public link, or an upload', () => {
    expect(assessRepresentativeProof({
      role: 'Treasurer', officialEmail: 'clubname@uri.edu', verificationUrl: '', note: '', hasUpload: false,
    }).ok).toBe(true);
    expect(assessRepresentativeProof({
      role: '', officialEmail: '', verificationUrl: 'https://web.uri.edu/clubs/officers', note: '', hasUpload: false,
    }).ok).toBe(true);
    expect(assessRepresentativeProof({
      role: '', officialEmail: '', verificationUrl: '', note: '', hasUpload: true,
    }).ok).toBe(true);
  });

  it('does not treat a payment link as proof', () => {
    const result = assessRepresentativeProof({
      role: '',
      officialEmail: '',
      verificationUrl: 'https://checkout.stripe.com/c/pay/cs_test',
      note: '',
      hasUpload: false,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts png, jpeg, and pdf bytes and rejects other types', () => {
    expect(inspectProofFile({ type: 'image/png', size: PNG.byteLength, bytes: PNG }).ok).toBe(true);
    expect(inspectProofFile({ type: 'image/jpeg', size: JPEG.byteLength, bytes: JPEG }).ok).toBe(true);
    expect(inspectProofFile({ type: 'application/pdf', size: PDF.byteLength, bytes: PDF }).ok).toBe(true);
    expect(inspectProofFile({ type: 'image/gif', size: 4, bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38]) })).toEqual({
      ok: false,
      message: 'Proof files must be a PNG, JPG, or PDF.',
    });
    expect(inspectProofFile({ type: 'image/png', size: PDF.byteLength, bytes: PDF }).ok).toBe(false);
  });

  it('rejects a file larger than 10 MB', () => {
    expect(inspectProofFile({ type: 'image/png', size: PROOF_MAX_BYTES + 1, bytes: PNG })).toEqual({
      ok: false,
      message: 'Proof files must be 10 MB or smaller.',
    });
  });

  it('keeps storage paths inside the claimant folder', () => {
    const path = proofStoragePath(OWNER, 'png');
    expect(proofPathAllowed(path, OWNER)).toBe(true);
    expect(proofPathAllowed(path, OTHER)).toBe(false);
    expect(proofPathAllowed(`${OTHER}/${FILE}.png`, OWNER)).toBe(false);
    expect(proofPathAllowed(`${OWNER}/../${OTHER}/${FILE}.png`, OWNER)).toBe(false);
    expect(proofPathAllowed(`${OWNER}/officer listing.png`, OWNER)).toBe(false);
  });

  it('lets the claimant and an admin read proof, and blocks everyone else', () => {
    expect(canReadProof({ readerId: OWNER, ownerId: OWNER, admin: false })).toBe(true);
    expect(canReadProof({ readerId: OTHER, ownerId: OWNER, admin: true })).toBe(true);
    expect(canReadProof({ readerId: OTHER, ownerId: OWNER, admin: false })).toBe(false);
  });

  it('stores proof in a private bucket', () => {
    const sql = readFileSync('supabase/migrations/20260927203000_representative_claim_proof.sql', 'utf8');
    expect(sql).toContain("'representative-proofs'");
    expect(sql).toContain('public = false');
    expect(sql).not.toMatch(/to anon/);
    expect(sql).not.toMatch(/to public/);
    expect(sql).not.toContain('proof_bytes');
  });
});
