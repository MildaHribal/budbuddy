// Open-Meteo forecast (https://open-meteo.com, no key, non-commercial use) and the grow alerts derived from it.

import type { WeatherPlace } from '~/types/environment'
import { addDays } from '~/utils/date'

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
/** a cached forecast is refreshed after this long when online */
export const FORECAST_TTL = 60 * 60 * 1000
/** a forecast older than this is shown as outdated */
export const FORECAST_STALE = 12 * 60 * 60 * 1000

/** ~1 km: enough for a forecast, never a precise position */
export const roundCoord = (n: number) => Math.round(n * 100) / 100

export function validCoords(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

export function forecastUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: String(roundCoord(lat)),
    longitude: String(roundCoord(lon)),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    hourly: 'relative_humidity_2m,precipitation',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max',
    timezone: 'auto',
    past_days: '1',
    forecast_days: '7'
  })
  return `${FORECAST_URL}?${p}`
}

export function geocodeUrl(query: string, lang: string): string {
  const p = new URLSearchParams({ name: query.trim(), count: '8', language: lang, format: 'json' })
  return `${GEOCODE_URL}?${p}`
}

export interface GeoResult {
  name: string
  detail: string
  lat: number
  lon: number
}

export function parseGeocode(raw: unknown): GeoResult[] {
  const results = (raw as { results?: unknown[] })?.results
  if (!Array.isArray(results)) return []
  return results.flatMap((r) => {
    const o = r as Record<string, unknown>
    const lat = Number(o.latitude)
    const lon = Number(o.longitude)
    if (typeof o.name !== 'string' || !validCoords(lat, lon)) return []
    const detail = [o.admin1, o.country].filter((x): x is string => typeof x === 'string' && !!x && x !== o.name).join(', ')
    return [{ name: o.name, detail, lat: roundCoord(lat), lon: roundCoord(lon) }]
  })
}

export interface ForecastDay {
  /** YYYY-MM-DD in the place's time zone */
  date: string
  code: number
  tMin: number | null
  tMax: number | null
  /** mm */
  precip: number | null
  /** % */
  precipProb: number | null
  /** km/h */
  gust: number | null
  rhMean: number | null
  /** hours with RH ≥ 85 % */
  wetHours: number
}

export interface Forecast {
  placeId: string
  fetchedAt: number
  timezone: string
  current: { temp: number | null, rh: number | null, precip: number | null, code: number, wind: number | null } | null
  /** yesterday first (past_days=1), then today and 6 more days */
  days: ForecastDay[]
}

const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export function parseForecast(raw: unknown, placeId: string, now = Date.now()): Forecast {
  const r = (raw ?? {}) as Record<string, Record<string, unknown> | string | undefined>
  const daily = (r.daily ?? {}) as Record<string, unknown>
  const hourly = (r.hourly ?? {}) as Record<string, unknown>
  const cur = r.current as Record<string, unknown> | undefined

  // hourly humidity grouped by local date ("2026-10-13T14:00" → "2026-10-13")
  const rhByDay = new Map<string, number[]>()
  const times = arr(hourly.time)
  const rh = arr(hourly.relative_humidity_2m)
  times.forEach((t, i) => {
    const v = n(rh[i])
    if (typeof t !== 'string' || v === null) return
    const d = t.slice(0, 10)
    const list = rhByDay.get(d) ?? []
    list.push(v)
    rhByDay.set(d, list)
  })

  const days: ForecastDay[] = arr(daily.time).flatMap((d, i) => {
    if (typeof d !== 'string') return []
    const rhs = rhByDay.get(d) ?? []
    return [{
      date: d,
      code: n(arr(daily.weather_code)[i]) ?? 0,
      tMin: n(arr(daily.temperature_2m_min)[i]),
      tMax: n(arr(daily.temperature_2m_max)[i]),
      precip: n(arr(daily.precipitation_sum)[i]),
      precipProb: n(arr(daily.precipitation_probability_max)[i]),
      gust: n(arr(daily.wind_gusts_10m_max)[i]),
      rhMean: rhs.length ? Math.round(rhs.reduce((s, x) => s + x, 0) / rhs.length) : null,
      wetHours: rhs.filter(x => x >= 85).length
    }]
  })

  return {
    placeId,
    fetchedAt: now,
    timezone: typeof r.timezone === 'string' ? r.timezone : '',
    current: cur
      ? { temp: n(cur.temperature_2m), rh: n(cur.relative_humidity_2m), precip: n(cur.precipitation), code: n(cur.weather_code) ?? 0, wind: n(cur.wind_speed_10m) }
      : null,
    days
  }
}

