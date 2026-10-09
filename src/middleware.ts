import { createServerClient } from '@supabase/ssr';
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

export async function middleware(req: NextRequest) {
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

  // Refresh sessions for public pages too, and send rotated cookies to both
  // the browser and the server rendering this request.
  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: cookiesToSet => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          response.headers.set('Cache-Control', 'private, no-store');
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  const isPublic = publicPaths.some(p =>
    p.endsWith('/*') ? pathname.startsWith(p.slice(0, -2)) : pathname === p
  );
  if (!user && !isPublic && !pathname.startsWith('/api/')) {
    // A temporary auth-server outage should not discard a persisted session.
    if (error && (error.status === 0 || (error.status ?? 0) >= 500 || error.name === 'AuthRetryableFetchError')) {
      return response;
    }
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('redirect', pathname + req.nextUrl.search);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  }
  return response;
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