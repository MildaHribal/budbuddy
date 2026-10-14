// Balance targets from docs/superpowers/specs/2026-10-13-stinovy-grow-design.md, measured in real hours.
import { beforeAll, describe, expect, it } from 'vitest'
import * as sim from '../shared/game/sim/index.ts'
import * as drying from '../shared/game/drying.ts'
import * as problems from '../shared/game/content/problems.ts'
import type { GameState, PlantSim } from '../shared/game/types.ts'
import { careCheck, fourChecksADay } from './game-sim-fixture.ts'

const { apply, advance, realH } = sim
const toReal = (gameH: number): number => gameH / realH(1)

/** Starter kit + the 90-coin exhaust a sensible first purchase adds, real catalog. */
function starter(strainId = 'first-light-auto', potL = 11, seed = 3): { s: GameState, p: PlantSim } {
  const s = sim.newGame(seed, 0)
  s.coins = 1000
  for (const id of ['base-veg', 'base-bloom', 'calmag-mix']) s.inventory[id] = 1e5
  s.inventory[`pot-soil-${potL}`] = 1
  s.inventory[`seed:${strainId}`] = 1
  expect(apply(s, { t: 'buy', itemId: 'exhaust-150', qty: 1 }).ok).toBe(true)
  expect(apply(s, { t: 'install', tentId: 't1', itemId: 'exhaust-150' }).ok).toBe(true)
  const r = apply(s, { t: 'sow', strainId, tentId: 't1', medium: 'soil', potL }) as { ok: true, data: { plantId: string } }
  return { s, p: s.plants[r.data.plantId]! }
}

/** Hour (game) when `pred` first holds, stepping hour by hour. */
function until(s: GameState, maxH: number, pred: () => boolean): number | null {
  while (s.nowH < maxH) {
    if (pred()) return s.nowH
    advance(s, s.nowH + 1)
  }
  return pred() ? s.nowH : null
}

const PESTS = ['spider_mites', 'thrips', 'aphids', 'fungus_gnats', 'whiteflies', 'caterpillars', 'mealybugs', 'leaf_miners', 'russet_broad_mites', 'root_aphids']
const feed = (stage: string) => stage === 'veg' ? [{ productId: 'base-veg', mlPerL: 6 }] : [{ productId: 'base-bloom', mlPerL: 6 }]

