import type { Session } from '@supabase/supabase-js'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  experience: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  environments: string[]
  media: string[]
  favorite_strain: string | null
  first_grow: boolean
  light_type: 'led' | 'hps' | 'cfl' | 'sun' | 'mixed' | null
  space: string | null
  pinned_badges: string[]
  reputation: number
  is_admin: boolean
  is_banned: boolean
  accepted_terms_at: string | null
  created_at: string
}

const session = shallowRef<Session | null>(null)
const profile = ref<Profile | null>(null)
const ready = ref(false)
/** set when a signed-out user tries to write; the sign-in sheet watches it */
const signInPrompt = ref(false)
let started = false

let profileSeq = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
let retryDelay = 2000

/** Loads the signed-in profile; on a network error the last good profile stays and the load retries. */
async function loadProfile(): Promise<void> {
  const uid = session.value?.user.id
  const seq = ++profileSeq
  clearTimeout(retryTimer)
  if (!uid) {
    profile.value = null
    return
  }
  if (profile.value && profile.value.id !== uid) profile.value = null
  const { data, error } = await useSupabase().from('profiles').select('*').eq('id', uid).maybeSingle()
  // signed out, switched account or a newer load started meanwhile
  if (seq !== profileSeq || session.value?.user.id !== uid) return
  if (error) {
    retryTimer = setTimeout(() => loadProfile().catch(() => {}), retryDelay)
    retryDelay = Math.min(retryDelay * 2, 60000)
    return
  }
  retryDelay = 2000
  profile.value = (data as Profile | null) ?? null
}

export const AUTH_RETURN_KEY = 'bb.auth.returnTo'
export const NATIVE_AUTH_REDIRECT = 'budbuddy://app/auth-callback'

/** Starts Google OAuth; `returnTo` is where the callback page sends the user afterwards. */
async function signInWithGoogle(returnTo?: string) {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, returnTo ?? location.pathname + location.search)
  } catch { /* storage blocked */ }
  const sb = useSupabase()
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true }
    })
    if (error) throw error
    if (data.url) await Browser.open({ url: data.url })
    return
  }
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/auth/callback` }
  })
  if (error) throw error
}

export function useAuth() {
  if (!started && import.meta.client) {
    started = true
    const sb = useSupabase()
    sb.auth.getSession().then(({ data }) => {
      session.value = data.session
      return loadProfile()
    }).finally(() => (ready.value = true))
    sb.auth.onAuthStateChange((event, s) => {
      const sameUser = !!s && s.user.id === session.value?.user.id
      session.value = s
      // token refreshes keep the same user; no need to refetch a loaded profile
      if (sameUser && event === 'TOKEN_REFRESHED' && profile.value) return
      // defer: supabase-js forbids awaiting its own calls inside this callback
      setTimeout(() => loadProfile().catch(() => {}), 0)
    })
    window.addEventListener('online', () => {
      if (session.value && !profile.value) loadProfile().catch(() => {})
    })
  }

  const user = computed(() => session.value?.user ?? null)
  const signedIn = computed(() => !!session.value)
  /** signed in and finished the first sign-in gate (18+, terms) */
  const accepted = computed(() => !!session.value && !!profile.value?.accepted_terms_at)

  /** True when signed in and terms are accepted; otherwise opens the sign-in / terms sheet. */
  function requireAuth(): boolean {
    if (accepted.value) return true
    if (session.value && !profile.value) {
      // signed in but the profile could not load (offline); retry instead of a dead sign-in prompt
      useNotify().notify(translate('auth.offline'), { tone: 'error' })
      loadProfile().catch(() => {})
      return false
    }
    signInPrompt.value = true
    return false
  }

  async function signOut() {
    await useSupabase().auth.signOut().catch(() => {})
    profileSeq++
    clearTimeout(retryTimer)
    session.value = null
    profile.value = null
  }

  return { session, user, profile, ready, signedIn, accepted, signInPrompt, requireAuth, loadProfile, signIn: signInWithGoogle, signOut }
}
