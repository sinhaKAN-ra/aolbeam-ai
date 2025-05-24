
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
  const supabase = useSupabase(); // Use the custom hook
  const router = useRouter();

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!userId) return null;
    
    try {
      let { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') { // Profile not found
        console.log(`HeaderWrapper: Profile not found for ${userId}, trigger might be pending or failed.`);
        // Optionally, attempt to create if absolutely necessary, or just rely on trigger
        // For now, we assume the trigger handles creation.
        profile = null;
      } else if (error) {
        throw error;
      }
      
      // If profile exists, but email/name is missing, try to update from auth user
      const authUser = (await supabase.auth.getUser()).data.user;
      if (profile && authUser && (!profile.email || !profile.full_name)) {
        const updates: Partial<UserProfile> = {};
        if (!profile.email && authUser.email) updates.email = authUser.email;
        if (!profile.full_name && (authUser.user_metadata?.full_name || authUser.email)) {
          updates.full_name = authUser.user_metadata?.full_name || authUser.email?.split('@')[0];
        }
        if (Object.keys(updates).length > 0) {
          console.log(`HeaderWrapper: Profile for ${userId} missing fields, attempting update:`, updates);
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
          if (updateError) console.error(`HeaderWrapper: Error updating profile with missing fields:`, updateError);
          else profile = updatedProfile;
        }
      }
      
      console.log(`HeaderWrapper: Fetched profile for ${userId}:`, profile);
      setUserProfile(profile as UserProfile | null);
    } catch (error) {
      console.error('HeaderWrapper: Error fetching user profile:', error);
      setUserProfile(null); // Clear profile on error
    } finally {
      setIsLoading(false); // Ensure loading is set to false
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
