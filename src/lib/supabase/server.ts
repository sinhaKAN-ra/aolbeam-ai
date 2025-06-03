import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './database.types';

export function createSupabaseServerClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => (await cookies()).get(name)?.value,
        set: async (name: string, value: string, options: any) => {
          (await cookies()).set({ name, value, ...options });
        },
        remove: async (name: string, options: any) => {
          (await cookies()).set({ name, value: '', ...options });
        },
      },

    }
  );
}
