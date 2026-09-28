import { randomUUID } from 'node:crypto';

export const PROOF_BUCKET = 'representative-proofs';
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const ROLE_TITLES = ['President', 'Vice President', 'Treasurer', 'Secretary', 'Club Officer', 'Advisor', 'Other'] as const;

const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
} as const;

export type ProofMime = keyof typeof MIME_EXT;

export type ProofAssessment = {
  ok: true;
  roleTitle: string | null;
  officialEmail: string | null;
  verificationUrl: string | null;
  note: string | null;
  methods: string[];
};

export function cleanRoleTitle(value: string): string | null {
  const role = value.trim();
  return (ROLE_TITLES as readonly string[]).includes(role) ? role : null;
}

export function cleanOfficialEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

/** Public officer pages and URInvolved links. Payment URLs are not proof. */
export function cleanVerificationUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (url.hostname === 'checkout.stripe.com') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function proofMethodLabels(input: { officialEmail: string | null; verificationUrl: string | null; hasUpload: boolean }): string[] {
  const methods: string[] = [];
  if (input.officialEmail) methods.push('official organization email');
  if (input.verificationUrl) {
    methods.push(/urinvolved|campuslabs\.com/i.test(input.verificationUrl)
      ? 'URInvolved organization/officer URL'
      : 'public officer/contact page URL');
  }
  if (input.hasUpload) methods.push('uploaded screenshot or document');
  return methods;
}

export function assessRepresentativeProof(input: {
  role: string;
  officialEmail: string;
  verificationUrl: string;
  note: string;
  hasUpload: boolean;
}): ProofAssessment | { ok: false; message: string } {
  const officialEmail = cleanOfficialEmail(input.officialEmail);
  const verificationUrl = input.verificationUrl.trim() ? cleanVerificationUrl(input.verificationUrl) : null;
  if (input.officialEmail.trim() && !officialEmail) {
    return { ok: false, message: 'Enter a valid official organization email.' };
  }
  if (input.verificationUrl.trim() && !verificationUrl) {
    return { ok: false, message: 'Verification links must start with https://.' };
  }
  const methods = proofMethodLabels({ officialEmail, verificationUrl, hasUpload: input.hasUpload });
  if (methods.length === 0) {
    return { ok: false, message: 'Provide at least one form of verification.' };
  }
  const note = input.note.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 500);
  return {
    ok: true,
    roleTitle: cleanRoleTitle(input.role),
    officialEmail,
    verificationUrl,
    note: note || null,
    methods,
  };
}

export function inspectProofFile(file: { type: string; size: number; bytes: Uint8Array }): { ok: true; mime: ProofMime; extension: string } | { ok: false; message: string } {
  if (file.size <= 0 || file.bytes.byteLength <= 0) return { ok: false, message: 'Choose a PNG, JPG, or PDF.' };
  if (file.size > PROOF_MAX_BYTES || file.bytes.byteLength > PROOF_MAX_BYTES) {
    return { ok: false, message: 'Proof files must be 10 MB or smaller.' };
  }
  const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (!(mime in MIME_EXT)) return { ok: false, message: 'Proof files must be a PNG, JPG, or PDF.' };
  const expected = mime as ProofMime;
  if (!magicMatches(expected, file.bytes)) return { ok: false, message: 'That file does not match its type.' };
  return { ok: true, mime: expected, extension: MIME_EXT[expected] };
}

export function proofStoragePath(ownerId: string, extension: string): string {
  return `${ownerId}/${randomUUID()}.${extension}`;
}

export function proofPathAllowed(path: string, ownerId: string): boolean {
  if (!path || path.includes('..') || path.includes('\\') || path.startsWith('/')) return false;
  const parts = path.split('/');
  if (parts.length !== 2 || parts[0] !== ownerId) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|pdf)$/i.test(parts[1] ?? '');
}

export function canReadProof(input: { readerId: string; ownerId: string; admin: boolean }): boolean {
  if (!input.readerId || !input.ownerId) return false;
  if (input.readerId === input.ownerId) return true;
  return input.admin;
}

function magicMatches(mime: ProofMime, bytes: Uint8Array): boolean {
  if (mime === 'image/png') {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}
