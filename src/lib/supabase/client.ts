import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

// Create a single supabase client for the entire app
const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default supabase
