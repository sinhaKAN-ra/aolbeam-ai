
import { useMemo } from 'react';
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs';

let supabaseInstance: SupabaseClient | null = null;

export function useSupabase(): SupabaseClient {
  return useMemo(() => {
    if (!supabaseInstance) {
      // This check is more for Node.js environments; in browser, it's less critical for createClientComponentClient
      // but good practice if this hook were ever used server-side (which it shouldn't be for client components).
      if (typeof window !== 'undefined') {
         supabaseInstance = createClientComponentClient();
      } else {
        // Fallback for non-browser environments, though createClientComponentClient is browser-only.
        // This branch should ideally not be hit in a pure client component context.
        // Consider throwing an error or returning a mock client if server-side usage is impossible.
        console.warn("useSupabase hook: Attempted to create Supabase client outside of browser environment. This might not work as expected.");
        // For safety, returning a dummy or minimally functional client, or throwing an error might be better.
        // However, createClientComponentClient itself will likely throw if window is not defined.
        // Let's rely on createClientComponentClient's behavior.
        supabaseInstance = createClientComponentClient();
      }
      console.log('useSupabase: Supabase client initialized (once).');
    }
    return supabaseInstance;
  }, []);
}
