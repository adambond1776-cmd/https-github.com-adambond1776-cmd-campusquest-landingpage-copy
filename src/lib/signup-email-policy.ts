/**
 * Who may create a student account on the landing-page signup.
 *
 * Pilot students use @uri.edu. A comma-separated QA allowlist can opt in
 * specific non-URI addresses without opening every domain.
 */

export const SCHOOL_EMAIL_REQUIRED_MESSAGE =
  'Use your URI email address (@uri.edu) to create a CampusQuest account.';

export const PILOT_SCHOOL_DOMAIN = 'uri.edu';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
}

function approvedQaSignupEmails(): string[] {
  const raw = process.env.QA_SIGNUP_EMAIL ?? process.env.APPROVED_QA_SIGNUP_EMAILS ?? '';
  return raw
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function isApprovedQaSignupEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return approvedQaSignupEmails().includes(normalized);
}

export function isPilotSchoolSignupEmail(email: string): boolean {
  return emailDomain(email) === PILOT_SCHOOL_DOMAIN;
}

export function isAllowedStudentSignupEmail(email: string): boolean {
  return isPilotSchoolSignupEmail(email) || isApprovedQaSignupEmail(email);
}

export function studentSignupEmailRejection(email: string): string | null {
  if (isAllowedStudentSignupEmail(email)) return null;
  return SCHOOL_EMAIL_REQUIRED_MESSAGE;
}
