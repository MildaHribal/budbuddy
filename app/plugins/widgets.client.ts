import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const DEEP_LINK = /^budbuddy:\/\/app(\/[^#]*)?/

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const router = useRouter()
  const open = (url: string | undefined) => {
    const m = url ? DEEP_LINK.exec(url) : null
    if (m) router.push(m[1] || '/')
  }
  App.addListener('appUrlOpen', e => open(e.url))
  router.isReady().then(() => App.getLaunchUrl()).then(r => open(r?.url)).catch(() => {})

  const { state, revision } = useGrow()
  // widget code is loaded on the device only
  const widgets = Promise.all([import('~/utils/widgetBridge'), import('~/utils/widgetPhoto')])
  const refresh = () => widgets.then(([{ WidgetBridge }]) => WidgetBridge.refresh()).catch(() => {})
  const sync = useDebounceFn(async () => {
    await widgets.then(([, { syncWidgetPhoto }]) => syncWidgetPhoto(state)).catch(e => console.error('[BudBuddy] widget photo failed', e))
    await refresh()
  }, 2000)
  watch(revision, sync, { immediate: true })
  // let the 250 ms debounced save hit Preferences first
  App.addListener('pause', () => setTimeout(refresh, 600))
})
