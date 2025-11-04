import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY; // Admin key for server-side operations

// Only create client if credentials are provided
let supabase: ReturnType<typeof createClient> | null = null;
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url' && supabaseAnonKey !== 'your-supabase-anon-key') {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Create admin client for server-side operations (only if service key is provided)
if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'your-supabase-url' && supabaseServiceKey !== 'your-supabase-service-key') {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { supabase, supabaseAdmin };

