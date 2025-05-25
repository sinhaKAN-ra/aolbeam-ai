import { useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from '@/lib/supabase/client';

export function useSupabase(): SupabaseClient {
  // Using the singleton instance from @/lib/supabase/client
  return useMemo(() => supabase, []);
}
