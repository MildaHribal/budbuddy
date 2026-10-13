import { Capacitor } from '@capacitor/core'
import { dataViewToBytes, parseAdvertisement, type SensorSample } from '~/utils/env/bleParsers'

// Passive BLE scanning: listens to advertisements only, never connects or pairs at the OS level.
// The plugin is imported lazily so the web build and non-BLE screens never load it.

export interface FoundDevice {
  id: string
  name: string
  rssi: number | null
  sample: SensorSample
  seenAt: number
}

export type BleProblem = 'unsupported' | 'disabled' | 'denied' | 'failed'

/** localStorage flag: log paired sensors whenever the app is open (default on) */
export const BLE_LIVE_KEY = 'budbuddy:env-live'

/** one stored reading per sensor per minute; advertisements arrive every few seconds */
const RECORD_EVERY = 60_000

const scanning = ref(false)
const problem = ref<BleProblem | null>(null)
const found = shallowRef<FoundDevice[]>([])
const lastRecorded = new Map<string, number>()
let initialized = false
let mode: 'discover' | 'log' = 'log'

type BleModule = typeof import('@capacitor-community/bluetooth-le')
let ble: BleModule | null = null

async function client(): Promise<BleModule> {
  ble ??= await import('@capacitor-community/bluetooth-le')
  return ble
}

export const bleSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

function toRecord(map: Record<string, DataView> | undefined): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {}
  for (const [k, v] of Object.entries(map ?? {})) out[k] = dataViewToBytes(v)
  return out
}

export function useBleSensors() {
  const envApi = useEnvironment()

  function onResult(r: import('@capacitor-community/bluetooth-le').ScanResult) {
    const sample = parseAdvertisement({
      name: r.localName ?? r.device.name ?? '',
      manufacturerData: toRecord(r.manufacturerData),
      serviceData: toRecord(r.serviceData)
    })
    if (!sample) return
    const id = r.device.deviceId
    const now = Date.now()
    if (mode === 'discover') {
      const rest = found.value.filter(d => d.id !== id)
      found.value = [...rest, { id, name: r.localName ?? r.device.name ?? '', rssi: r.rssi ?? null, sample, seenAt: now }]
        .sort((a, b) => (b.rssi ?? -200) - (a.rssi ?? -200))
    }
    const paired = envApi.env.value.sensors.find(s => s.kind === 'ble' && s.address === id)
    if (!paired) return
    if (now - (lastRecorded.get(paired.id) ?? 0) < RECORD_EVERY) return
    lastRecorded.set(paired.id, now)
    envApi.addReading(paired.id, sample.tempC, sample.humidity, now, sample.battery)
  }

  async function start(scanMode: 'discover' | 'log' = 'log'): Promise<boolean> {
    if (!bleSupported()) {
      problem.value = 'unsupported'
      return false
    }
    if (scanning.value) {
      // upgrade a background log scan to a discovery scan without restarting
      mode = scanMode === 'discover' ? 'discover' : mode
      return true
    }
    mode = scanMode
    problem.value = null
    try {
      const { BleClient, ScanMode } = await client()
      if (!initialized) {
        await BleClient.initialize({ androidNeverForLocation: true })
        initialized = true
      }
      if (!(await BleClient.isEnabled())) {
        try {
          await BleClient.requestEnable()
        } catch {
          problem.value = 'disabled'
          return false
        }
        if (!(await BleClient.isEnabled())) {
          problem.value = 'disabled'
          return false
        }
      }
      await BleClient.requestLEScan({
        allowDuplicates: true,
        scanMode: scanMode === 'discover' ? ScanMode.SCAN_MODE_LOW_LATENCY : ScanMode.SCAN_MODE_LOW_POWER
      }, onResult)
      scanning.value = true
      return true
    } catch (e) {
      const msg = String((e as Error)?.message ?? e).toLowerCase()
      problem.value = msg.includes('permission') || msg.includes('denied') ? 'denied' : msg.includes('disabled') || msg.includes('not enabled') ? 'disabled' : 'failed'
      return false
    }
  }

  async function stop() {
    if (!scanning.value) return
    scanning.value = false
    try {
      await (await client()).BleClient.stopLEScan()
    } catch {
      // already stopped by the system
    }
  }

  /** Back from discovery to quiet logging (or off when nothing is paired). */
  async function endDiscovery() {
    found.value = []
    await stop()
    if (bleSupported() && envApi.env.value.sensors.some(s => s.kind === 'ble')) await start('log')
  }

  async function openSettings() {
    try {
      await (await client()).BleClient.openBluetoothSettings()
    } catch {
      // not available on this device
    }
  }

  async function openAppSettings() {
    try {
      await (await client()).BleClient.openAppSettings()
    } catch {
      // not available on this device
    }
  }

  return { scanning, problem, found, start, stop, endDiscovery, openSettings, openAppSettings }
}
