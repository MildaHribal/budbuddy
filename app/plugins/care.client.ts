import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Re-plans burp and drying reminders when jars, checks or reminder settings change.
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const { state } = useGrow()
  initGrow().then(() => {
    const sync = useDebounceFn(() => syncCareReminders().catch(e => console.warn('[BudBuddy] care reminders', e)), 1500)
    watch(() => [state.cure, state.plants.map(p => p.stage + p.archived), state.settings.reminders, state.settings.reminderTime], sync, { deep: true, immediate: true })
    App.addListener('resume', sync)
  })
})
