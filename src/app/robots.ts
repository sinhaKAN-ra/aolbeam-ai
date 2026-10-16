import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/admin/', '/profile', '/account/', '/history', '/chat/', '/learning-paths', '/login', '/signup'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
