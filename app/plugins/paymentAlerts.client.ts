import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'

const SEEN_KEY = 'budbuddy:payment-alert-seen'
const ALERT_ID = 7900

function hasSession(): boolean {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

// Admins only: when the app starts or comes back, a phone notification for new taps on the payment link.
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  let running = false

  async function check() {
    if (running || !hasSession()) return
    running = true
    try {
      const { profile, ready } = useAuth()
      await until(ready).toBe(true)
      if (!profile.value?.is_admin) return
      const seen = (await Preferences.get({ key: SEEN_KEY })).value ?? new Date(0).toISOString()
      const { data } = await useSupabase().from('notifications').select('created_at, meta')
        .eq('user_id', profile.value.id).eq('type', 'payment').is('read_at', null)
        .gt('created_at', seen).order('created_at', { ascending: false }).limit(20)
      const rows = (data ?? []) as { created_at: string, meta: { email?: string } | null }[]
      if (!rows.length) return
      await Preferences.set({ key: SEEN_KEY, value: rows[0]!.created_at })
      if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
      const emails = [...new Set(rows.map(r => r.meta?.email || '?'))]
      const first = emails[0]!
      await LocalNotifications.schedule({
        notifications: [{
          id: ALERT_ID,
          title: translate('support.payAlert.title', { n: rows.length }),
          body: emails.length === 1 ? first : translate('support.payAlert.many', { email: first, n: emails.length - 1 }),
          channelId: 'reminders',
          schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
          extra: { route: `/admin?tab=users&q=${encodeURIComponent(emails.length === 1 ? first : '')}` }
        }]
      })
    } catch (e) {
      console.warn('[BudBuddy] payment alert check failed', e)
    } finally {
      running = false
    }
  }

  setTimeout(() => check(), 6000)
  App.addListener('resume', () => setTimeout(() => check(), 2000))
})
