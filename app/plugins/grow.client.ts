import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(() => {
  initGrow()

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
  }

  return { provide: { goBack } }
})
