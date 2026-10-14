import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Keeps paired BLE sensors and Home Assistant sensors logging while the app is open (Android only).
// Nothing runs in the background: scanning stops when the app is paused.
const HA_EVERY = 10 * 60_000

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  // loaded only on the device, after the data: keeps sensor code out of the start-up bundle
  initGrow().then(async () => {
    const [{ BLE_LIVE_KEY, bleSupported, useBleSensors: ble }, { useHomeAssistant: ha }, { useEnvironment: environment }] = await Promise.all([
      import('~/composables/useBleSensors'),
      import('~/composables/useHomeAssistant'),
      import('~/composables/useEnvironment')
    ])
    const live = () => {
      try {
        return localStorage.getItem(BLE_LIVE_KEY) !== 'false'
      } catch {
        return true
      }
    }
    const envApi = environment()
    const hasBle = () => envApi.env.value.sensors.some(s => s.kind === 'ble')
    const hasHa = () => envApi.env.value.sensors.some(s => s.kind === 'ha')
    let lastHa = 0

    const resume = () => {
      if (live() && hasBle() && bleSupported()) ble().start('log')
      if (hasHa() && Date.now() - lastHa > HA_EVERY) {
        lastHa = Date.now()
        ha().sync().catch(() => {})
      }
    }

    resume()
    App.addListener('resume', resume)
    App.addListener('pause', () => {
      ble().stop()
    })
  }).catch(e => console.warn('[BudBuddy] sensor logging not started', e))
})
