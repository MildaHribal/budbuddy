import { describe, expect, it } from 'vitest'
import { formatDuration, lightState } from '../app/utils/light'

const at = (h: number, m = 0) => new Date(2026, 9, 11, h, m)

describe('lightState', () => {
  it('counts down to lights-off during the day', () => {
    const s = lightState('06:00', 18, at(19, 48))
    expect(s.isOn).toBe(true)
    expect(s.minutesLeft).toBe(4 * 60 + 12)
    expect(s.offLabel).toBe('00:00')
  })

  it('counts down to lights-on in the dark period, across midnight', () => {
    const s = lightState('06:00', 18, at(2, 30))
    expect(s.isOn).toBe(false)
    expect(s.minutesLeft).toBe(3 * 60 + 30)
  })

  it('handles 12/12 and always-on', () => {
    expect(lightState('20:00', 12, at(7, 59)).isOn).toBe(true)
    expect(lightState('20:00', 12, at(8, 0)).isOn).toBe(false)
    expect(lightState('00:00', 24, at(13)).isOn).toBe(true)
  })

  it('formats durations', () => {
    expect(formatDuration(252)).toBe('4 h 12 m')
    expect(formatDuration(9)).toBe('9 m')
  })
})
