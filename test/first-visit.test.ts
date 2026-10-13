import { describe, expect, it } from 'vitest'
import { buildDemoData } from '../app/utils/demo'
import { skipsOnboarding } from '../app/utils/firstVisit'
import { emptyData } from '../app/utils/schema'

describe('first visit', () => {
  it('opens the demo garden directly on the web', () => {
    expect(skipsOnboarding(buildDemoData('2026-10-13').settings, false)).toBe(true)
  })

  it('keeps the onboarding in the native app', () => {
    expect(skipsOnboarding(buildDemoData('2026-10-13').settings, true)).toBe(false)
  })

  it('leaves an own or finished garden alone', () => {
    expect(skipsOnboarding(emptyData().settings, false)).toBe(false)
    const demo = buildDemoData('2026-10-13')
    demo.settings.onboarded = true
    expect(skipsOnboarding(demo.settings, false)).toBe(false)
  })
})
