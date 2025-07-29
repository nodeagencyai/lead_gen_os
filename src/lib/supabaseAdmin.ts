import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcHd0dmxnbmZ0bGFibWxpZ3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3NzYzOCwiZXhwIjoyMDY5MjUzNjM4fQ.2jlXp3PUe8lkjsvw6DTOuBkSOAmzRjkEGOVXHZTv0MU';

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL');
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