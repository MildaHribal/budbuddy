import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LABEL_ORIGIN, parsePlantLink } from '~/utils/qr'

// Label links (https://budbuddy.hribal.site/plants/<id>) opened from the camera app land in the app.
// budbuddy://app/… links are handled by the widgets plugin.
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const router = useRouter()
  const open = (url: string | undefined) => {
    if (!url?.startsWith(LABEL_ORIGIN)) return
    const id = parsePlantLink(url)
    if (id) router.push(`/plants/${id}`)
  }
  App.addListener('appUrlOpen', e => open(e.url))
  router.isReady().then(() => App.getLaunchUrl()).then(r => open(r?.url)).catch(() => {})
})
