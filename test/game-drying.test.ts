import { describe, expect, it } from 'vitest'
import {
  MIN_CURE_H, READY_HI, burpDue, burpJar, dryEtaH, dryingForecast, finishCure, jarBatch, scoreCure, setDryClimate,
  snapTest, startDrying, stepDrying, cureBreakdown, eqRh, hoursToMoisture
} from '../shared/game/drying.ts'
import { REAL_MS_PER_GAME_HOUR, type GameState, type Genome, type PlantSim } from '../shared/game/types.ts'

const genome: Genome = {
  kind: 'photo', autoLifeDays: 80, flowerDays: 63, vigor: 1, stretch: 1.5, yieldPotential: 100, terpenes: 0.6,
  potency: 0.6, moldResistance: 0.5, pestResistance: 0.5, feedDemand: 1, hermRisk: 0.1, leafShape: 0.5, purple: 0
}

function newState(): GameState {
  const plant = { id: 'p1', strainId: 's1', genome, seed: 1, budMass: 80, dead: false, stage: 'harvested' } as PlantSim
  return {
    v: 1, seed: 7, rng: 7, nowH: 1000, syncedAtMs: 0, coins: 0, xp: 0, level: 1, tents: [], plants: { p1: plant },
    inventory: {}, owned: [], drying: [], jars: [], history: [], knowledge: [], customStrains: [], rewardedReal: [],
    events: [], settings: { notifications: false }
  }
}

function tick(s: GameState, h = 1) {
  stepDrying(s, h)
  s.nowH += h
}

interface Plan {
  tempC: number
  rh: number
  /** jar when moisture drops to this (default: snap point) */
  jarAt?: number
  /** force jarring after this many hours even if not ready */
  maxDryH?: number
  burp: 'due' | 'never' | 'often'
  cureH: number
}

function play(plan: Plan) {
  const s = newState()
  const batch = startDrying(s, 'p1')!
  expect(setDryClimate(s, batch.id, plan.tempC, plan.rh).ok).toBe(true)
  let dryH = 0
  while (batch.moisture > (plan.jarAt ?? READY_HI) && dryH < (plan.maxDryH ?? 600)) {
    tick(s)
    dryH++
  }
  expect(jarBatch(s, batch.id).ok).toBe(true)
  const jar = s.jars[0]!
  let burps = 0
  let lastBurp = -99
  for (let h = 0; h < plan.cureH; h++) {
    // a player checks the jars every few real minutes, not every game hour
    const want = plan.burp === 'often' ? h % 3 === 0 : plan.burp === 'due' && h - lastBurp >= 6 && burpDue(s, jar)
    if (want) {
      burpJar(s, jar.id)
      burps++
      lastBurp = h
    }
    tick(s)
  }
  const done = finishCure(s, jar.id)
  expect(done.ok).toBe(true)
  return { s, batch, jar, dryH, burps, score: scoreCure(batch, jar), bd: cureBreakdown(batch, jar) }
}

const GOOD: Plan = { tempC: 19, rh: 60, burp: 'due', cureH: 300 }

describe('drying curves', () => {
  it('are deterministic', () => {
    const a = play(GOOD)
    const b = play(GOOD)
    expect(JSON.stringify(a.s)).toBe(JSON.stringify(b.s))
  })

  it('a slow dry in the guide range lands at 2-4 real hours', () => {
    for (const [t, rh] of [[18, 55], [19, 60], [20, 58], [20, 62], [18, 62], [20, 55]] as const) {
      const h = hoursToMoisture(0.75, READY_HI, t, rh)!
      const realH = h * REAL_MS_PER_GAME_HOUR / 3_600_000
      expect(realH, `${t} °C / ${rh} %`).toBeGreaterThan(1.9)
      expect(realH, `${t} °C / ${rh} %`).toBeLessThan(4.2)
    }
  })

  it('hot and dry air races through in under an hour of real time', () => {
    const h = hoursToMoisture(0.75, READY_HI, 27, 38)!
    expect(h * REAL_MS_PER_GAME_HOUR / 3_600_000).toBeLessThan(1)
  })

  it('humid air never gets buds to the snap point', () => {
    expect(hoursToMoisture(0.75, READY_HI, 17, 75)).toBeNull()
  })

  it('stepping matches the closed-form eta', () => {
    const s = newState()
    const b = startDrying(s, 'p1')!
    setDryClimate(s, b.id, 19, 60)
    const eta = dryEtaH(b)!
    let n = 0
    while (b.moisture > READY_HI) {
      tick(s)
      n++
    }
    expect(Math.abs(n - eta)).toBeLessThan(2)
  })

  it('snap test walks bend, small snap, snap, brittle', () => {
    expect(snapTest(0.4)).toBe('bend')
    expect(snapTest(0.16)).toBe('small-snap')
    expect(snapTest(0.13)).toBe('snap')
    expect(snapTest(0.08)).toBe('brittle')
  })

  it('jar RH follows bud moisture: 10 % → 55, 12 % → 62', () => {
    expect(eqRh(0.1)).toBeCloseTo(55)
    expect(eqRh(0.12)).toBeCloseTo(62)
  })
})

