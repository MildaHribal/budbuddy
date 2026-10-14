import { describe, expect, it } from 'vitest'
import { MAX_RATE_EARLY, MAX_RATE_LATE, PHASES, PROBLEM_RULES, SEED_LOAD } from '../shared/game/content/problems'
import { GAME_DAY_REAL_MIN, REAL_MS_PER_GAME_HOUR } from '../shared/game/types'
import type { ProblemId } from '../shared/game/types'
import { activate, ALL_IDS, BAD, badScene, ctxOf, IDEAL, NOW_H, PESTS, ruleOf } from './game-problems-fixtures'
import type { IdealName, Scene } from './game-problems-fixtures'

const GAME_H_PER_REAL_H = 3_600_000 / REAL_MS_PER_GAME_HOUR
const NO_CURE: ProblemId[] = ['hlvd', 'fusarium_wilt']
/** leaf diseases stop spreading in normal air but only really clear in dry, moving air or with treatment */
const HOLDS: ProblemId[] = ['powdery_mildew', 'septoria']

/** Runs a rule hour by hour on a scene; returns the hour each phase threshold was first reached. */
function run(id: ProblemId, s: Scene, maxH: number) {
  const rule = ruleOf(id)
  const c = BAD[id]
  const p = activate(s, id, { severity: 0.001, ...c.seed, load: c.seed?.load === undefined ? undefined : SEED_LOAD })
  const reached: (number | undefined)[] = [undefined, undefined, undefined]
  for (let h = 0; h < maxH; h++) {
    const ctx = ctxOf(s, c.rand, NOW_H + h)
    p.severity = Math.min(1, Math.max(0, p.severity + rule.pressure(ctx)))
    rule.effect?.(ctx, p)
    PHASES.forEach((t, i) => {
      if (reached[i] === undefined && p.severity >= t) reached[i] = h
    })
  }
  return { reached, p }
}

