// Validation of the optional `environment` collection in saved data and backups.

import type { EnvironmentData, EnvReading, EnvSensor, EnvTarget, LightReading, LightType, SensorKind, SensorModel, WeatherPlace } from '~/types/environment'
import { createId } from '~/utils/id'
import { LIGHT_TYPES } from './lightMeter'
import { compact } from './readings'
import { roundCoord, validCoords } from './weather'

export function emptyEnvironment(): EnvironmentData {
  return { places: [], plantPlaces: {}, sensors: [], readings: [], light: [], rainHandled: [], dismissed: [] }
}

const MODELS: SensorModel[] = ['atc1441', 'pvvx', 'bthome', 'govee-h5075', 'govee-h5074', 'govee-h5179', 'switchbot-meter', 'switchbot-outdoor']
const KINDS: SensorKind[] = ['ble', 'ha', 'manual']

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []
const strings = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))].slice(-max) : []

function normalizePlace(r: Record<string, unknown>): WeatherPlace | null {
  const lat = Number(r.lat)
  const lon = Number(r.lon)
  if (!validCoords(lat, lon)) return null
  return { id: str(r.id) || createId(), name: str(r.name).trim() || `${roundCoord(lat)}, ${roundCoord(lon)}`, detail: str(r.detail), lat: roundCoord(lat), lon: roundCoord(lon) }
}

function normalizeTarget(v: unknown, plantIds: Set<string>): EnvTarget {
  const t = v as Record<string, unknown> | null
  if (t?.type === 'plant' && typeof t.plantId === 'string' && plantIds.has(t.plantId)) return { type: 'plant', plantId: t.plantId }
  return { type: 'tent' }
}

function normalizeSensor(r: Record<string, unknown>, plantIds: Set<string>): EnvSensor {
  const kind = KINDS.includes(r.kind as SensorKind) ? (r.kind as SensorKind) : 'manual'
  return {
    id: str(r.id) || createId(),
    name: str(r.name).trim() || 'Sensor',
    kind,
    model: MODELS.includes(r.model as SensorModel) ? (r.model as SensorModel) : null,
    address: str(r.address),
    haTemp: str(r.haTemp),
    haHumidity: str(r.haHumidity),
    target: normalizeTarget(r.target, plantIds),
    createdAt: str(r.createdAt) || new Date().toISOString(),
    lastSeen: str(r.lastSeen) || null,
    battery: num(r.battery)
  }
}

function normalizeReading(r: Record<string, unknown>, sensors: Set<string>): EnvReading | null {
  const s = str(r.s)
  const t = num(r.t)
  if (!sensors.has(s) || t === null) return null
  const c = num(r.c)
  const h = num(r.h)
  if (c === null && h === null) return null
  return { s, t, c, h: h === null ? null : Math.min(100, Math.max(0, h)), n: Math.max(1, Math.round(num(r.n) ?? 1)) }
}

function normalizeLight(r: Record<string, unknown>, plantIds: Set<string>): LightReading | null {
  const lux = num(r.lux)
  if (lux === null || lux < 0) return null
  const at = str(r.at)
  const plantId = str(r.plantId)
  return {
    id: str(r.id) || createId(),
    at: at && !Number.isNaN(Date.parse(at)) ? at : new Date().toISOString(),
    lux,
    source: r.source === 'sensor' ? 'sensor' : 'manual',
    lightType: LIGHT_TYPES.includes(r.lightType as LightType) ? (r.lightType as LightType) : 'led-white',
    ppfd: Math.max(0, num(r.ppfd) ?? 0),
    hours: Math.min(24, Math.max(0, num(r.hours) ?? 0)),
    dli: Math.max(0, num(r.dli) ?? 0),
    heightCm: num(r.heightCm),
    plantId: plantIds.has(plantId) ? plantId : null,
    note: str(r.note)
  }
}

/** Returns undefined when there is nothing to keep, so saves without the feature stay unchanged. */
export function normalizeEnvironment(raw: unknown, plantIds: Set<string>): EnvironmentData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const env = emptyEnvironment()
  env.places = objects(r.places).map(normalizePlace).filter((p): p is WeatherPlace => !!p)
  const placeIds = new Set(env.places.map(p => p.id))
  if (r.plantPlaces && typeof r.plantPlaces === 'object') {
    for (const [plant, place] of Object.entries(r.plantPlaces as Record<string, unknown>)) {
      if (plantIds.has(plant) && typeof place === 'string' && placeIds.has(place)) env.plantPlaces[plant] = place
    }
  }
  env.sensors = objects(r.sensors).map(s => normalizeSensor(s, plantIds))
  const sensorIds = new Set(env.sensors.map(s => s.id))
  env.readings = compact(objects(r.readings).map(x => normalizeReading(x, sensorIds)).filter((x): x is EnvReading => !!x))
  env.light = objects(r.light).map(x => normalizeLight(x, plantIds)).filter((x): x is LightReading => !!x).slice(-500)
  env.rainHandled = strings(r.rainHandled, 200)
  env.dismissed = strings(r.dismissed, 200)
  return env
}
