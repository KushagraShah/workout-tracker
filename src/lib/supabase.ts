import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when both Supabase env vars are present. The UI shows a setup hint when
 * this is false instead of crashing on a network call.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Fall back to placeholder values so createClient() does not throw at import
// time when the env vars are missing; the app gates on isSupabaseConfigured.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
