'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import Header from './Header';
import type { UserProfile } from '@/types';

export default function HeaderWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
          } else {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error in profile fetch:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const router = useRouter();

  const handleSignOut = useCallback(async () => {
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
      router.refresh(); // Force a refresh to ensure the UI updates
      
      console.log('HeaderWrapper: Sign out flow completed');
    } catch (error) {
      console.error('HeaderWrapper: Error during sign out:', error);
      throw error; // Re-throw to be caught by the Header component
    }
  }, [supabase, router]);

  return (
    <Header 
      userProfile={userProfile} 
      isLoadingProfile={isLoading} 
      onSignOut={handleSignOut} 
    />
  );
}
