// Deliberately permissive: organizations sign up with business addresses, so
// requiring a .edu domain would lock out half the intended audience.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'That does not look like a valid email address.';
  return null;
}
