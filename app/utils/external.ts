import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

/** https in the in-app browser, mailto/other schemes through Android's intent handling. */
export function openExternal(url: string) {
  if (!/^https?:/i.test(url)) {
    window.location.href = url
    return
  }
  if (Capacitor.isNativePlatform()) Browser.open({ url }).catch(() => {})
  else window.open(url, '_blank', 'noopener')
}
