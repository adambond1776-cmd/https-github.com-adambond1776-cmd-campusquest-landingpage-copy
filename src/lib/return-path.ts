/** Same-origin relative paths only. A tampered next value cannot leave the site. */
export function safeReturnPath(value: string | null | undefined, fallback = '/welcome'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) {
    return fallback;
  }
  return value;
}
