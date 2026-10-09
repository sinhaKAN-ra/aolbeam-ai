import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FEATURES, isHiddenRoute } from '@/config/features';

// Public paths that don't require authentication
const publicPaths = [
  '/',
  '/tests',
  '/login',
  '/signup',
  '/auth/callback',
  '/pricing',
  '/about',
  '/contact-us',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/blog',
  '/chat',
  '/chat/*',
  '/api/auth/*',
  '/_next/static/*',
  '/_next/image/*',
  '/favicon.ico',
  '/((?!_next).*)',
];

export function middleware(req: NextRequest) {
  // Redirect deep links to hidden (not-yet-launched) features back home.
  const pathname = req.nextUrl.pathname;
  if (!FEATURES.payments && (
    /^\/api\/payments\/(create-order|create-paypal-order|store-paypal-order|cashfree\/create-order|lemonsqueezy\/create-checkout)(?:\/|$)/.test(pathname) ||
    /^\/api\/subscriptions\/(cashfree\/(create|create-subscription)|lemonsqueezy\/create)(?:\/|$)/.test(pathname)
  )) {
    return NextResponse.json({ error: 'Payments are unavailable for this release.' }, { status: 503 });
  }
  if (!pathname.startsWith('/api/') && isHiddenRoute(pathname)) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  // Skip middleware for public paths
  const path = req.nextUrl.pathname;
  if (publicPaths.some(p => 
    p.endsWith('/*') ? path.startsWith(p.slice(0, -2)) : path === p
  )) {
    return NextResponse.next();
  }

  // Check for Supabase auth session.
  // The auth cookie is named `sb-<project-ref>-auth-token`, where <project-ref>
  // is the subdomain of NEXT_PUBLIC_SUPABASE_URL. Derive it from env so nothing
  // is hardcoded (survives a Supabase project change). Falls back to a generic
  // `sb-` prefix if the URL is missing/malformed.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.match(/^https?:\/\/([^.]+)\./)?.[1];
  const cookieBaseName = projectRef ? `sb-${projectRef}-auth-token` : 'sb-';
  const allCookies = req.cookies.getAll();
  
  // Check for any cookie that starts with the base name
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.startsWith(cookieBaseName)
  );
  
  // Debug logging
  console.log('=== Middleware Debug ===');
  console.log('Request URL:', req.url);
  console.log('All cookies:', allCookies.map(c => ({
    name: c.name,
    value: c.value.length > 50 ? c.value.substring(0, 50) + '...' : c.value
  })));
  console.log('Looking for cookie base:', cookieBaseName);
  console.log('Has auth cookie:', hasAuthCookie);
  console.log('=======================');

  // If no auth cookie, redirect to login with return URL
  if (!hasAuthCookie) {
    // Skip auth check for API routes
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    
    console.log('No auth cookie found, redirecting to login');
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Specify which routes should be handled by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth/callback (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 