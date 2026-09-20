/**
 * Absolute origin for canonical URLs and social card images.
 *
 * Set NEXT_PUBLIC_SITE_URL for the production domain. On Vercel preview
 * deploys the platform-provided host is used so cards resolve there too.
 * When neither is present the metadata falls back to relative URLs.
 */
function resolve(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ?? process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;

  return undefined;
}

export const siteUrl = resolve();

/**
 * Absolute origin for emailed links. Production refuses to mint a URL that
 * would stringify as `undefined/...`. Local development falls back to the
 * documented dev origin.
 */
export function publicOrigin(): string | undefined {
  return siteUrl;
}

export const LOCAL_DEV_ORIGIN = 'http://localhost:43917';

/**
 * Social profiles, rendered only when configured.
 *
 * These used to be hardcoded icons pointing at `#`. A footer full of links that
 * go nowhere reads as an abandoned site, so an unset handle now renders nothing
 * at all rather than a dead link.
 */
export type SocialLink = { platform: 'instagram' | 'twitter' | 'linkedin'; href: string };

export function socialLinks(): SocialLink[] {
  const entries: Array<[SocialLink['platform'], string | undefined]> = [
    ['instagram', process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM?.trim()],
    ['twitter', process.env.NEXT_PUBLIC_SOCIAL_TWITTER?.trim()],
    ['linkedin', process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN?.trim()],
  ];

  return entries
    .filter((entry): entry is [SocialLink['platform'], string] => Boolean(entry[1]))
    .map(([platform, href]) => ({ platform, href }));
}
