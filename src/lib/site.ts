// Set NEXT_PUBLIC_SITE_URL if the production domain changes.
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aolbeam.com').origin;
export const SITE_DESCRIPTION = 'Practice questions in maths, science, languages, humanities, business and coding. Learn with AI explanations, answer feedback and personal learning paths.';
export const PUBLIC_SITE_PATHS = ['/', '/practice', '/about', '/contact-us', '/privacy-policy', '/terms-of-service', '/refund-policy'];
