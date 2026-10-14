import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Re-plans burp and drying reminders whenever the journal data changes.
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const { revision } = useGrow()
  initGrow().then(() => {
    const sync = useDebounceFn(() => syncCareReminders().catch(e => console.warn('[BudBuddy] care reminders', e)), 1500)
    watch(revision, sync, { immediate: true })
    App.addListener('resume', sync)
  })
})