describe('shadow grow balance (real catalog, real problem rules)', () => {
  beforeAll(() => sim.setSimContent({}))

  it('a fully watered 11 L soil pot lasts 5-8 real hours for a medium plant', () => {
    const { s, p } = starter()
    advance(s, 38 * 24)
    apply(s, { t: 'water', plantId: p.id, liters: 6, ph: 6.5, feed: feed(p.stage) })
    expect(p.root.water).toBe(1)
    const start = s.nowH
    const at = until(s, start + realH(12), () => p.root.water < 0.3)
    const hours = toReal(at! - start)
    expect(hours).toBeGreaterThanOrEqual(5)
    expect(hours).toBeLessThanOrEqual(8)
  })

  it('an autoflower is ripe after 24-27 real hours', () => {
    const { s, p } = starter()
    for (let h = 24; h < realH(30); h += 24) {
      advance(s, h)
      if (p.root.water < 0.5) apply(s, { t: 'water', plantId: p.id, liters: 4, ph: 6.5, feed: feed(p.stage) })
      if ((sim.flowerProgress(p, s.nowH) ?? 0) >= 1) break
    }
    const ripe = s.events.find(e => e.kind === 'ripe')!
    expect(toReal(ripe.atH)).toBeGreaterThanOrEqual(23.5)
    expect(toReal(s.nowH)).toBeGreaterThanOrEqual(24)
    expect(toReal(s.nowH)).toBeLessThanOrEqual(27)
  })

  it('a photoperiod flipped after minimal veg finishes in 33-40 real hours', () => {
    for (const strainId of ['snow-veil', 'nordic-haze']) {
      const { s, p } = starter(strainId, 18)
      let flipped = false
      for (let h = 24; h < realH(45); h += 24) {
        advance(s, h)
        if (!flipped && s.nowH >= 35 * 24) flipped = apply(s, { t: 'flip', tentId: 't1' }).ok
        if (p.root.water < 0.5) apply(s, { t: 'water', plantId: p.id, liters: 6, ph: 6.5, feed: feed(p.stage) })
        if ((sim.flowerProgress(p, s.nowH) ?? 0) >= 1) break
      }
      expect(toReal(s.nowH), strainId).toBeGreaterThanOrEqual(33)
      expect(toReal(s.nowH), strainId).toBeLessThanOrEqual(40)
    }
  })

  it('problems need >= 2 real h onset -> clear and >= 3 more to severe', () => {
    const { s, p } = starter()
    advance(s, 30 * 24)
    const sev = () => p.problems.find(x => x.id === 'underwatering')?.severity ?? 0
    const onset = until(s, s.nowH + realH(40), () => sev() > 0)!
    const clear = until(s, s.nowH + realH(40), () => sev() >= 0.4)!
    const severe = until(s, s.nowH + realH(40), () => sev() >= 0.75)!
    expect(toReal(clear - onset)).toBeGreaterThanOrEqual(2)
    expect(toReal(severe - clear)).toBeGreaterThanOrEqual(3)
  })

  it('24 real hours of neglect damage heavily; death needs >= 16 real h in a critical state', () => {
    const { s, p } = starter()
    advance(s, 20 * 24)
    const start = s.nowH
    advance(s, start + realH(24))
    expect(p.damage + (1 - p.health)).toBeGreaterThan(0.6)
    expect(p.dead).toBe(false)
    s.nowH = start
    const { s: s2, p: p2 } = starter()
    advance(s2, 20 * 24)
    const crit = until(s2, start + realH(60), () => p2.health < 0.3)!
    const dead = until(s2, start + realH(80), () => p2.dead)!
    expect(dead).not.toBeNull()
    expect(toReal(dead - crit)).toBeGreaterThanOrEqual(16)
  })

  it('high-pH water locks out micros; a pH-corrected flush and normal feeding bring it back', () => {
    // root chemistry only: random pest onsets would blur it
    sim.setSimContent({ rules: problems.PROBLEM_RULES.filter(r => !PESTS.includes(r.id)) })
    const { s, p } = starter('snow-veil', 11)
    advance(s, 25 * 24)
    const waterDays = (days: number, ph: number, stop?: () => boolean) => {
      for (let d = 0; d < days && !stop?.(); d++) {
        if (p.root.water < 0.45) apply(s, { t: 'water', plantId: p.id, liters: 4.4 * (1 - p.root.water), ph, feed: feed(p.stage) })
        advance(s, s.nowH + 24)
      }
    }
    waterDays(60, 8.5, () => p.root.ph > 6.95 && p.problems.some(x => x.id === 'fe_def' || x.id === 'ph_lockout'))
    expect(p.root.ph).toBeGreaterThan(6.95)
    expect(sim.availability('Fe', p.root.ph, 'soil')).toBeLessThan(sim.availability('N', p.root.ph, 'soil'))
    s.inventory['ph-down'] = 1
    const ph = p.root.ph
    apply(s, { t: 'treat', plantId: p.id, treatmentId: 'ph-down' })
    expect(p.root.ph).toBeCloseTo(ph - 0.5, 5)
    p.root.salts = 0.6
    const ec = p.root.ec
    apply(s, { t: 'flush', plantId: p.id })
    expect(p.root.salts).toBeLessThan(0.15)
    expect(p.root.ec).toBeLessThan(ec)
    expect(p.root.ph).toBeLessThan(6.8)
    waterDays(40, 6.4)
    expect(p.reserves.Fe).toBeGreaterThan(0.7)
    expect(p.problems.find(x => x.id === 'fe_def')?.severity ?? 0).toBeLessThan(0.15)
    sim.setSimContent({})
  })

  it('a careful player checking in 4x a day reaches >= 85 quality and earns upgrade money', () => {
    const { s } = starter('first-light-auto', 11)
    const coins = s.coins
    for (const h of fourChecksADay(4, realH(1))) {
      advance(s, h)
      careCheck(s, sim, drying, problems)
      if (s.history.length) break
    }
    const r = s.history[0]!
    expect(r.quality).toBeGreaterThanOrEqual(85)
    expect(r.dryG).toBeGreaterThanOrEqual(25)
    expect(r.coins).toBeGreaterThanOrEqual(100)
    expect(s.coins).toBeGreaterThan(coins)
  })
})
