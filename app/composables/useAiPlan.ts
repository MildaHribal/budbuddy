import { Preferences } from '@capacitor/preferences'

export type AiTier = 'free' | 'unlimited' | 'admin'
/** Mirrors DAILY_LIMITS.free in supabase/functions/chat/gate.ts. */
export const FREE_LIMITS = { text: 5, photo: 3 } as const

interface Status { tier: AiTier, text: number, photo: number }

export const AI_TIER_KEY = 'budbuddy:ai-tier'
const KEY = AI_TIER_KEY
const status = ref<Status | null>(null)
const loading = ref(false)
const failed = ref(false)
let watching = false

/** The signed-in grower's AI plan and today's usage (rpc my_ai_status). */
export function useAiPlan() {
  const { signedIn, session } = useAuth()

  async function refresh() {
    if (!signedIn.value) {
      status.value = null
      return
    }
    if (!status.value) {
      const cached = (await Preferences.get({ key: KEY }).catch(() => ({ value: null }))).value as AiTier | null
      if (cached) status.value = { tier: cached, text: 0, photo: 0 }
    }
    loading.value = true
    const { data, error } = await useSupabase().rpc('my_ai_status')
    loading.value = false
    failed.value = !!error
    if (error || !data) return
    status.value = data as Status
    await Preferences.set({ key: KEY, value: status.value.tier }).catch(() => {})
  }

  if (!watching) {
    watching = true
    watch(() => session.value?.user.id, (id, old) => {
      if (id === old) return
      status.value = null
      if (!id) Preferences.remove({ key: KEY }).catch(() => {})
    })
  }

  const tier = computed<AiTier>(() => status.value?.tier ?? 'free')
  const unlimited = computed(() => tier.value !== 'free')
  return { status: readonly(status), tier, unlimited, loading: readonly(loading), failed: readonly(failed), refresh }
}
