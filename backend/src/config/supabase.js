import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';
import WebSocket from 'ws';

// Polyfill native WebSocket for Node environments < 22 (like Railway's default)
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

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
