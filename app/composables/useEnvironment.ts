import { Preferences } from '@capacitor/preferences'
import type { EnvironmentData, EnvReading, EnvSensor, EnvTarget, LightReading, WeatherPlace } from '~/types/environment'
import type { Plant, StageId } from '~/types/grow'
import { emptyEnvironment } from '~/utils/env/schema'
import { addSample, compact, vpdTarget } from '~/utils/env/readings'
import { FORECAST_TTL, forecastUrl, parseForecast, rainWatering, roundCoord, weatherAlerts, type Forecast, type GeoResult, type RainDay, type WeatherAlert } from '~/utils/env/weather'
import { createId } from '~/utils/id'
import { GROWING_STAGES, isGrowing } from '~/utils/stages'

// Forecasts are a cache, not user data: kept under their own key, outside backups.
const CACHE_KEY = 'budbuddy:weather-cache'
const EMPTY = emptyEnvironment()

const forecasts = reactive<Record<string, Forecast>>({})
const loading = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string>>({})
let cacheLoaded: Promise<void> | null = null
let addsSinceCompact = 0

function loadCache() {
  cacheLoaded ??= Preferences.get({ key: CACHE_KEY }).then(({ value }) => {
    if (!value) return
    try {
      const parsed = JSON.parse(value) as Record<string, Forecast>
      for (const [k, f] of Object.entries(parsed)) if (f && Array.isArray(f.days)) forecasts[k] = f
    } catch {
      // a broken cache is simply refetched
    }
  }).catch(() => {})
  return cacheLoaded
}

function saveCache() {
  Preferences.set({ key: CACHE_KEY, value: JSON.stringify(forecasts) }).catch(() => {})
}

