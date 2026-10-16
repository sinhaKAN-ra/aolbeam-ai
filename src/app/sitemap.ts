import type { MetadataRoute } from 'next';
import { PUBLIC_SITE_PATHS, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITE_PATHS.map(path => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }));
}
