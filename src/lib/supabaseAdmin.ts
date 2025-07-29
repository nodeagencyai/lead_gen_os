import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration - ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY are set');
}

// This client bypasses RLS policies - use carefully
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Regular client for public operations
export const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY);