// Passive BLE advertisement decoders for cheap thermo-hygrometers. No connection, no cloud.
//
// Byte layouts (verified against the sample payloads in test/env-ble.test.ts):
// - Xiaomi LYWSD03MMC & co. with custom firmware, service data UUID 0x181A
//   · ATC1441 format, 13 bytes, big-endian: MAC[6] temp int16 (0.1 °C) hum u8 (%) batt u8 (%) mV u16 counter u8
//   · pvvx custom format, 15 bytes, little-endian: MAC[6 reversed] temp int16 (0.01 °C) hum u16 (0.01 %) mV u16 batt u8 counter u8 flags u8
//     https://github.com/pvvx/ATC_MiThermometer#custom-format-all-data-little-endian
//   · BTHome v2 (pvvx default in newer builds), service data UUID 0xFCD2, unencrypted only
//     https://bthome.io/format/
// - Govee, manufacturer data (company id stripped, as Capacitor delivers it)
//   · H5072/H5075 (company 0xEC88): 00 + 24-bit BE packed value (temp*10000 + hum*10, bit 23 = negative) + batt
//   · H5074 (0xEC88, 7 bytes): 00 temp int16 LE (0.01 °C) hum u16 LE (0.01 %) batt 02
//   · H5179 (0x8801): EC 00 01 01 temp int16 LE hum u16 LE batt; newer firmware (0x0001): 01 01 + packed value like H5075 + batt
//     https://github.com/wcbonner/GoveeBTTempLogger
// - SwitchBot Meter / Meter Plus / Meter Pro / Outdoor Meter
//   · manufacturer data (company 0x0969): MAC[6] seq … bytes 8..10 = temp decimal (low nibble), temp int (bit 7 = positive), hum (7 bit)
//   · older Meter service data (UUID 0xFD3D / 0x0D00): type 'T'|'i' status batt(7 bit) then the same 3 temp/hum bytes
//     https://github.com/sblibs/pySwitchbot/blob/master/switchbot/adv_parsers/meter.py
// Sample payloads come from the Theengs Decoder test suite (https://github.com/theengs/decoder, tests/BLE/test_ble.cpp)
// and pySwitchbot tests.

import type { SensorModel } from '~/types/environment'

export interface Advertisement {
  name?: string
  /** company id (decimal string or number key) → payload without the company id */
  manufacturerData?: Record<string, Uint8Array>
  /** service UUID (16-bit hex or full 128-bit) → payload */
  serviceData?: Record<string, Uint8Array>
}

export interface SensorSample {
  model: SensorModel
  tempC: number
  humidity: number
  battery: number | null
  /** MAC from the payload when the format carries one */
  mac: string | null
}

const COMPANY_GOVEE = 0xEC88
const COMPANY_GOVEE_H5179 = 0x8801
const COMPANY_GOVEE_NEW = 0x0001
const COMPANY_SWITCHBOT = 0x0969

/** "0000181a-0000-1000-8000-00805f9b34fb" | "181a" | "0x181A" → 0x181a */
export function shortUuid(uuid: string): number | null {
  const u = uuid.toLowerCase().replace(/^0x/, '')
  const m = u.match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/) ?? u.match(/^([0-9a-f]{4})$/)
  return m ? parseInt(m[1]!, 16) : null
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-f]/gi, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function dataViewToBytes(v: DataView): Uint8Array {
  return new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
}

const i16le = (b: Uint8Array, o: number) => ((b[o]! | (b[o + 1]! << 8)) << 16) >> 16
const u16le = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8)
const i16be = (b: Uint8Array, o: number) => (((b[o]! << 8) | b[o + 1]!) << 16) >> 16
const r2 = (n: number) => Math.round(n * 100) / 100
const mac = (bytes: Uint8Array) => [...bytes].map(x => x.toString(16).padStart(2, '0')).join(':').toUpperCase()

const plausible = (s: SensorSample) => s.tempC > -40 && s.tempC < 85 && s.humidity >= 0 && s.humidity <= 100

function byCompany(ad: Advertisement, id: number): Uint8Array | undefined {
  for (const [k, v] of Object.entries(ad.manufacturerData ?? {})) {
    const n = /^0x/i.test(k) ? parseInt(k, 16) : Number(k)
    if (n === id) return v
  }
  return undefined
}

function byService(ad: Advertisement, id: number): Uint8Array | undefined {
  for (const [k, v] of Object.entries(ad.serviceData ?? {})) if (shortUuid(k) === id) return v
  return undefined
}

// ── Xiaomi custom firmware (0x181A) ─────────────────────────────────

export function parseAtc1441(b: Uint8Array): SensorSample | null {
  if (b.length !== 13) return null
  return { model: 'atc1441', tempC: i16be(b, 6) / 10, humidity: b[8]!, battery: b[9]!, mac: mac(b.subarray(0, 6)) }
}

export function parsePvvx(b: Uint8Array): SensorSample | null {
  if (b.length !== 15) return null
  return { model: 'pvvx', tempC: r2(i16le(b, 6) / 100), humidity: r2(u16le(b, 8) / 100), battery: b[12]!, mac: mac(b.subarray(0, 6).reverse()) }
}

// ── BTHome v2 (0xFCD2) ──────────────────────────────────────────────

// object id → payload length; only ids pvvx and similar firmwares send
const BTHOME_LEN: Record<number, number> = {
  0x00: 1, 0x01: 1, 0x02: 2, 0x03: 2, 0x04: 3, 0x05: 3, 0x06: 2, 0x07: 2, 0x08: 2, 0x09: 1, 0x0A: 3, 0x0B: 3, 0x0C: 2, 0x0D: 2,
  0x0E: 2, 0x0F: 1, 0x10: 1, 0x11: 1, 0x12: 2, 0x13: 2, 0x14: 2, 0x15: 1, 0x2E: 1, 0x2F: 1, 0x3A: 1, 0x3D: 2, 0x3F: 2, 0x40: 2,
  0x45: 2, 0x46: 1, 0x2D: 1, 0x2A: 1, 0x20: 1, 0x21: 1, 0x22: 1, 0x23: 1
}

export function parseBthome(b: Uint8Array): SensorSample | null {
  if (b.length < 2) return null
  const info = b[0]!
  // bit 0 = encrypted, bits 5–7 = version (2)
  if (info & 0x01 || (info >> 5) !== 2) return null
  let temp: number | null = null
  let hum: number | null = null
  let battery: number | null = null
  let i = 1
  while (i < b.length) {
    const id = b[i]!
    const len = BTHOME_LEN[id]
    if (len === undefined || i + 1 + len > b.length) break
    const o = i + 1
    if (id === 0x01) battery = b[o]!
    else if (id === 0x02) temp = r2(i16le(b, o) / 100)
    else if (id === 0x45) temp = i16le(b, o) / 10
    else if (id === 0x03) hum = r2(u16le(b, o) / 100)
    else if (id === 0x2E) hum = b[o]!
    i = o + len
  }
  if (temp === null || hum === null) return null
  return { model: 'bthome', tempC: temp, humidity: hum, battery, mac: null }
}

// ── Govee ───────────────────────────────────────────────────────────

/** 24-bit packed value used by H5072/H5075 and new H5179 firmware */
function govee24(b: Uint8Array, o: number) {
  let v = (b[o]! << 16) | (b[o + 1]! << 8) | b[o + 2]!
  const negative = (v & 0x800000) !== 0
  v &= 0x7FFFFF
  const temp = Math.floor(v / 1000) / 10
  return { tempC: negative ? -temp : temp, humidity: (v % 1000) / 10 }
}

export function parseGovee(ad: Advertisement): SensorSample | null {
  const name = ad.name ?? ''
  const g = byCompany(ad, COMPANY_GOVEE)
  if (g && g[0] === 0x00) {
    // H5074 sends 7 bytes ending in 0x02; H5072/5075 6 bytes (more when an iBeacon frame is appended)
    if (g.length === 7 && (/5074/.test(name) || g[6] === 0x02)) {
      return { model: 'govee-h5074', tempC: i16le(g, 1) / 100, humidity: u16le(g, 3) / 100, battery: g[5]!, mac: null }
    }
    if (g.length >= 6) return { model: 'govee-h5075', ...govee24(g, 1), battery: g[4]!, mac: null }
  }
  const old = byCompany(ad, COMPANY_GOVEE_H5179)
  if (old && old.length >= 9 && old[0] === 0xEC) {
    return { model: 'govee-h5179', tempC: i16le(old, 4) / 100, humidity: u16le(old, 6) / 100, battery: old[8]!, mac: null }
  }
  const neu = byCompany(ad, COMPANY_GOVEE_NEW)
  if (neu && neu.length === 6 && /5179/.test(name)) {
    return { model: 'govee-h5179', ...govee24(neu, 2), battery: neu[5]!, mac: null }
  }
  return null
}

// ── SwitchBot ───────────────────────────────────────────────────────

function switchbotTemp(b: Uint8Array, o: number) {
  const sign = b[o + 1]! & 0x80 ? 1 : -1
  const tempC = sign * ((b[o + 1]! & 0x7F) + (b[o]! & 0x0F) / 10)
  return { tempC: Math.round(tempC * 10) / 10, humidity: b[o + 2]! & 0x7F }
}

const SB_METER_TYPES = new Set([0x54, 0x74, 0x69, 0x49, 0x34, 0x14, 0x35, 0x15]) // T t i I 4 5 (Meter, Plus, Pro, Pro CO2)
const SB_OUTDOOR_TYPES = new Set([0x77, 0x57]) // w W

export function parseSwitchbot(ad: Advertisement): SensorSample | null {
  const svc = byService(ad, 0xFD3D) ?? byService(ad, 0x0D00)
  const mfr = byCompany(ad, COMPANY_SWITCHBOT)
  const type = svc?.[0]
  const name = ad.name ?? ''
  const outdoor = (type !== undefined && SB_OUTDOOR_TYPES.has(type)) || /WoIOSensor|Outdoor/i.test(name)
  const meter = (type !== undefined && SB_METER_TYPES.has(type)) || /WoSensorTH|Meter/i.test(name)
  if (!outdoor && !meter) return null
  const battery = svc && svc.length >= 3 ? svc[2]! & 0x7F : null
  let th: { tempC: number, humidity: number } | null = null
  if (mfr && mfr.length >= 11) th = switchbotTemp(mfr, 8)
  else if (svc && svc.length >= 6) th = switchbotTemp(svc, 3)
  if (!th) return null
  return { model: outdoor ? 'switchbot-outdoor' : 'switchbot-meter', ...th, battery, mac: mfr && mfr.length >= 6 ? mac(mfr.subarray(0, 6)) : null }
}

/** Tries every supported format; returns null for anything else (phones, watches, encrypted payloads). */
export function parseAdvertisement(ad: Advertisement): SensorSample | null {
  let s: SensorSample | null = null
  const env = byService(ad, 0x181A)
  if (env) s = parseAtc1441(env) ?? parsePvvx(env)
  if (!s) {
    const bt = byService(ad, 0xFCD2)
    if (bt) s = parseBthome(bt)
  }
  s ??= parseGovee(ad) ?? parseSwitchbot(ad)
  return s && plausible(s) ? s : null
}

export const MODEL_LABEL: Record<SensorModel, string> = {
  'atc1441': 'Xiaomi (ATC1441)',
  'pvvx': 'Xiaomi (pvvx)',
  'bthome': 'BTHome (pvvx)',
  'govee-h5075': 'Govee H5072/H5075',
  'govee-h5074': 'Govee H5074',
  'govee-h5179': 'Govee H5179',
  'switchbot-meter': 'SwitchBot Meter',
  'switchbot-outdoor': 'SwitchBot Outdoor Meter'
}
