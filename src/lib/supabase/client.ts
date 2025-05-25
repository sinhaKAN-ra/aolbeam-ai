import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types.js'; // Using explicit .js extension for ESM compatibility

// Create a single supabase client for the entire app
const supabase = createBrowserSupabaseClient<Database>();

export default supabase;
