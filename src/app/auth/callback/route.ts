// src/app/auth/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const state = requestUrl.searchParams.get('state');
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/';

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

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });

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

    // Create a response that will redirect the user
    const response = NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
    
    // Set the session cookie
    response.cookies.set('sb-auth-token', session.access_token, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(
      `${new URL(request.url).origin}/auth/error?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
