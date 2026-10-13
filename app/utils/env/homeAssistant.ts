// Home Assistant REST API helpers (https://developers.home-assistant.io/docs/api/rest/). Pure parsing only;
// the requests themselves live in useHomeAssistant so they can go through the native HTTP stack on Android.

export interface HaState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed?: string
}

export interface HaEntity {
  id: string
  name: string
  state: string
  unit: string
  kind: 'temperature' | 'humidity' | 'switch' | 'light'
}

const PRIVATE_V4 = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^127\./, /^169\.254\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./]

/** LAN-only hosts may use plain http; anything else must be https so the token never crosses the internet in clear text. */
export function isLanHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.home.arpa') || h.endsWith('.internal')) return true
  if (PRIVATE_V4.some(re => re.test(h))) return true
  // IPv6 unique-local / link-local
  return /^(fc|fd)[0-9a-f]{2}:/.test(h) || h.startsWith('fe80:') || h === '::1'
}

export type UrlProblem = 'empty' | 'invalid' | 'insecure'

export function normalizeHaUrl(input: string): { url: string } | { error: UrlProblem } {
  const raw = input.trim()
  if (!raw) return { error: 'empty' }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) return { error: 'invalid' }
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`)
  } catch {
    return { error: 'invalid' }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'invalid' }
  if (u.protocol === 'http:' && !isLanHost(u.hostname)) return { error: 'insecure' }
  const path = u.pathname.replace(/\/+$/, '').replace(/\/api$/, '')
  return { url: `${u.protocol}//${u.host}${path}` }
}

function kindOf(s: HaState): HaEntity['kind'] | null {
  const domain = s.entity_id.split('.')[0]
  const dc = s.attributes.device_class
  if (domain === 'sensor' && dc === 'temperature') return 'temperature'
  if (domain === 'sensor' && dc === 'humidity') return 'humidity'
  if (domain === 'switch' || domain === 'input_boolean' || domain === 'fan') return 'switch'
  if (domain === 'light') return 'light'
  return null
}

export function toEntities(raw: unknown): HaEntity[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((x) => {
    const s = x as HaState
    if (!s || typeof s.entity_id !== 'string' || !s.attributes || typeof s.attributes !== 'object') return []
    const kind = kindOf(s)
    if (!kind) return []
    const name = typeof s.attributes.friendly_name === 'string' ? s.attributes.friendly_name : s.entity_id
    const unit = typeof s.attributes.unit_of_measurement === 'string' ? s.attributes.unit_of_measurement : ''
    return [{ id: s.entity_id, name, state: String(s.state), unit, kind }]
  }).sort((a, b) => a.name.localeCompare(b.name))
}

/** HA reports °F when the instance uses imperial units. */
export function toCelsius(value: number, unit: string): number {
  return /f/i.test(unit) ? Math.round(((value - 32) * 5 / 9) * 100) / 100 : value
}

export function numericState(state: string): number | null {
  if (state === 'unavailable' || state === 'unknown' || state === '') return null
  const v = Number(state)
  return Number.isFinite(v) ? v : null
}

export interface HistoryPoint {
  t: number
  v: number
}

/**
 * Parses /api/history/period with minimal_response: one array per entity, the first item carries
 * entity_id and attributes, later items only state + last_changed.
 */
export function parseHistory(raw: unknown): Record<string, HistoryPoint[]> {
  const out: Record<string, HistoryPoint[]> = {}
  if (!Array.isArray(raw)) return out
  for (const series of raw) {
    if (!Array.isArray(series) || !series.length) continue
    const head = series[0] as HaState
    if (typeof head?.entity_id !== 'string') continue
    const unit = typeof head.attributes?.unit_of_measurement === 'string' ? head.attributes.unit_of_measurement : ''
    const isTemp = head.attributes?.device_class === 'temperature' || unit.includes('°')
    const points: HistoryPoint[] = []
    for (const item of series as { state?: unknown, last_changed?: unknown }[]) {
      const v = numericState(String(item.state ?? ''))
      const t = typeof item.last_changed === 'string' ? Date.parse(item.last_changed) : Number.NaN
      if (v === null || !Number.isFinite(t)) continue
      points.push({ t, v: isTemp ? toCelsius(v, unit) : v })
    }
    out[head.entity_id] = points
  }
  return out
}

export function historyPath(entities: string[], from: Date, to: Date): string {
  const p = new URLSearchParams({
    filter_entity_id: entities.join(','),
    end_time: to.toISOString(),
    minimal_response: '',
    significant_changes_only: ''
  })
  return `/api/history/period/${encodeURIComponent(from.toISOString())}?${p}`
}

/** service call that toggles a switch-like entity */
export function toggleService(entityId: string): string {
  const domain = entityId.split('.')[0]
  if (domain === 'light') return '/api/services/light/toggle'
  if (domain === 'fan') return '/api/services/fan/toggle'
  if (domain === 'input_boolean') return '/api/services/input_boolean/toggle'
  return '/api/services/switch/toggle'
}
