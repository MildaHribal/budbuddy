import { describe, expect, it } from 'vitest'
import type { EnvReading } from '../app/types/environment'
import { isLanHost, normalizeHaUrl, parseHistory, toEntities, toggleService } from '../app/utils/env/homeAssistant'
import { estimateLight, luxToPpfd, medianLux, ppfdBand } from '../app/utils/env/lightMeter'
import { addSample, compact, FINE_BUCKET, seriesOf, statsOf, thin, vpdTarget } from '../app/utils/env/readings'
import { normalizeEnvironment } from '../app/utils/env/schema'
import { normalizeData } from '../app/utils/schema'

const H = 3_600_000
const NOW = Date.UTC(2026, 9, 13, 12)

describe('readings', () => {
  it('averages samples in the same bucket', () => {
    const list: EnvReading[] = []
    addSample(list, 's', NOW, 24, 60)
    addSample(list, 's', NOW + 60_000, 26, null)
    addSample(list, 's', NOW + FINE_BUCKET, 20, 50)
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ c: 25, h: 60, n: 2 })
  })
  it('compacts old readings to hours and drops the ancient', () => {
    const list: EnvReading[] = []
    const old = NOW - 5 * 24 * H
    for (let i = 0; i < 6; i++) addSample(list, 's', old + i * FINE_BUCKET, 20 + i, 50)
    addSample(list, 's', NOW - 400 * 24 * H, 10, 10)
    addSample(list, 's', NOW - 60_000, 22, 55)
    const out = compact(list, NOW)
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ c: 22.5, h: 50, n: 6 })
  })
  it('builds series and VPD', () => {
    const list: EnvReading[] = [{ s: 's', t: NOW, c: 25, h: 60, n: 1 }, { s: 'x', t: NOW, c: 1, h: 1, n: 1 }]
    expect(seriesOf(list, 's', 'temp', 0)).toEqual([{ t: NOW, v: 25 }])
    expect(seriesOf(list, 's', 'vpd', 0)[0]!.v).toBeCloseTo(0.91, 2)
  })
  it('thins long series', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ t: i, v: i % 2 }))
    const out = thin(pts, 100)
    expect(out.length).toBeLessThanOrEqual(100)
    expect(out[0]!.v).toBeCloseTo(0.5, 1)
  })
  it('VPD targets by stage and stats', () => {
    expect(vpdTarget('flowering')).toEqual({ min: 1.2, max: 1.6 })
    expect(vpdTarget('drying')).toBeNull()
    expect(statsOf([{ t: 0, v: 1 }, { t: 1, v: 1.4 }], { min: 1.2, max: 1.6 })).toEqual({ min: 1, max: 1.4, avg: 1.2, inTarget: 0.5 })
  })
})

describe('light meter', () => {
  it('converts lux per light type', () => {
    expect(luxToPpfd(40000, 'led-white')).toBeCloseTo(608)
    expect(luxToPpfd(40000, 'hps')).toBeCloseTo(488)
    expect(luxToPpfd(-5, 'sun')).toBe(0)
    expect(luxToPpfd(1000, 'sun', 1.1)).toBeCloseTo(20.35)
  })
  it('computes DLI from the light hours', () => {
    expect(estimateLight(40000, 'led-white', 18)).toEqual({ ppfd: 608, dli: 39.4 })
    expect(estimateLight(40000, 'led-white', 30).dli).toBe(52.5)
  })
  it('bands and median', () => {
    expect(ppfdBand(100)).toBe('low')
    expect(ppfdBand(800)).toBe('flower')
    expect(medianLux([5, 1, 100, 3])).toBe(4)
    expect(medianLux([])).toBe(0)
  })
})

