import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { locale } from '~/utils/locale'

export default defineNuxtPlugin(() => {
  initGrow()

  const { state } = useGrow()
  watchEffect(() => {
    locale.value = state.settings.language
    document.documentElement.lang = state.settings.language
  })

  const router = useRouter()

  const goBack = () => {
    if (popBackHandler()) return true
    if (router.currentRoute.value.path !== '/') {
      if (window.history.state?.back) router.back()
      else router.replace('/')
      return true
    }
    return false
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') popBackHandler()
  })

  if (Capacitor.isNativePlatform()) {
    App.addListener('backButton', () => {
      if (!goBack()) App.exitApp()
    })

    // Re-plan reminders whenever the journal changes or the app comes back.
    initReminders(route => router.push(route))
    const sync = useDebounceFn(() => syncReminders().catch(() => {}), 1500)
    watch(() => [state.plants, state.entries, state.tasks, state.settings], sync, { deep: true, immediate: true })
    App.addListener('resume', sync)
  }

  return { provide: { goBack } }
})
