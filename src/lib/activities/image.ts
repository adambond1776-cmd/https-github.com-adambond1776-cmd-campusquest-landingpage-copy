/** Public Campus Labs CDN used by the canonical URInvolved sync. */
export const ACTIVITY_IMAGE_HOSTS = ['se-images.campuslabs.com'] as const;

/** Returns a displayable https image URL, or null when the value should not be rendered. */
export function activityImageUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!ACTIVITY_IMAGE_HOSTS.includes(url.hostname as (typeof ACTIVITY_IMAGE_HOSTS)[number])) return null;
  return url.toString();
}
