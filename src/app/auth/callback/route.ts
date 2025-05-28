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
    
    console.log('Auth Callback: Received request with:', {
      code: code ? 'present' : 'missing',
      error,
      errorDescription
    });

    // Handle OAuth errors
    if (error) {
      console.error('Auth Callback: OAuth error:', { error, errorDescription });
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
          errorDescription || error
        )}`
      );
    }

    if (code) {
      console.log('Auth Callback: Attempting to exchange code for session');
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      try {
        const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Auth Callback: Error exchanging code:', exchangeError);
          return NextResponse.redirect(
            `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
              exchangeError.message
            )}`
          );
        }

        if (!session) {
          console.error('Auth Callback: No session returned after code exchange');
          return NextResponse.redirect(
            `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
              'No session returned after authentication'
            )}`
          );
        }

        console.log('Auth Callback: Successfully exchanged code for session:', {
          user: session.user?.email,
          expires_at: session.expires_at,
          access_token: session.access_token ? 'present' : 'missing'
        });

        // The session cookie is automatically set by the Supabase client
        // Redirect to the home page
        return NextResponse.redirect(requestUrl.origin);
      } catch (error) {
        console.error('Auth Callback: Error in code exchange:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
            error instanceof Error ? error.message : 'Failed to exchange code'
          )}`
        );
      }
    }

    console.log('Auth Callback: No code present, redirecting to home');
    return NextResponse.redirect(requestUrl.origin);
  } catch (error) {
    console.error('Auth Callback: Unexpected error:', error);
    return NextResponse.redirect(
      `${new URL(request.url).origin}/auth/error?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )}`
    );
  }
}
