import { Capacitor } from '@capacitor/core'

// Exposes the on-screen keyboard as --kb (px) and .kb-open on <html>.
export default defineNuxtPlugin(() => {
  const root = document.documentElement
  const set = (h: number) => {
    const px = Math.max(0, Math.round(h))
    root.style.setProperty('--kb', `${px}px`)
    root.classList.toggle('kb-open', px > 80)
  }

  // Android resizes the WebView natively (resizeOnFullScreen); restyling the page while the
  // keyboard opens made the WebView drop focus and close it again, so do nothing there.
  if (Capacitor.isNativePlatform()) return

  // Web: the visual viewport shrinks when a mobile keyboard opens.
  const vv = window.visualViewport
  if (!vv) return
  const update = () => set(window.innerHeight - vv.height - vv.offsetTop)
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
})