describe('problem rules', () => {
  it('has exactly one rule per problem id', () => {
    expect(PROBLEM_RULES.map(r => r.id).sort()).toEqual([...ALL_IDS].sort())
  })

  it('timing constants follow the real-time balance targets', () => {
    expect(GAME_H_PER_REAL_H).toBeCloseTo(60 * 24 / GAME_DAY_REAL_MIN)
    expect(PHASES[1] / MAX_RATE_EARLY).toBeGreaterThanOrEqual(2 * GAME_H_PER_REAL_H)
    expect((PHASES[2] - PHASES[1]) / MAX_RATE_LATE).toBeGreaterThanOrEqual(3 * GAME_H_PER_REAL_H)
  })

  for (const name of Object.keys(IDEAL) as IdealName[]) {
    it(`no problem starts under ideal conditions: ${name}`, () => {
      for (const r of PROBLEM_RULES) {
        const s = IDEAL[name]()
        expect(r.pressure(ctxOf(s)), r.id).toBe(0)
      }
    })
  }

  it.each(ALL_IDS)('%s builds pressure under its bad conditions', (id) => {
    const c = BAD[id]
    const s = badScene(id)
    if (c.seed) activate(s, id, c.seed)
    const pr = ruleOf(id).pressure(ctxOf(s, c.rand))
    expect(pr).toBeGreaterThan(0)
    expect(pr).toBeLessThanOrEqual(MAX_RATE_EARLY + 1e-12)
  })

  it.each(ALL_IDS)('%s respects the real-time phase targets under bad conditions', (id) => {
    const { reached } = run(id, badScene(id), 4000)
    if (id !== 'transplant_shock') expect(reached[1], 'never reaches clear').toBeDefined()
    if (reached[1] !== undefined) expect(reached[1]).toBeGreaterThanOrEqual(2 * GAME_H_PER_REAL_H)
    if (reached[1] !== undefined && reached[2] !== undefined) expect(reached[2] - reached[1]).toBeGreaterThanOrEqual(3 * GAME_H_PER_REAL_H)
  })

  it.each(ALL_IDS.filter(id => !PESTS.includes(id) && !NO_CURE.includes(id) && id !== 'botrytis'))('%s heals or holds once conditions are fixed', (id) => {
    const s = IDEAL[BAD[id].base]()
    activate(s, id, { severity: 0.3, onsetH: NOW_H - 1000 })
    const pr = ruleOf(id).pressure(ctxOf(s))
    if (HOLDS.includes(id)) expect(pr).toBeLessThanOrEqual(0)
    else expect(pr).toBeLessThan(0)
  })

  it.each(HOLDS)('%s clears in dry, moving air', (id) => {
    const s = IDEAL.vegDay()
    s.tent.env.rh = 45
    activate(s, id, { severity: 0.3 })
    expect(ruleOf(id).pressure(ctxOf(s))).toBeLessThan(0)
  })

  it('heals slower than it worsens for lasting leaf damage', () => {
    for (const id of ['n_def', 'mg_def', 'light_burn', 'nutrient_burn'] as ProblemId[]) {
      const s = IDEAL[BAD[id].base]()
      activate(s, id, { severity: 0.3 })
      expect(-ruleOf(id).pressure(ctxOf(s))).toBeLessThan(MAX_RATE_EARLY)
    }
  })

  it('a wilted plant perks up much faster than it wilted', () => {
    const s = IDEAL.vegDay()
    activate(s, 'underwatering', { severity: 0.3 })
    expect(-ruleOf('underwatering').pressure(ctxOf(s))).toBeGreaterThan(MAX_RATE_EARLY * 4)
  })

  it.each(NO_CURE)('%s keeps progressing after conditions are fixed', (id) => {
    const s = IDEAL.vegDay()
    activate(s, id, { severity: 0.3 })
    expect(ruleOf(id).pressure(ctxOf(s))).toBeGreaterThan(0)
  })

  it('rules are inert for dead or harvested plants', () => {
    for (const id of ALL_IDS) {
      const s = badScene(id)
      s.plant.dead = true
      s.plant.stage = 'dead'
      if (BAD[id].seed) activate(s, id, BAD[id].seed)
      expect(ruleOf(id).pressure(ctxOf(s, BAD[id].rand)), id).toBe(0)
    }
  })
})