export function useEnvironment() {
  const grow = useGrow()
  const { state } = grow
  const { t } = useI18n()
  const today = useToday()

  const env = computed<EnvironmentData>(() => state.environment ?? EMPTY)
  const mut = () => grow.environmentData()

  loadCache()

  // ── Places & plants ───────────────────────────────────────────────

  const outdoorPlants = computed(() => state.plants.filter(p => isGrowing(p) && p.location !== 'indoor'))
  const indoorPlants = computed(() => state.plants.filter(p => isGrowing(p) && p.location === 'indoor'))

  function placeOf(plantId: string): WeatherPlace | null {
    const id = env.value.plantPlaces[plantId]
    return env.value.places.find(p => p.id === id) ?? env.value.places[0] ?? null
  }

  function plantsAt(placeId: string): Plant[] {
    return outdoorPlants.value.filter(p => placeOf(p.id)?.id === placeId)
  }

  function addPlace(g: GeoResult): WeatherPlace {
    const place: WeatherPlace = { id: createId(), name: g.name.trim() || `${roundCoord(g.lat)}, ${roundCoord(g.lon)}`, detail: g.detail, lat: roundCoord(g.lat), lon: roundCoord(g.lon) }
    mut().places.push(place)
    refreshForecast(place, true)
    return place
  }

  function renamePlace(id: string, name: string) {
    const p = mut().places.find(x => x.id === id)
    if (p && name.trim()) p.name = name.trim()
  }

  function removePlace(id: string) {
    const e = mut()
    e.places = e.places.filter(p => p.id !== id)
    e.plantPlaces = Object.fromEntries(Object.entries(e.plantPlaces).filter(([, place]) => place !== id))
    Reflect.deleteProperty(forecasts, id)
    saveCache()
  }

  function setPlantPlace(plantId: string, placeId: string) {
    mut().plantPlaces[plantId] = placeId
  }

  // ── Forecast ──────────────────────────────────────────────────────

  async function refreshForecast(place: WeatherPlace, force = false) {
    await loadCache()
    const cached = forecasts[place.id]
    if (!force && cached && Date.now() - cached.fetchedAt < FORECAST_TTL) return
    if (loading[place.id]) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      errors[place.id] = 'offline'
      return
    }
    loading[place.id] = true
    Reflect.deleteProperty(errors, place.id)
    try {
      const res = await fetch(forecastUrl(place.lat, place.lon))
      if (!res.ok) throw new Error(String(res.status))
      forecasts[place.id] = parseForecast(await res.json(), place.id)
      saveCache()
    } catch {
      errors[place.id] = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'failed'
    } finally {
      loading[place.id] = false
    }
  }

  function refreshAll(force = false) {
    return Promise.all(env.value.places.map(p => refreshForecast(p, force)))
  }

  const alerts = computed<WeatherAlert[]>(() => env.value.places.flatMap((place) => {
    const f = forecasts[place.id]
    const plants = plantsAt(place.id)
    if (!f || !plants.length) return []
    const flowering = plants.some(p => p.stage === 'flowering')
    return weatherAlerts(f, today.value, { flowering }).filter(a => !env.value.dismissed.includes(a.key))
  }))

  /** Rain only waters plants that stand in it: greenhouses are skipped. */
  const rainDays = computed<(RainDay & { plants: Plant[] })[]>(() => env.value.places.flatMap((place) => {
    const f = forecasts[place.id]
    const plants = plantsAt(place.id).filter(p => p.location === 'outdoor')
    if (!f || !plants.length) return []
    const r = rainWatering(f, today.value, env.value.rainHandled)
    return r ? [{ ...r, plants }] : []
  }))

  function logRain(r: RainDay & { plants: Plant[] }) {
    for (const p of r.plants) {
      grow.addEntry({ plantId: p.id, type: 'water', date: r.date, note: t('environment.rain.entryNote', { mm: formatNumber(r.mm) }) })
    }
    dismissRain(r.key)
  }

  function dismissRain(key: string) {
    const e = mut()
    e.rainHandled = [...e.rainHandled, key].slice(-200)
  }

  function dismissAlert(key: string) {
    const e = mut()
    e.dismissed = [...e.dismissed, key].slice(-200)
  }

  // ── Sensors & readings ────────────────────────────────────────────

  function addSensor(input: Pick<EnvSensor, 'name' | 'kind' | 'target'> & Partial<EnvSensor>): EnvSensor {
    const sensor: EnvSensor = {
      model: null,
      address: '',
      haTemp: '',
      haHumidity: '',
      lastSeen: null,
      battery: null,
      ...input,
      id: createId(),
      createdAt: new Date().toISOString()
    }
    mut().sensors.push(sensor)
    return sensor
  }

  function updateSensor(id: string, patch: Partial<EnvSensor>) {
    const s = mut().sensors.find(x => x.id === id)
    if (s) Object.assign(s, patch, { id: s.id })
  }

  function removeSensor(id: string) {
    const e = mut()
    e.sensors = e.sensors.filter(s => s.id !== id)
    e.readings = e.readings.filter(r => r.s !== id)
  }

  function addReading(sensorId: string, c: number | null, h: number | null, at = Date.now(), battery?: number | null) {
    const e = mut()
    const s = e.sensors.find(x => x.id === sensorId)
    if (!s) return
    addSample(e.readings, sensorId, at, c, h)
    if (!s.lastSeen || at > Date.parse(s.lastSeen)) s.lastSeen = new Date(at).toISOString()
    if (battery != null) s.battery = battery
    if (++addsSinceCompact >= 200) compactNow()
  }

  /** Bulk import (Home Assistant history): one compaction at the end. */
  function importReadings(sensorId: string, points: { t: number, c: number | null, h: number | null }[]) {
    const e = mut()
    const s = e.sensors.find(x => x.id === sensorId)
    if (!s || !points.length) return 0
    const sorted = [...points].sort((a, b) => a.t - b.t)
    const list = [...e.readings]
    for (const p of sorted) addSample(list, sensorId, p.t, p.c, p.h)
    e.readings = compact(list)
    const last = sorted[sorted.length - 1]!.t
    if (!s.lastSeen || last > Date.parse(s.lastSeen)) s.lastSeen = new Date(last).toISOString()
    return sorted.length
  }

  function compactNow() {
    addsSinceCompact = 0
    const e = mut()
    e.readings = compact(e.readings)
  }

  function latest(sensorId: string): EnvReading | null {
    // back-dated manual readings can sit at the end, so look at the time, not the position
    let best: EnvReading | null = null
    for (const r of env.value.readings) if (r.s === sensorId && (!best || r.t >= best.t)) best = r
    return best
  }

  function targetPlant(target: EnvTarget): Plant | null {
    return target.type === 'plant' ? state.plants.find(p => p.id === target.plantId) ?? null : null
  }

  function targetLabel(target: EnvTarget): string {
    return targetPlant(target)?.name ?? t('environment.target.tent')
  }

  /** Stage that decides the VPD target: the plant's, or the most advanced indoor plant for the tent. */
  function targetStage(target: EnvTarget): StageId | null {
    const plant = targetPlant(target)
    if (plant) return plant.stage
    const plants = indoorPlants.value
    if (!plants.length) return null
    const rank = (s: StageId) => GROWING_STAGES.indexOf(s)
    return plants.reduce((best, p) => (rank(p.stage) > rank(best) ? p.stage : best), plants[0]!.stage)
  }

  const targetFor = (target: EnvTarget) => vpdTarget(targetStage(target))

  /** sensors that describe a plant: its own, plus the tent's for indoor plants */
  function sensorsFor(plant: Plant): EnvSensor[] {
    return env.value.sensors.filter(s => (s.target.type === 'plant' ? s.target.plantId === plant.id : plant.location === 'indoor'))
  }

  // ── Light measurements ────────────────────────────────────────────

  function addLight(r: Omit<LightReading, 'id' | 'at'>): LightReading {
    const reading: LightReading = { ...r, id: createId(), at: new Date().toISOString() }
    const e = mut()
    e.light = [...e.light, reading].slice(-500)
    return reading
  }

  function removeLight(id: string) {
    const e = mut()
    e.light = e.light.filter(l => l.id !== id)
  }

  return {
    env,
    forecasts,
    loading,
    errors,
    outdoorPlants,
    indoorPlants,
    placeOf,
    plantsAt,
    addPlace,
    renamePlace,
    removePlace,
    setPlantPlace,
    refreshForecast,
    refreshAll,
    alerts,
    rainDays,
    logRain,
    dismissRain,
    dismissAlert,
    addSensor,
    updateSensor,
    removeSensor,
    addReading,
    importReadings,
    compactNow,
    latest,
    targetPlant,
    targetLabel,
    targetStage,
    targetFor,
    sensorsFor,
    addLight,
    removeLight
  }
}
