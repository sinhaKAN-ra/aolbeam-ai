'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import Header from './Header';

export default function HeaderWrapper() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const supabase = useSupabase();

  useEffect(() => {
    console.log('HeaderWrapper: Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('HeaderWrapper: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshSession();
          router.refresh();
        } else if (event === 'SIGNED_OUT') {
          router.refresh();
        }
      }
    );

    return () => {
      console.log('HeaderWrapper: Cleaning up auth subscription');
      subscription?.unsubscribe();
    };
  }, [router, refreshSession]);

  return <Header />;
}
