import { describe, expect, it } from 'vitest'
import { hexToBytes, parseAdvertisement, shortUuid, type Advertisement } from '../app/utils/env/bleParsers'

// Real advertisement payloads from the Theengs Decoder test suite
// (github.com/theengs/decoder, tests/BLE/test_ble.cpp) and pySwitchbot (tests/test_adv_parser.py).
// Theengs manufacturer strings include the 2-byte little-endian company id; Capacitor strips it, so do we.
function mfg(hex: string, name?: string): Advertisement {
  const b = hexToBytes(hex)
  const company = b[0]! | (b[1]! << 8)
  return { name, manufacturerData: { [String(company)]: b.subarray(2) } }
}
const svc = (uuid: string, hex: string, name?: string): Advertisement => ({ name, serviceData: { [uuid]: hexToBytes(hex) } })
const FULL = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`

describe('uuid helpers', () => {
  it('reads 16-bit and 128-bit uuids', () => {
    expect(shortUuid(FULL('181a'))).toBe(0x181A)
    expect(shortUuid('0xFCD2')).toBe(0xFCD2)
    expect(shortUuid('fd3d')).toBe(0xFD3D)
    expect(shortUuid('6e400001-b5a3-f393-e0a9-e50e24dcca9e')).toBeNull()
  })
})

describe('Xiaomi LYWSD03MMC custom firmware (0x181A)', () => {
  it('ATC1441 format', () => {
    expect(parseAdvertisement(svc(FULL('181a'), 'a4c138d5d49801453e510b7b62', 'ATC_800021'))).toEqual({
      model: 'atc1441', tempC: 32.5, humidity: 62, battery: 81, mac: 'A4:C1:38:D5:D4:98'
    })
  })
  it('ATC1441 negative temperature', () => {
    expect(parseAdvertisement(svc(FULL('181a'), 'a4c138d5d498ffd33e510b7b62'))?.tempC).toBe(-4.5)
  })
  it('pvvx custom format', () => {
    expect(parseAdvertisement(svc(FULL('181a'), '5601cf38c1a44008bd13470c64cc0f', 'ATC_800021'))).toEqual({
      model: 'pvvx', tempC: 21.12, humidity: 50.53, battery: 100, mac: 'A4:C1:38:CF:01:56'
    })
  })
  it('pvvx negative temperature', () => {
    expect(parseAdvertisement(svc('181a', '5601cf38c1a462fdbd13470c64cc0f'))).toMatchObject({ tempC: -6.7, humidity: 50.53 })
  })
  it('pvvx BTHome v2', () => {
    expect(parseAdvertisement(svc(FULL('fcd2'), '4000840164021f0803141c', 'ATC_112233'))).toEqual({
      model: 'bthome', tempC: 20.79, humidity: 71.88, battery: 100, mac: null
    })
  })
  it('BTHome packet without temperature is ignored', () => {
    expect(parseAdvertisement(svc(FULL('fcd2'), '4000810cda0b10011101'))).toBeNull()
  })
  it('encrypted BTHome is ignored', () => {
    expect(parseAdvertisement(svc(FULL('fcd2'), '41be07860de133b3422302000050dea27d'))).toBeNull()
  })
  it('BTHome from a THB1 with voltage', () => {
    expect(parseAdvertisement(svc(FULL('fcd2'), '4000ef014a02020703b8170cbc0a'))).toMatchObject({ tempC: 17.94, humidity: 60.72, battery: 74 })
  })
})

describe('Govee', () => {
  it('H5075', () => {
    expect(parseAdvertisement(mfg('88ec000418ee6400', 'GVH5075_1234'))).toEqual({ model: 'govee-h5075', tempC: 26.8, humidity: 52.6, battery: 100, mac: null })
  })
  it('H5075 below zero', () => {
    expect(parseAdvertisement(mfg('88ec00811f096400', 'GVH5075_1234'))).toMatchObject({ tempC: -7.3, humidity: 48.1 })
  })
  it('H5072', () => {
    expect(parseAdvertisement(mfg('88ec0004344b6400', 'GVH5072_1234'))).toMatchObject({ model: 'govee-h5075', tempC: 27.5, humidity: 53.1 })
  })
  it('H5075 with a trailing iBeacon frame', () => {
    expect(parseAdvertisement(mfg('88ec000384e45c004c000215494e54454c4c495f524f434b535f48575075f2ffc2', 'GVH5075_1234'))).toMatchObject({ tempC: 23, humidity: 62.8, battery: 92 })
  })
  it('H5074', () => {
    expect(parseAdvertisement(mfg('88ec00c408231d6402', 'Govee_H5074_1234'))).toEqual({ model: 'govee-h5074', tempC: 22.44, humidity: 74.59, battery: 100, mac: null })
  })
  it('H5074 below zero', () => {
    expect(parseAdvertisement(mfg('88ec00a0facc176402', 'Govee_H5074_1234'))).toMatchObject({ tempC: -13.76, humidity: 60.92 })
  })
  it('H5179', () => {
    expect(parseAdvertisement(mfg('0188ec000101ee07581641', 'Govee_H5179_1234'))).toEqual({ model: 'govee-h5179', tempC: 20.3, humidity: 57.2, battery: 65, mac: null })
  })
  it('H5179 newer firmware', () => {
    expect(parseAdvertisement(mfg('0100010103e5c664', 'GV5179_1763'))).toMatchObject({ model: 'govee-h5179', tempC: 25.5, humidity: 43, battery: 100 })
    expect(parseAdvertisement(mfg('0100010104598c64', 'GV5179_1763'))).toMatchObject({ tempC: 28.5, humidity: 6.8 })
  })
})

describe('SwitchBot', () => {
  it('Meter (Plus) from manufacturer data', () => {
    expect(parseAdvertisement(mfg('6909aabbccddeeff4a0109962f', 'WoSensorTHP'))).toEqual({
      model: 'switchbot-meter', tempC: 22.9, humidity: 47, battery: null, mac: 'AA:BB:CC:DD:EE:FF'
    })
    expect(parseAdvertisement(mfg('6909aabbccddeeff3e0908965b', 'WoSensorTHP'))).toMatchObject({ tempC: 22.8, humidity: 91 })
  })
  it('Meter from service data only (older firmware)', () => {
    expect(parseAdvertisement(svc(FULL('fd3d'), '5400e4069835'))).toEqual({ model: 'switchbot-meter', tempC: 24.6, humidity: 53, battery: 100, mac: null })
  })
  it('Meter Pro with manufacturer + service data', () => {
    const ad = mfg('6909b0e9fe9a0166886408953d001a', 'Meter Pro')
    ad.serviceData = { [FULL('fd3d')]: hexToBytes('340064') }
    expect(parseAdvertisement(ad)).toMatchObject({ model: 'switchbot-meter', tempC: 21.8, humidity: 61, battery: 100 })
  })
  it('Outdoor Meter', () => {
    const ad = mfg('6909aabbccddeeff8b0305993200')
    ad.serviceData = { [FULL('fd3d')]: hexToBytes('770064') }
    expect(parseAdvertisement(ad)).toEqual({ model: 'switchbot-outdoor', tempC: 25.5, humidity: 50, battery: 100, mac: 'AA:BB:CC:DD:EE:FF' })
  })
  it('Outdoor Meter below zero', () => {
    const ad = mfg('6909aabbccddeeffe30f090f2a00', 'WoIOSensorTH')
    ad.serviceData = { [FULL('fd3d')]: hexToBytes('770041') }
    expect(parseAdvertisement(ad)).toMatchObject({ tempC: -15.9, humidity: 42, battery: 65 })
  })
  it('ignores other SwitchBot devices (Blind Tilt)', () => {
    const ad = mfg('6909aabbccddeeff0d275514', 'WoBlindTilt')
    ad.serviceData = { [FULL('fd3d')]: hexToBytes('78003c') }
    expect(parseAdvertisement(ad)).toBeNull()
  })
})

describe('unrelated devices', () => {
  it('ignores an Apple Watch', () => {
    expect(parseAdvertisement(mfg('4c0010050b182068dd', 'Watch'))).toBeNull()
  })
  it('ignores empty advertisements', () => {
    expect(parseAdvertisement({})).toBeNull()
  })
})
