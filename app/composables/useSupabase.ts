import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function useSupabase(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
    client = createClient(supabaseUrl as string, supabaseKey as string, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  }
  return client
}
