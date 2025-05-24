
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useSupabase } from '../hooks/useSupabase'; // Import the custom hook
import Header from './Header';
import type { UserProfile } from '@/types';

export default function HeaderWrapper() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabase(); // Use the custom hook
  const router = useRouter();

  const fetchUserProfileHeader = useCallback(async (userId: string) => {
    console.log(`HeaderWrapper: Attempting to fetch profile for user ${userId}`);
    setIsLoading(true); // Set loading true at the start of fetch
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

  useEffect(() => {
    console.log('HeaderWrapper: Setting up auth state listener');
    setIsLoading(true); // Start with loading true

    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('HeaderWrapper: Initial session:', session);
      if (session?.user) {
        await fetchUserProfileHeader(session.user.id);
      } else {
        setUserProfile(null);
        setIsLoading(false); // No user, so profile loading is done
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('HeaderWrapper: Auth state changed:', event, session);
        if (session?.user) {
          await fetchUserProfileHeader(session.user.id);
        } else {
          setUserProfile(null);
          setIsLoading(false); // No user, profile loading done
        }
      }
    );

    return () => {
      console.log('HeaderWrapper: Cleaning up auth listener');
      subscription?.unsubscribe();
    };
  }, [supabase, fetchUserProfileHeader]);

  const handleSignOut = async () => {
    console.log('HeaderWrapper: Sign out initiated');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserProfile(null); // Clear profile on sign out
      router.push('/'); // Redirect to home
      // router.refresh(); // This might be causing issues, can be removed if not strictly needed
    } catch (error) {
      console.error('HeaderWrapper: Error during sign out:', error);
      throw error; // Re-throw to be caught by Header.tsx if needed
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
