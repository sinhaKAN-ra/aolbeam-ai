import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/pricing',
  '/about',
  '/contact',
  '/api/auth/*',
  '/_next/static/*',
  '/_next/image/*',
  '/favicon.ico',
  '/((?!_next).*)',
];

export function middleware(req: NextRequest) {
  // Skip middleware for public paths
  const path = req.nextUrl.pathname;
  if (publicPaths.some(p => 
    p.endsWith('/*') ? path.startsWith(p.slice(0, -2)) : path === p
  )) {
    return NextResponse.next();
  }

  // Check for Supabase auth session
  const cookieName = 'sb-jfgaaboxjjkbxjnqtzln-auth-token';
  const hasAuthCookie = req.cookies.has(cookieName);

  // If no auth cookie, redirect to login with return URL
  if (!hasAuthCookie) {
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