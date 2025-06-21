'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/hooks/useSupabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useSupabase();

  // Get initial session
  useEffect(() => {
    console.log('AuthProvider: Initializing auth state');
    let mounted = true;

    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session');
        const { data: { user: initialUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('AuthProvider: Error getting initial session:', error);
          throw error;
        }
        
        console.log('AuthProvider: Initial session:', initialUser ? {
          user: initialUser?.email,
        } : 'Not found');

        if (mounted) {
          if (initialUser) {
            setUser(initialUser);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AuthProvider: Error getting initial session:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        console.log('AuthProvider: Auth state changed:', {
          event,
          user: session?.user?.email,
        });
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
            setUser(null);
          }
          setIsLoading(false);

          // Handle specific auth events
          if (event === 'SIGNED_IN') {
            console.log('AuthProvider: User signed in, refreshing page');
            router.refresh();
          } else if (event === 'SIGNED_OUT') {
            console.log('AuthProvider: User signed out, clearing state');
            setUser(null);
            setUser(null);
            router.refresh();
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('AuthProvider: Token refreshed');
            router.refresh();
          }
        }
      }
    );

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [router, supabase.auth]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      // Always use localhost for development
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const origin = isLocalhost 
        ? `http://localhost:${window.location.port || 9002}`
        : window.location.origin;
      const redirectTo = `${origin}/auth/callback`;
      
      // Generate a random state parameter for security
      const state = Math.random().toString(36).substring(7);
      
      // Store the state in sessionStorage before the OAuth flow starts
      sessionStorage.setItem('oauth_state', state);
      
      // Get the current path to redirect back after sign in
      const redirectAfterSignIn = window.location.pathname + window.location.search;
      
      // Create a URLSearchParams object to handle the state parameter
      const searchParams = new URLSearchParams();
      searchParams.set('state', state);
      searchParams.set('redirectTo', redirectAfterSignIn);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectTo}?${searchParams.toString()}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('AuthProvider: Google sign in error:', error);
        // Clean up the state on error
        sessionStorage.removeItem('oauth_state');
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      
      console.log('AuthProvider: Google sign in initiated:', data);
      // The redirect will happen automatically
    } catch (error) {
      console.error('AuthProvider: Error signing in with Google:', error);
      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Failed to sign in with Google',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, supabase.auth]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear user data from state
      setUser(null);
      setUser(null);
      
      // Clear local storage data
      localStorage.removeItem('aolbeamGuestInteractionCount');
      localStorage.removeItem('aolbeamHistory_guest');
      
      // Refresh the page to reset the UI
      router.refresh();
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
      toast({
        title: 'Sign out failed',
        description: error instanceof Error ? error.message : 'Failed to sign out',
        variant: 'destructive',
      });
      throw error;
    }
  }, [router, toast, supabase.auth]);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: newUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      setUser(newUser);
      setUser(newUser);
      return newUser;
    } catch (error) {
      console.error('AuthProvider: Error refreshing session:', error);
      return null;
    }
  }, [supabase.auth]);

  const value = useMemo(() => ({
    user,
    isLoading,
    signInWithGoogle,
    signOut,
    refreshUser,
  }), [user, isLoading, signInWithGoogle, signOut, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