describe('Home Assistant', () => {
  it('allows http only on the LAN', () => {
    expect(isLanHost('192.168.1.20')).toBe(true)
    expect(isLanHost('homeassistant.local')).toBe(true)
    expect(isLanHost('100.101.1.2')).toBe(true)
    expect(isLanHost('example.com')).toBe(false)
    expect(normalizeHaUrl('192.168.1.20:8123/')).toEqual({ url: 'http://192.168.1.20:8123' })
    expect(normalizeHaUrl('https://ha.example.com/api')).toEqual({ url: 'https://ha.example.com' })
    expect(normalizeHaUrl('http://ha.example.com')).toEqual({ error: 'insecure' })
    expect(normalizeHaUrl('')).toEqual({ error: 'empty' })
    expect(normalizeHaUrl('ftp://x')).toEqual({ error: 'invalid' })
  })
  it('picks useful entities', () => {
    const states = [
      { entity_id: 'sensor.tent_temperature', state: '24.6', attributes: { device_class: 'temperature', unit_of_measurement: '°C', friendly_name: 'Tent temperature' } },
      { entity_id: 'sensor.tent_humidity', state: '58', attributes: { device_class: 'humidity', unit_of_measurement: '%', friendly_name: 'Tent humidity' } },
      { entity_id: 'switch.tent_fan', state: 'on', attributes: { friendly_name: 'Fan plug' } },
      { entity_id: 'light.grow', state: 'off', attributes: {} },
      { entity_id: 'sun.sun', state: 'above_horizon', attributes: {} }
    ]
    expect(toEntities(states).map(e => `${e.kind}:${e.id}`)).toEqual(['switch:switch.tent_fan', 'light:light.grow', 'humidity:sensor.tent_humidity', 'temperature:sensor.tent_temperature'])
    expect(toggleService('light.grow')).toBe('/api/services/light/toggle')
    expect(toggleService('switch.tent_fan')).toBe('/api/services/switch/toggle')
  })
  it('parses minimal history and converts °F', () => {
    const raw = [
      [
        { entity_id: 'sensor.t', state: '77', attributes: { unit_of_measurement: '°F', device_class: 'temperature' }, last_changed: '2026-10-13T10:00:00+00:00' },
        { state: 'unavailable', last_changed: '2026-10-13T10:05:00+00:00' },
        { state: '68', last_changed: '2026-10-13T10:10:00+00:00' }
      ],
      [{ entity_id: 'sensor.h', state: '55.5', attributes: { unit_of_measurement: '%' }, last_changed: '2026-10-13T10:00:00+00:00' }]
    ]
    const h = parseHistory(raw)
    expect(h['sensor.t']!.map(p => p.v)).toEqual([25, 20])
    expect(h['sensor.h']).toEqual([{ t: Date.parse('2026-10-13T10:00:00Z'), v: 55.5 }])
  })
})

describe('environment schema', () => {
  it('is optional for old saves', () => {
    expect(normalizeData({ plants: [] }).environment).toBeUndefined()
  })
  it('keeps valid data and drops broken references', () => {
    const env = normalizeEnvironment({
      places: [{ id: 'p', name: 'Balcony', lat: 50.0871, lon: 14.4207 }, { id: 'bad', lat: 200, lon: 0 }],
      plantPlaces: { a: 'p', gone: 'p', b: 'missing' },
      sensors: [{ id: 's', name: 'Tent', kind: 'ble', model: 'pvvx', target: { type: 'plant', plantId: 'gone' } }],
      readings: [{ s: 's', t: Date.now(), c: 24, h: 140 }, { s: 'nope', t: Date.now(), c: 1, h: 1 }, { s: 's', t: Date.now() }],
      light: [{ lux: 30000, lightType: 'hps', plantId: 'a' }, { lux: 'x' }],
      rainHandled: ['p:2026-10-12', 'p:2026-10-12', 3]
    }, new Set(['a', 'b']))!
    expect(env.places).toEqual([{ id: 'p', name: 'Balcony', detail: '', lat: 50.1, lon: 14.4 }])
    expect(env.plantPlaces).toEqual({ a: 'p' })
    expect(env.sensors[0]!.target).toEqual({ type: 'tent' })
    expect(env.readings).toHaveLength(1)
    expect(env.readings[0]!.h).toBe(100)
    expect(env.light).toHaveLength(1)
    expect(env.light[0]).toMatchObject({ lightType: 'hps', plantId: 'a' })
    expect(env.rainHandled).toEqual(['p:2026-10-12'])
  })
  it('round-trips through normalizeData (backups)', () => {
    const data = normalizeData({
      plants: [{ id: 'a', name: 'A' }],
      environment: { places: [{ id: 'p', name: 'Garden', lat: 49, lon: 16 }], plantPlaces: { a: 'p' } }
    })
    expect(data.environment?.plantPlaces).toEqual({ a: 'p' })
    expect(normalizeData(JSON.parse(JSON.stringify(data))).environment).toEqual(data.environment)
  })
})
