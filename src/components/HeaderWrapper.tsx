'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase, useSession } from '../hooks/useSupabase';
import Header from './Header';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';

export default function HeaderWrapper() {
  const { session, loading: authLoading } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabase();
  const router = useRouter();

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!userId) return null;
    
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
  }, [supabase]);

  // Update user profile when session changes
  useEffect(() => {
    const updateUserProfile = async () => {
      if (!session?.user) {
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error updating user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updateUserProfile();
  }, [session, fetchUserProfile]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUserProfile(null);
      
      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error during sign out:', error);
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
