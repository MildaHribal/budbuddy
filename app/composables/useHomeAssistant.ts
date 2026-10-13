import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { EnvSensor } from '~/types/environment'
import { historyPath, numericState, parseHistory, toCelsius, toEntities, toggleService, type HaEntity } from '~/utils/env/homeAssistant'

// URL + long-lived token live under their own key: never part of the grow data, backups or anything shared.
const KEY = 'budbuddy:home-assistant'

export interface HaConfig {
  url: string
  token: string
}

export type HaProblem = 'auth' | 'unreachable' | 'cors' | 'mixed' | 'failed'

export class HaError extends Error {
  constructor(public problem: HaProblem) {
    super(problem)
    this.name = 'HaError'
  }
}

const config = ref<HaConfig | null>(null)
const entities = shallowRef<HaEntity[]>([])
let loaded: Promise<void> | null = null

function loadConfig() {
  loaded ??= Preferences.get({ key: KEY }).then(({ value }) => {
    if (!value) return
    try {
      const c = JSON.parse(value) as HaConfig
      if (typeof c.url === 'string' && typeof c.token === 'string' && c.url && c.token) config.value = c
    } catch {
      // ignore a broken entry, the user can connect again
    }
  }).catch(() => {})
  return loaded
}

/**
 * On Android requests go through the native HTTP stack: no CORS and plain http works in the LAN.
 * In a browser Home Assistant must allow the origin (http.cors_allowed_origins) and be reachable over https.
 */
async function request<T>(c: HaConfig, path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const url = c.url + path
  const headers: Record<string, string> = { 'Authorization': `Bearer ${c.token}`, 'Content-Type': 'application/json' }
  if (Capacitor.isNativePlatform()) {
    let res
    try {
      res = await CapacitorHttp.request({ url, method, headers, data: body, connectTimeout: 8000, readTimeout: 15000 })
    } catch {
      throw new HaError('unreachable')
    }
    if (res.status === 401 || res.status === 403) throw new HaError('auth')
    if (res.status < 200 || res.status >= 300) throw new HaError('failed')
    return (typeof res.data === 'string' ? JSON.parse(res.data || 'null') : res.data) as T
  }
  let res: Response
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  } catch {
    // fetch hides CORS and mixed-content failures behind the same TypeError
    throw new HaError(location.protocol === 'https:' && url.startsWith('http:') ? 'mixed' : 'cors')
  }
  if (res.status === 401 || res.status === 403) throw new HaError('auth')
  if (!res.ok) throw new HaError('failed')
  return await res.json() as T
}

export function useHomeAssistant() {
  loadConfig()
  const envApi = useEnvironment()

  async function connect(next: HaConfig) {
    await request(next, '/api/')
    config.value = next
    await Preferences.set({ key: KEY, value: JSON.stringify(next) })
    await refreshEntities()
  }

  async function disconnect() {
    config.value = null
    entities.value = []
    await Preferences.remove({ key: KEY })
  }

  async function refreshEntities() {
    await loadConfig()
    if (!config.value) return []
    entities.value = toEntities(await request<unknown>(config.value, '/api/states'))
    return entities.value
  }

  async function toggle(entityId: string) {
    if (!config.value) return
    await request(config.value, toggleService(entityId), 'POST', { entity_id: entityId })
    // HA applies the change asynchronously; give it a moment before re-reading
    await new Promise(r => setTimeout(r, 400))
    await refreshEntities()
  }

  /** Stores the current HA values of every HA sensor as a reading. */
  async function pullLatest(list = entities.value) {
    for (const s of envApi.env.value.sensors) {
      if (s.kind !== 'ha') continue
      const tEnt = list.find(e => e.id === s.haTemp)
      const hEnt = list.find(e => e.id === s.haHumidity)
      const tv = tEnt ? numericState(tEnt.state) : null
      const hv = hEnt ? numericState(hEnt.state) : null
      if (tv !== null || hv !== null) envApi.addReading(s.id, tv === null ? null : toCelsius(tv, tEnt!.unit), hv)
    }
  }

  async function sync() {
    await loadConfig()
    if (!config.value) return
    const list = await refreshEntities()
    await pullLatest(list)
  }

  async function importHistory(sensor: EnvSensor, days: number): Promise<number> {
    await loadConfig()
    if (!config.value) return 0
    const ids = [sensor.haTemp, sensor.haHumidity].filter(Boolean)
    if (!ids.length) return 0
    const to = new Date()
    const from = new Date(to.getTime() - days * 86_400_000)
    const hist = parseHistory(await request<unknown>(config.value, historyPath(ids, from, to)))
    const points = [
      ...(hist[sensor.haTemp] ?? []).map(p => ({ t: p.t, c: p.v, h: null })),
      ...(hist[sensor.haHumidity] ?? []).map(p => ({ t: p.t, c: null, h: p.v }))
    ]
    return envApi.importReadings(sensor.id, points)
  }

  return { config, entities, ready: loadConfig, connect, disconnect, refreshEntities, toggle, sync, importHistory }
}