describe('specific triggers', () => {
  it('pH lockout follows the window of the medium', () => {
    const soil = IDEAL.vegDay()
    soil.plant.root.ph = 5.7
    expect(ruleOf('ph_lockout').pressure(ctxOf(soil))).toBeGreaterThan(0)
    const coco = IDEAL.flowerDay()
    coco.plant.root.ph = 5.7
    expect(ruleOf('ph_lockout').pressure(ctxOf(coco))).toBe(0)
  })

  it('late-flower nitrogen fade is not a deficiency', () => {
    const s = IDEAL.ripening()
    expect(s.plant.reserves.N).toBeLessThan(0.6)
    expect(ruleOf('n_def').pressure(ctxOf(s))).toBe(0)
  })

  it('flushing a hungry plant makes nitrogen deficiency worse', () => {
    const s = badScene('n_def')
    s.plant.reserves.N = 0.5
    const plain = activate(s, 'n_def', { severity: 0.2 })
    const before = ruleOf('n_def').pressure(ctxOf(s))
    plain.treatedWith = 'flush-water'
    plain.treatedAtH = NOW_H - 2
    expect(ruleOf('n_def').pressure(ctxOf(s))).toBeGreaterThan(before)
  })

  it('light leaks only matter for photoperiod plants in the dark', () => {
    const s = badScene('light_leak_stress')
    s.plant.genome.kind = 'auto'
    expect(ruleOf('light_leak_stress').pressure(ctxOf(s))).toBe(0)
    const day = badScene('light_leak_stress')
    day.tent.env.lightsOn = true
    expect(ruleOf('light_leak_stress').pressure(ctxOf(day))).toBe(0)
  })

  it('a hermed plant keeps throwing pods', () => {
    const s = IDEAL.flowerDay()
    s.plant.hermed = true
    expect(ruleOf('hermaphrodite').pressure(ctxOf(s))).toBeGreaterThan(0)
  })

  it('hermaphrodite risk grows with genome.hermRisk', () => {
    const lo = badScene('hermaphrodite')
    lo.plant.genome.hermRisk = 0.05
    const hi = badScene('hermaphrodite')
    hi.plant.genome.hermRisk = 0.6
    expect(ruleOf('hermaphrodite').pressure(ctxOf(hi))).toBeGreaterThan(ruleOf('hermaphrodite').pressure(ctxOf(lo)))
  })

  it('botrytis needs late flower and is worse for weak genetics and after spraying buds', () => {
    const veg = badScene('botrytis')
    veg.plant.stage = 'veg'
    veg.plant.ripeness = 0
    expect(ruleOf('botrytis').pressure(ctxOf(veg))).toBe(0)
    const strong = badScene('botrytis')
    strong.tent.env.rh = 60
    strong.plant.genome.moldResistance = 0.95
    const weak = badScene('botrytis')
    weak.tent.env.rh = 60
    weak.plant.genome.moldResistance = 0.1
    expect(ruleOf('botrytis').pressure(ctxOf(weak))).toBeGreaterThan(ruleOf('botrytis').pressure(ctxOf(strong)))
    const sprayed = IDEAL.flowerDay()
    sprayed.tent.env.rh = 52
    activate(sprayed, 'spider_mites', { load: 0.2, treatedWith: 'neem-oil', treatedAtH: NOW_H - 3 })
    expect(ruleOf('botrytis').pressure(ctxOf(sprayed))).toBeGreaterThan(0)
  })

  it('caterpillar damage invites bud rot', () => {
    const s = IDEAL.flowerDay()
    activate(s, 'caterpillars', { load: 0.5 })
    expect(ruleOf('botrytis').pressure(ctxOf(s))).toBeGreaterThan(0)
  })

  it('hydro roots rot in a warm reservoir', () => {
    const s = IDEAL.hydroVeg()
    s.tent.env.tempC = 29
    expect(ruleOf('root_rot').pressure(ctxOf(s))).toBeGreaterThan(0)
  })

  it('a single normal watering does not reach a visible overwatering phase', () => {
    const s = IDEAL.vegDay()
    const rule = ruleOf('overwatering')
    const p = activate(s, 'overwatering', { severity: 0 })
    // a pot drying from full to 0.85 over ~3 game days
    for (let h = 0; h < 80; h++) {
      s.plant.root.water = 1 - h * 0.002
      p.severity = Math.max(0, p.severity + rule.pressure(ctxOf(s, undefined, NOW_H + h)))
    }
    expect(p.severity).toBeLessThan(PHASES[0])
  })

  it('a strong fan hurts seedlings sooner than big plants', () => {
    const seed = IDEAL.seedling()
    seed.tent.env.airflow = 0.7
    expect(ruleOf('wind_burn').pressure(ctxOf(seed))).toBeGreaterThan(0)
    const big = IDEAL.vegDay()
    big.tent.env.airflow = 0.7
    expect(ruleOf('wind_burn').pressure(ctxOf(big))).toBe(0)
  })

  it('transplant shock passes after a few days in good conditions', () => {
    const s = IDEAL.vegDay()
    activate(s, 'transplant_shock', { severity: 0.1, onsetH: NOW_H - 10 })
    expect(ruleOf('transplant_shock').pressure(ctxOf(s))).toBeGreaterThan(0)
    expect(ruleOf('transplant_shock').pressure(ctxOf(s, undefined, NOW_H + 100))).toBeLessThan(0)
  })

  it('hlvd onset is rare and random', () => {
    let hits = 0
    let seed = 7
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < 20000; i++) if (ruleOf('hlvd').pressure(ctxOf(IDEAL.vegDay(), rand)) > 0) hits++
    expect(hits).toBeLessThan(10)
  })
})
