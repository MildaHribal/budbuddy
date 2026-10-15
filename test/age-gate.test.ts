import { describe, expect, it } from 'vitest'
import { ageOn, BLOCK_HOURS, checkBirth, COUNTRY_CODES, deviceCountry, gateState, minAgeFor, parseRecord, recordFor } from '../app/utils/ageGate'

const at = (iso: string) => new Date(`${iso}T12:00:00`)

describe('age gate', () => {
  it('uses 21 in Czechia and the US, 18 elsewhere', () => {
    expect(minAgeFor('CZ')).toBe(21)
    expect(minAgeFor('US')).toBe(21)
    expect(minAgeFor('DE')).toBe(18)
    expect(minAgeFor('SK')).toBe(18)
    expect(minAgeFor('cz')).toBe(21)
  })

  it('counts the birthday itself as reached', () => {
    const birth = { y: 2005, m: 10, d: 15 }
    expect(ageOn(birth, at('2026-10-14'))).toBe(20)
    expect(ageOn(birth, at('2026-10-15'))).toBe(21)
  })

  it('treats 29 February as reached on 1 March in common years', () => {
    const birth = { y: 2004, m: 2, d: 29 }
    expect(ageOn(birth, at('2025-02-28'))).toBe(20)
    expect(ageOn(birth, at('2025-03-01'))).toBe(21)
    expect(ageOn(birth, at('2028-02-29'))).toBe(24)
  })

  it('rejects impossible, future and implausible dates', () => {
    const today = at('2026-10-15')
    expect(checkBirth({ y: 2001, m: 2, d: 29 }, today)).toBe('invalid')
    expect(checkBirth({ y: 2000, m: 13, d: 1 }, today)).toBe('invalid')
    expect(checkBirth({ y: 2026, m: 12, d: 1 }, today)).toBe('invalid')
    expect(checkBirth({ y: 1890, m: 1, d: 1 }, today)).toBe('invalid')
    expect(checkBirth({ y: 2000, m: 2, d: 29 }, today)).toBe('ok')
  })

  it('records only the outcome, never the birth date', () => {
    const now = at('2026-10-15')
    const ok = recordFor('CZ', { y: 2005, m: 10, d: 15 }, now)
    expect(ok).toEqual({ v: 1, country: 'CZ', minAge: 21, verifiedAt: now.toISOString() })
    const young = recordFor('CZ', { y: 2005, m: 10, d: 16 }, now)
    expect(young).toEqual({ v: 1, country: 'CZ', minAge: 21, blockedUntil: new Date(now.getTime() + BLOCK_HOURS * 3600_000).toISOString() })
    expect(JSON.stringify(young)).not.toContain('2005')
  })

  it('asks, passes or blocks from the stored record', () => {
    const now = at('2026-10-15')
    expect(gateState(null, now)).toBe('ask')
    expect(gateState({ v: 1, country: 'DE', minAge: 18, verifiedAt: now.toISOString() }, now)).toBe('ok')
    const blocked = { v: 1 as const, country: 'CZ', minAge: 21, blockedUntil: at('2026-10-16').toISOString() }
    expect(gateState(blocked, now)).toBe('blocked')
    expect(gateState(blocked, at('2026-10-17'))).toBe('ask')
  })

  it('asks again when the country now needs a higher age', () => {
    const now = at('2026-10-15')
    expect(gateState({ v: 1, country: 'CZ', minAge: 18, verifiedAt: now.toISOString() }, now)).toBe('ask')
  })

  it('parses stored records defensively', () => {
    expect(parseRecord(null)).toBeNull()
    expect(parseRecord('nope')).toBeNull()
    expect(parseRecord('{"v":1,"country":"DE"}')).toBeNull()
    expect(parseRecord('{"v":1,"country":"DE","minAge":18,"verifiedAt":"2026-10-15T10:00:00.000Z"}')).toEqual({ v: 1, country: 'DE', minAge: 18, verifiedAt: '2026-10-15T10:00:00.000Z' })
  })

  it('guesses the country from the device languages', () => {
    expect(deviceCountry(['cs-CZ', 'en'])).toBe('CZ')
    expect(deviceCountry(['de'])).toBe('DE')
    expect(deviceCountry(['en-US'])).toBe('US')
    expect(deviceCountry(['xx'])).toBeNull()
    expect(deviceCountry([])).toBeNull()
  })

  it('lists real ISO countries only', () => {
    expect(COUNTRY_CODES).toContain('CZ')
    expect(COUNTRY_CODES).toContain('DE')
    expect(COUNTRY_CODES).not.toContain('EU')
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
  })
})
