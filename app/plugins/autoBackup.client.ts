import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { isDue } from '~/utils/autoBackup'

// Runs a due automatic backup a few seconds after start and whenever the app comes back.
export default defineNuxtPlugin(() => {
  const backup = useAutoBackup()
  let timer: ReturnType<typeof setTimeout> | null = null

  async function attempt() {
    await initGrow()
    const { state, loadError } = useGrow()
    // never back up an unreadable or demo garden over a real backup
    if (loadError.value || state.settings.demo) return
    await backup.load()
    if (!isDue(backup.config.value)) return
    await backup.runBackup().catch(e => console.warn('[BudBuddy] automatic backup failed', e))
  }

  function schedule(delay = 8000) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const run = () => attempt().catch(() => {})
      if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 5000 })
      else run()
    }, delay)
  }

  schedule()
  if (Capacitor.isNativePlatform()) App.addListener('resume', () => schedule(3000))
  else {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') schedule(3000)
    })
  }
})
