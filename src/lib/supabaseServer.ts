import { createServerClient as createSupabaseServerClientInternal } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient(useServiceRole = false) {
  const cookieStore = await cookies();
  
  const supabaseKey = useServiceRole 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(`Missing Supabase key. ${useServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'} is not set.`);
  }

  return createSupabaseServerClientInternal(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies; middleware refreshes them.
          }
        },
      },
    }
  );
}
