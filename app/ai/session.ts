// The signed-in user's access token for the AI endpoints (chat, kb-search, report-ai).
// supabase-js loads only when an AI request is made.

export type TokenSource = () => Promise<string | null>

const fromSupabase: TokenSource = async () => {
  const { useSupabase } = await import('~/composables/useSupabase')
  const { data } = await useSupabase().auth.getSession()
  return data.session?.access_token ?? null
}

let source: TokenSource = fromSupabase

/** null when signed out (or the session could not be read). */
export const aiAccessToken = (): Promise<string | null> => source().catch(() => null)

/** Tests swap the source; null restores the default. */
export function setAiTokenSource(fn: TokenSource | null): void {
  source = fn ?? fromSupabase
}

export const authHeader = (token: string | null): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {})
