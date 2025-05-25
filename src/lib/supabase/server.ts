import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from './database.types';

export function createClient() {
  return createServerComponentClient<Database>({ cookies });
}
