import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Keeps paired BLE sensors and Home Assistant sensors logging while the app is open (Android only).
// Nothing runs in the background: scanning stops when the app is paused.
const HA_EVERY = 10 * 60_000

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const live = () => {
    try {
      return localStorage.getItem(BLE_LIVE_KEY) !== 'false'
    } catch {
      return true
    }
  }

  useGrow().init().then(() => {
    const envApi = useEnvironment()
    const hasBle = () => envApi.env.value.sensors.some(s => s.kind === 'ble')
    const hasHa = () => envApi.env.value.sensors.some(s => s.kind === 'ha')
    let lastHa = 0

    const resume = () => {
      if (live() && hasBle() && bleSupported()) useBleSensors().start('log')
      if (hasHa() && Date.now() - lastHa > HA_EVERY) {
        lastHa = Date.now()
        useHomeAssistant().sync().catch(() => {})
      }
    }

    resume()
    App.addListener('resume', resume)
    App.addListener('pause', () => {
      useBleSensors().stop()
    })
  })
})
