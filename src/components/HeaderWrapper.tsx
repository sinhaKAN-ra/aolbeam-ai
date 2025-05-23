'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { useSupabase } from '../hooks/useSupabase';
import Header from './Header';
import type { UserProfile } from '@/types';

export default function HeaderWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabase();
  const router = useRouter();

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    console.log('HeaderWrapper: Setting up auth state listener');
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session);
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('User found, fetching profile...');
          const profile = await fetchUserProfile(session.user.id);
          console.log('Fetched profile:', profile);
          setUserProfile(profile);
        } else {
          console.log('No user session found');
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('Auth change - user found, fetching profile...');
          const profile = await fetchUserProfile(session.user.id);
          console.log('Auth change - fetched profile:', profile);
          setUserProfile(profile);
        } else {
          console.log('Auth change - no user session');
          setUserProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth listener');
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    console.log('HeaderWrapper: Sign out initiated');
    try {
      console.log('HeaderWrapper: Attempting to sign out from Supabase');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('HeaderWrapper: Supabase sign out successful, updating local state');
      setUser(null);
      setUserProfile(null);
      
      console.log('HeaderWrapper: Redirecting to home page');
      router.push('/');
      router.refresh();
      
      console.log('HeaderWrapper: Sign out flow completed');
    } catch (error) {
      console.error('HeaderWrapper: Error during sign out:', error);
      throw error;
    }
  };

  return (
    <Header 
      userProfile={userProfile} 
      isLoadingProfile={isLoading} 
      onSignOut={handleSignOut} 
    />
  );
}
