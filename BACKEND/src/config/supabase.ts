import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

// Standard Supabase client for public / authenticated operations
export const supabase: SupabaseClient = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Admin / Service role client for privileged backend workflows
export const supabaseAdmin: SupabaseClient = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function getScopedSupabaseClient(accessToken?: string): SupabaseClient {
  if (!accessToken) return supabase;
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
