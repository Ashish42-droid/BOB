import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

if (!config.supabase.url || !config.supabase.anonKey) {
  console.warn('⚠️ Supabase credentials missing from environment. Using local mock/fallback mode.');
}

// Client for general public/anon calls
export const supabase = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  config.supabase.anonKey || 'placeholder-key'
);

// Admin client for bypass operations in backend controller
export const supabaseAdmin = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  config.supabase.serviceRoleKey || config.supabase.anonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