// ── Alerts ──────────────────────────────────────────────────────────

export type AlertType = 'frost' | 'heat' | 'rain' | 'wind' | 'mould'

export interface WeatherAlert {
  key: string
  type: AlertType
  placeId: string
  date: string
  severe: boolean
  /** the value that triggered it (°C, mm, km/h or wet hours) */
  value: number
}

export const THRESHOLDS = {
  frost: 2,
  frostSevere: 0,
  heat: 32,
  heatSevere: 35,
  rain: 15,
  rainSevere: 30,
  wind: 50,
  windSevere: 70,
  /** mould: hours of RH ≥ 85 % in a day, or rain + humid mean */
  wetHours: 10,
  mouldRain: 2,
  mouldRh: 80
}

/**
 * Alerts for today and the next `daysAhead` days. Mould risk only matters while something flowers outside.
 */
export function weatherAlerts(f: Forecast, today: string, opts: { flowering: boolean, daysAhead?: number }): WeatherAlert[] {
  const last = addDays(today, opts.daysAhead ?? 3)
  const out: WeatherAlert[] = []
  const push = (type: AlertType, date: string, severe: boolean, value: number) =>
    out.push({ key: `${f.placeId}:${type}:${date}`, type, placeId: f.placeId, date, severe, value })
  for (const d of f.days) {
    if (d.date < today || d.date > last) continue
    if (d.tMin !== null && d.tMin <= THRESHOLDS.frost) push('frost', d.date, d.tMin <= THRESHOLDS.frostSevere, d.tMin)
    if (d.tMax !== null && d.tMax >= THRESHOLDS.heat) push('heat', d.date, d.tMax >= THRESHOLDS.heatSevere, d.tMax)
    if (d.precip !== null && d.precip >= THRESHOLDS.rain) push('rain', d.date, d.precip >= THRESHOLDS.rainSevere, d.precip)
    if (d.gust !== null && d.gust >= THRESHOLDS.wind) push('wind', d.date, d.gust >= THRESHOLDS.windSevere, d.gust)
    if (opts.flowering) {
      const humidRain = (d.precip ?? 0) >= THRESHOLDS.mouldRain && (d.rhMean ?? 0) >= THRESHOLDS.mouldRh
      if (d.wetHours >= THRESHOLDS.wetHours || humidRain) push('mould', d.date, d.wetHours >= 16, d.wetHours)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || Number(b.severe) - Number(a.severe))
}

/** mm of rain that counts as a proper watering for plants in the ground or in big outdoor pots */
export const RAIN_WATERING_MM = 5

export interface RainDay {
  key: string
  placeId: string
  date: string
  mm: number
}

/** Rain from yesterday or today that is enough to skip watering. */
export function rainWatering(f: Forecast, today: string, handled: readonly string[]): RainDay | null {
  const yesterday = addDays(today, -1)
  for (const date of [today, yesterday]) {
    const d = f.days.find(x => x.date === date)
    const key = `${f.placeId}:${date}`
    if (d?.precip != null && d.precip >= RAIN_WATERING_MM && !handled.includes(key)) {
      // today's figure is partly forecast: only count it once the current reading says it is raining or has rained a lot
      if (date === today && (f.current?.precip ?? 0) <= 0 && d.precip < RAIN_WATERING_MM * 2) continue
      return { key, placeId: f.placeId, date, mm: Math.round(d.precip * 10) / 10 }
    }
  }
  return null
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

/** WMO weather interpretation codes → a small set of kinds */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

export const WEATHER_ICON: Record<WeatherKind, string> = {
  clear: 'i-tabler-sun',
  partly: 'i-tabler-sun-low',
  cloudy: 'i-tabler-cloud',
  fog: 'i-tabler-cloud-fog',
  drizzle: 'i-tabler-cloud-rain',
  rain: 'i-tabler-cloud-rain',
  snow: 'i-tabler-cloud-snow',
  storm: 'i-tabler-cloud-storm'
}

export const ALERT_ICON: Record<AlertType, string> = {
  frost: 'i-tabler-temperature-snow',
  heat: 'i-tabler-temperature-sun',
  rain: 'i-tabler-umbrella',
  wind: 'i-tabler-wind',
  mould: 'i-tabler-droplets'
}

export function placeLabel(p: Pick<WeatherPlace, 'name' | 'detail'>): string {
  return p.detail ? `${p.name}, ${p.detail}` : p.name
}
