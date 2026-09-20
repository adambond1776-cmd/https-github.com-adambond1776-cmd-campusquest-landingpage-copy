import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

const paths = [
  '/',
  '/activities',
  '/signup',
  '/login',
  '/institutions',
  '/method',
  '/privacy',
  '/terms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl;
  if (!base) return [];

  return paths.map((path) => ({
    url: `${base}${path === '/' ? '' : path}`,
    lastModified: new Date(),
  }));
}
