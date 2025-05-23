'use client';

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import Header from './Header';
import type { UserProfile } from '@/types';

export default function HeaderWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
  }, [supabase]);

  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      // Redirect to homepage after successful sign out
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
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
