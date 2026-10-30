import { Preferences } from '@capacitor/preferences'

/** Payment, contact and donate details the owner edits on the admin page (public.app_config). */
export interface RemoteConfig {
  price: string
  pay_note: string
  pay_url: string
  contact_email: string
  contact_url: string
  donate_url: string
  donate_note: string
}

const KEY = 'budbuddy:app-config'
const EMPTY: RemoteConfig = { price: '5 USD', pay_note: '', pay_url: '', contact_email: '', contact_url: '', donate_url: '', donate_note: '' }

const config = ref<RemoteConfig>({ ...EMPTY })
const loaded = ref(false)
const failed = ref(false)
let loading: Promise<void> | null = null

async function fetchConfig() {
  const cached = (await Preferences.get({ key: KEY }).catch(() => ({ value: null }))).value
  if (cached && !loaded.value) {
    try {
      config.value = { ...EMPTY, ...JSON.parse(cached) }
      loaded.value = true
    } catch { /* refetched below */ }
  }
  const { data, error } = await useSupabase().from('app_config')
    .select('price, pay_note, pay_url, contact_email, contact_url, donate_url, donate_note').eq('id', 1).maybeSingle()
  if (error || !data) {
    failed.value = !loaded.value
    return
  }
  failed.value = false
  config.value = { ...EMPTY, ...data }
  loaded.value = true
  await Preferences.set({ key: KEY, value: JSON.stringify(config.value) }).catch(() => {})
}

/** Tells the admins someone opened the payment or donate link (fire and forget). */
export function logPaymentClick(kind: 'pay' | 'donate') {
  useSupabase().rpc('log_payment_click', { kind }).then(() => {}, () => {})
}

/** Only http(s) links leave the app. */
export const safeUrl = (u: string) => (/^https?:\/\/\S+$/i.test(u.trim()) ? u.trim() : '')

export function useRemoteConfig() {
  function load(force = false) {
    if (!loading || force) {
      loading = fetchConfig()
        .catch(() => {
          failed.value = !loaded.value
        })
        .finally(() => (loading = null))
    }
    return loading
  }
  async function save(patch: Partial<RemoteConfig>) {
    const { error } = await useSupabase().from('app_config').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) throw error
    config.value = { ...config.value, ...patch }
    await Preferences.set({ key: KEY, value: JSON.stringify(config.value) }).catch(() => {})
  }
  return { config: readonly(config), loaded: readonly(loaded), failed: readonly(failed), load, save }
}
