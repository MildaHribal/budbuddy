import { describe, expect, it } from 'vitest'
import { shouldAskSupport } from '../app/utils/supportPrompt'

const DAY = 24 * 3600 * 1000
const now = 100 * DAY
const base = { firstOpen: now - 10 * DAY, opens: 8, lastShown: 0, never: false }

describe('support prompt', () => {
  it('waits for a week of use and a few opens', () => {
    expect(shouldAskSupport({ ...base, firstOpen: now - 3 * DAY }, now, false)).toBe(false)
    expect(shouldAskSupport({ ...base, opens: 2 }, now, false)).toBe(false)
    expect(shouldAskSupport(base, now, false)).toBe(true)
  })

  it('asks at most once a month, less for paying growers, never after opting out', () => {
    expect(shouldAskSupport({ ...base, lastShown: now - 20 * DAY }, now, false)).toBe(false)
    expect(shouldAskSupport({ ...base, lastShown: now - 31 * DAY }, now, false)).toBe(true)
    expect(shouldAskSupport({ ...base, lastShown: now - 31 * DAY }, now, true)).toBe(false)
    expect(shouldAskSupport({ ...base, never: true }, now, false)).toBe(false)
  })
})
