'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/hooks/useSupabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting initial session:', error);
          throw error;
        }
        
        console.log('AuthProvider: Initial session:', initialSession ? {
          user: initialSession.user?.email,
          expires_at: initialSession.expires_at,
          access_token: initialSession.access_token ? 'present' : 'missing'
        } : 'Not found');

        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
          } else {
            setSession(null);
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AuthProvider: Error getting initial session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('AuthProvider: Auth state changed:', {
          event,
          user: newSession?.user?.email,
          expires_at: newSession?.expires_at,
          access_token: newSession?.access_token ? 'present' : 'missing'
        });
        
        if (mounted) {
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
          } else {
            setSession(null);
            setUser(null);
          }
          setIsLoading(false);

          // Handle specific auth events
          if (event === 'SIGNED_IN') {
            console.log('AuthProvider: User signed in, refreshing page');
            router.refresh();
          } else if (event === 'SIGNED_OUT') {
            console.log('AuthProvider: User signed out, clearing state');
            setSession(null);
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      // The redirect will happen automatically
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear user data from state
      setUser(null);
      setSession(null);
      
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

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      return newSession;
    } catch (error) {
      console.error('AuthProvider: Error refreshing session:', error);
      return null;
    }
  }, [supabase.auth]);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    signInWithGoogle,
    signOut,
    refreshSession,
  }), [user, session, isLoading, signInWithGoogle, signOut, refreshSession]);

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
