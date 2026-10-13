import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { medianLux } from '~/utils/env/lightMeter'

// Android ambient light sensor through the app's own LightSensor plugin (android/.../env/LightSensorPlugin.java).

interface LightSensorPlugin {
  isAvailable(): Promise<{ available: boolean, name?: string, maxLux?: number }>
  start(): Promise<void>
  stop(): Promise<void>
  addListener(event: 'lux', cb: (e: { lux: number, accuracy: number }) => void): Promise<PluginListenerHandle>
}

const LightSensor = registerPlugin<LightSensorPlugin>('LightSensor')
const WINDOW = 15

export function useLightSensor() {
  const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const available = ref<boolean | null>(native ? null : false)
  const maxLux = ref<number | null>(null)
  const running = ref(false)
  const lux = ref<number | null>(null)
  const error = ref(false)
  const samples: number[] = []
  let handle: PluginListenerHandle | null = null

  async function check() {
    if (!native) return false
    try {
      const r = await LightSensor.isAvailable()
      available.value = r.available
      maxLux.value = r.maxLux ?? null
    } catch {
      // an APK built before the plugin existed
      available.value = false
    }
    return available.value
  }

  async function start() {
    if (running.value) return
    error.value = false
    if (available.value === null) await check()
    if (!available.value) return
    try {
      samples.length = 0
      handle = await LightSensor.addListener('lux', (e) => {
        samples.push(e.lux)
        if (samples.length > WINDOW) samples.shift()
        lux.value = Math.round(medianLux(samples))
      })
      await LightSensor.start()
      running.value = true
    } catch {
      error.value = true
      await stop()
    }
  }

  async function stop() {
    running.value = false
    await handle?.remove().catch(() => {})
    handle = null
    await LightSensor.stop().catch(() => {})
  }

  onBeforeUnmount(stop)

  return { native, available, maxLux, running, lux, error, check, start, stop }
}