describe('cure score', () => {
  const good = play(GOOD)

  it('good practice scores high and keeps the batch whole', () => {
    expect(good.score).toBeGreaterThan(0.78)
    expect(good.bd.cleanliness).toBeGreaterThan(0.97)
    expect(good.dryH * REAL_MS_PER_GAME_HOUR / 3_600_000).toBeGreaterThan(2)
    expect(good.burps).toBeGreaterThanOrEqual(3)
    expect(good.burps).toBeLessThan(15)
    expect(good.s.events.filter(e => e.id.startsWith('mold'))).toEqual([])
  })

  it('hot and dry loses aroma', () => {
    const r = play({ ...GOOD, tempC: 27, rh: 38 })
    expect(r.bd.aroma).toBeLessThan(good.bd.aroma - 0.15)
    expect(r.score).toBeLessThan(good.score - 0.15)
  })

  it('cold and humid grows mold and costs grams', () => {
    const r = play({ ...GOOD, tempC: 16, rh: 74, maxDryH: 320, jarAt: 0 })
    expect(r.batch.moldRisk).toBeGreaterThan(0.5)
    expect(r.score).toBeLessThan(good.score - 0.2)
  })

  it('jarring early spikes jar RH and mold', () => {
    const r = play({ ...GOOD, jarAt: 0.24 })
    expect(r.jar.moldRisk).toBeGreaterThan(0.2)
    expect(r.score).toBeLessThan(good.score - 0.1)
  })

  it('never burping is penalized', () => {
    const r = play({ ...GOOD, burp: 'never' })
    expect(r.jar.moldRisk).toBeGreaterThan(good.jar.moldRisk + 0.15)
    expect(r.score).toBeLessThan(good.score - 0.08)
  })

  it('burping every few hours dries the buds out', () => {
    const r = play({ ...GOOD, burp: 'often' })
    expect(r.batch.moisture).toBeLessThan(0.1)
    expect(r.score).toBeLessThan(good.score - 0.08)
  })

  it('a longer cure helps with diminishing returns', () => {
    const short = play({ ...GOOD, cureH: MIN_CURE_H })
    const long = play({ ...GOOD, cureH: 432 })
    const longer = play({ ...GOOD, cureH: 650 })
    expect(long.score).toBeGreaterThan(short.score)
    expect(longer.score - long.score).toBeLessThan(long.score - short.score)
  })
})

describe('actions', () => {
  it('validates ids, ranges and timing', () => {
    const s = newState()
    expect(setDryClimate(s, 'nope', 20, 60)).toMatchObject({ ok: false, reason: 'not-found' })
    const b = startDrying(s, 'p1')!
    expect(startDrying(s, 'p1')).toBeNull()
    setDryClimate(s, b.id, 50, 0.99)
    expect([b.tempC, b.rh]).toEqual([30, 80])
    expect(jarBatch(s, b.id)).toMatchObject({ ok: false, reason: 'invalid' })
    b.moisture = 0.14
    expect(jarBatch(s, b.id).ok).toBe(true)
    const jar = s.jars[0]!
    expect(finishCure(s, jar.id)).toMatchObject({ ok: false, reason: 'invalid' })
    s.nowH += MIN_CURE_H
    const done = finishCure(s, jar.id)
    expect(done.ok).toBe(true)
    expect(burpJar(s, jar.id).ok).toBe(false)
  })

  it('forecasts dry-done and burp windows', () => {
    const s = newState()
    const b = startDrying(s, 'p1')!
    setDryClimate(s, b.id, 19, 60)
    const [f] = dryingForecast(s)
    expect(f).toMatchObject({ kind: 'dry-done', batchId: b.id })
    expect(f!.atH - s.nowH).toBeGreaterThan(150)
    b.moisture = 0.13
    jarBatch(s, b.id)
    const burp = dryingForecast(s).find(x => x.kind === 'burp')!
    expect(burp.atH - s.nowH).toBeGreaterThan(5)
    expect(burp.atH - s.nowH).toBeLessThan(40)
  })
})

describe('report', () => {
  it('prints the mechanics table', () => {
    const rows: Record<string, Plan> = {
      good: GOOD,
      hotDry: { ...GOOD, tempC: 27, rh: 38 },
      humid: { ...GOOD, tempC: 16, rh: 74, maxDryH: 320, jarAt: 0 },
      early: { ...GOOD, jarAt: 0.24 },
      noBurp: { ...GOOD, burp: 'never' },
      often: { ...GOOD, burp: 'often' },
      short: { ...GOOD, cureH: MIN_CURE_H },
      long: { ...GOOD, cureH: 432 }
    }
    const out = Object.entries(rows).map(([k, p]) => {
      const r = play(p)
      return { k, dryH: r.dryH, realDryH: +(r.dryH * REAL_MS_PER_GAME_HOUR / 3.6e6).toFixed(2), burps: r.burps, m: +r.batch.moisture.toFixed(3), jarRh: +r.jar.jarRh.toFixed(1), terp: +r.batch.terpeneLoss.toFixed(3), mold: +Math.max(r.batch.moldRisk, r.jar.moldRisk).toFixed(3), cure: +r.jar.cureQuality.toFixed(3), g: +r.jar.dryG.toFixed(1), score: +r.score.toFixed(3) }
    })
    if (process.env.DRY_REPORT) console.table(out)
    expect(out.length).toBe(8)
  })
})
