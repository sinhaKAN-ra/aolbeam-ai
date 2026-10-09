// src/app/auth/callback/route.ts

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const cookieStore = await cookies();
    const storedReturnPath = cookieStore.get('aolbeam-auth-next')?.value;
    const redirectTo = requestUrl.searchParams.get('redirectTo') || (storedReturnPath ? decodeURIComponent(storedReturnPath) : '/');

    // Handle OAuth errors
    if (error) {
      console.error('Auth callback error:', error, errorDescription);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
      );
    }

    if (!code) {
      console.error('No code present in callback');
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent('No code present in callback')}`
      );
    }

    const supabase = await createSupabaseServerClient();

    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent(sessionError.message)}`
      );
    }

    if (!session) {
      console.error('No session returned after code exchange');
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent('No session returned')}`
      );
    }

    // Keep the post-login redirect on the same origin as the completed login.
    const destination = new URL(redirectTo, requestUrl.origin);
    const safeDestination = destination.origin === requestUrl.origin ? destination : new URL('/', requestUrl.origin);
    // Returning to login/signup would immediately redirect again; go home instead.
    if (['/login', '/signup', '/auth/callback'].includes(safeDestination.pathname)) {
      safeDestination.pathname = '/';
      safeDestination.search = '';
    }
    const response = NextResponse.redirect(safeDestination);
    response.cookies.delete('aolbeam-auth-next');
    // The Supabase SSR client sets its project-specific session cookies during exchange.

    return response;
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(
      `${new URL(request.url).origin}/auth/error?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
