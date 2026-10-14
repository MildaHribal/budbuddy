import { describe, expect, it } from 'vitest'
import { forecastUrl, geocodeUrl, parseForecast, parseGeocode, rainWatering, weatherAlerts, weatherKind } from '../app/utils/env/weather'

// Shape of a real Open-Meteo response (trimmed to two hours per day).
const RAW = {
  timezone: 'Europe/Prague',
  current: { temperature_2m: 9.4, relative_humidity_2m: 91, precipitation: 0.3, weather_code: 61, wind_speed_10m: 12.1 },
  hourly: {
    time: ['2026-10-12T00:00', '2026-10-12T01:00', '2026-10-13T00:00', '2026-10-13T01:00', '2026-10-14T00:00'],
    relative_humidity_2m: [70, 74, 90, 92, 60],
    precipitation: [0, 0, 1.2, 0.8, 0]
  },
  daily: {
    time: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
    weather_code: [3, 61, 0, 95, 2, 71],
    temperature_2m_max: [15, 12, 33.5, 36, 20, 4],
    temperature_2m_min: [6, 7, 15, 18, 1.5, -2],
    precipitation_sum: [6.4, 3.1, 0, 32, 0, 1],
    precipitation_probability_max: [80, 90, 0, 100, 10, 40],
    wind_gusts_10m_max: [30, 40, 20, 75, 52, 10]
  }
}

describe('Open-Meteo requests', () => {
  it('rounds coordinates to ~10 km', () => {
    const url = new URL(forecastUrl(50.087451, 14.420671))
    expect(url.searchParams.get('latitude')).toBe('50.1')
    expect(url.searchParams.get('longitude')).toBe('14.4')
    expect(url.searchParams.get('past_days')).toBe('1')
  })
  it('builds a geocoding search', () => {
    const url = new URL(geocodeUrl(' Brno ', 'cs'))
    expect(url.searchParams.get('name')).toBe('Brno')
    expect(url.searchParams.get('language')).toBe('cs')
  })
  it('parses geocoding results', () => {
    expect(parseGeocode({ results: [{ name: 'Brno', latitude: 49.19522, longitude: 16.60796, admin1: 'Jihomoravský kraj', country: 'Česko' }, { name: 'x' }] }))
      .toEqual([{ name: 'Brno', detail: 'Jihomoravský kraj, Česko', lat: 49.2, lon: 16.6 }])
    expect(parseGeocode({})).toEqual([])
  })
})

describe('forecast parsing', () => {
  const f = parseForecast(RAW, 'p1', 1000)
  it('reads days and current weather', () => {
    expect(f.days).toHaveLength(6)
    expect(f.current).toMatchObject({ temp: 9.4, rh: 91, code: 61 })
    expect(f.days[1]).toMatchObject({ date: '2026-10-13', tMin: 7, precip: 3.1, rhMean: 91, wetHours: 2 })
  })
  it('survives garbage', () => {
    expect(parseForecast(null, 'x').days).toEqual([])
  })
  it('maps WMO codes', () => {
    expect(weatherKind(0)).toBe('clear')
    expect(weatherKind(63)).toBe('rain')
    expect(weatherKind(81)).toBe('rain')
    expect(weatherKind(95)).toBe('storm')
    expect(weatherKind(45)).toBe('fog')
  })
})

describe('alerts', () => {
  const f = parseForecast(RAW, 'p1')
  it('finds frost, heat, heavy rain and wind in the next days', () => {
    const alerts = weatherAlerts(f, '2026-10-13', { flowering: false, daysAhead: 4 })
    const types = alerts.map(a => `${a.type}@${a.date}${a.severe ? '!' : ''}`)
    expect(types).toEqual(['heat@2026-10-14', 'heat@2026-10-15!', 'rain@2026-10-15!', 'wind@2026-10-15!', 'frost@2026-10-16', 'wind@2026-10-16', 'frost@2026-10-17!'])
    expect(alerts[0]!.key).toBe('p1:heat:2026-10-14')
  })
  it('skips past days and mould without flowering plants', () => {
    const alerts = weatherAlerts(f, '2026-10-13', { flowering: false, daysAhead: 0 })
    expect(alerts).toEqual([])
  })
  it('warns about mould while flowering in humid rain', () => {
    const alerts = weatherAlerts(f, '2026-10-13', { flowering: true, daysAhead: 0 })
    expect(alerts.map(a => a.type)).toEqual(['mould'])
  })
})

describe('mould risk', () => {
  const day = (date: string, wetHours: number, precip: number, rhMean: number) => ({ date, code: 3, tMin: 8, tMax: 15, precip, precipProb: 0, gust: 10, rhMean, wetHours })
  it('ignores a dry day with a humid night', () => {
    const f = { placeId: 'p', fetchedAt: 0, timezone: '', current: null, days: [day('2026-10-13', 12, 0, 78)] }
    expect(weatherAlerts(f, '2026-10-13', { flowering: true })).toEqual([])
  })
  it('warns once for a wet spell', () => {
    const f = { placeId: 'p', fetchedAt: 0, timezone: '', current: null, days: [day('2026-10-13', 14, 4, 90), day('2026-10-14', 18, 6, 92)] }
    expect(weatherAlerts(f, '2026-10-13', { flowering: true }).map(a => a.date)).toEqual(['2026-10-13'])
  })
})

describe('rain counts as watering', () => {
  const f = parseForecast(RAW, 'p1')
  it('suggests yesterday’s rain', () => {
    expect(rainWatering(f, '2026-10-13', [])).toEqual({ key: 'p1:2026-10-12', placeId: 'p1', date: '2026-10-12', mm: 6.4 })
  })
  it('does not ask twice', () => {
    expect(rainWatering(f, '2026-10-13', ['p1:2026-10-12'])).toBeNull()
  })
  it('ignores light rain', () => {
    expect(rainWatering(f, '2026-10-14', [])).toBeNull()
  })
})
