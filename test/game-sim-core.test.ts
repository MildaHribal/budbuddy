import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import * as sim from '../shared/game/sim/index.ts'
import { REAL_MS_PER_GAME_HOUR } from '../shared/game/types.ts'
import type { ChallengeDef, GameAction, GameState } from '../shared/game/types.ts'
import { FIXTURE, recipe, stock } from './game-sim-fixture.ts'

const { apply, advance, newGame, setSimContent } = sim

function sown(seed = 1, strainId = 'auto'): { s: GameState, id: string } {
  const s = newGame(seed, 0)
  stock(s)
  s.inventory['seed:photo'] = 2
  const r = apply(s, { t: 'sow', strainId, tentId: 't1', medium: 'soil', potL: 11 })
  expect(r.ok).toBe(true)
  return { s, id: (r as { data: { plantId: string } }).data.plantId }
}

/** a short scripted grow: water by recipe whenever the pot is below 45 % */
function play(s: GameState, id: string, untilH: number): GameAction[] {
  const done: GameAction[] = []
  while (s.nowH < untilH) {
    advance(s, s.nowH + 24)
    const p = s.plants[id]
    if (!p || p.dead || p.stage === 'harvested') break
    if (p.root.water < 0.45) {
      const r = recipe(p.stage, p.medium, (s.nowH - p.sownAtH) / 24)
      const a: GameAction = { t: 'water', plantId: id, liters: 3, ph: r.ph, feed: r.feed }
      apply(s, a)
      done.push(a)
    }
  }
  return done
}

describe('shadow grow sim core', () => {
  beforeEach(() => setSimContent(FIXTURE))
  afterAll(() => setSimContent({}))

  it('starts a new game from the starter kit', () => {
    const s = newGame(42, 1000)
    expect(s.coins).toBe(300)
    expect(s.tents[0]).toMatchObject({ tentItem: 'tent60', light: 'led100', gear: ['exhaust100', 'clipfan'] })
    expect(s.inventory['seed:auto']).toBe(2)
    expect(s.owned).toContain('led100')
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })

  it('is deterministic for the same seed and actions', () => {
    const a = sown(7)
    const b = sown(7)
    play(a.s, a.id, 50 * 24)
    play(b.s, b.id, 50 * 24)
    expect(JSON.stringify(a.s)).toBe(JSON.stringify(b.s))
  })

  it('survives a JSON save/load round trip mid-grow', () => {
    const { s, id } = sown(3)
    play(s, id, 30 * 24)
    const loaded = JSON.parse(JSON.stringify(s)) as GameState
    play(s, id, 60 * 24)
    play(loaded, id, 60 * 24)
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(s))
  })

  it('gives the same state whether time is synced in chunks or at once', () => {
    const a = sown(5)
    const b = sown(5)
    const start = a.s.syncedAtMs
    for (let m = 1; m <= 90; m++) sim.syncToNow(a.s, start + m * 61_000)
    sim.syncToNow(b.s, start + 90 * 61_000)
    expect(a.s.nowH).toBe(b.s.nowH)
    expect(JSON.stringify(a.s.plants)).toBe(JSON.stringify(b.s.plants))
  })

  it('caps offline catch-up at 3 real days', () => {
    const { s } = sown(1)
    sim.syncToNow(s, s.syncedAtMs + 10 * 24 * 3_600_000)
    expect(s.nowH).toBe(Math.floor((3 * 24 * 3_600_000) / REAL_MS_PER_GAME_HOUR))
    expect(sim.msToGameHour(s, s.syncedAtMs)).toBe(s.nowH)
    expect(sim.gameHourToMs(s, s.nowH + 1) - s.syncedAtMs).toBeCloseTo(REAL_MS_PER_GAME_HOUR)
  })

  it('rejects unknown ids and bad input without throwing', () => {
    const { s, id } = sown(1)
    const bad: GameAction[] = [
      { t: 'water', plantId: 'nope', liters: 1, ph: 6.5, feed: [] },
      { t: 'water', plantId: id, liters: 1, ph: 6.5, feed: [{ productId: 'ghost', mlPerL: 2 }] },
      { t: 'water', plantId: id, liters: Number.NaN, ph: 6.5, feed: [] },
      { t: 'sow', strainId: 'ghost', tentId: 't1', medium: 'soil', potL: 11 },
      { t: 'buy', itemId: 'ghost', qty: 1 },
      { t: 'buy', itemId: 'grow@333', qty: 1 },
      { t: 'install', tentId: 't1', itemId: 'led240' },
      { t: 'treat', plantId: id, treatmentId: 'ghost' },
      { t: 'climate', tentId: 't1', tempC: 80, rh: 50 },
      { t: 'jar', batchId: 'ghost' },
      { t: 'finishCure', jarId: 'ghost' },
      { t: 'breed', motherId: id, fatherId: id, name: 'x' },
      { t: 'harvest', plantId: id }
    ]
    for (const a of bad) expect(apply(s, a).ok, a.t).toBe(false)
    expect(apply(s, { t: 'bogus' } as unknown as GameAction).ok).toBe(false)
  })

  it('buys with the catalog id conventions and respects money and levels', () => {
    const s = newGame(1, 0)
    expect(apply(s, { t: 'buy', itemId: 'grow@250', qty: 2 }).ok).toBe(true)
    expect(s.inventory.grow).toBe(500)
    expect(apply(s, { t: 'buy', itemId: 'seed:photo', qty: 1 }).ok).toBe(true)
    expect(s.inventory['seed:photo']).toBe(1)
    expect(apply(s, { t: 'buy', itemId: 'scanner-credit', qty: 1 }).ok).toBe(true)
    expect(apply(s, { t: 'buy', itemId: 'locked-light', qty: 1 })).toMatchObject({ ok: false, reason: 'locked' })
    s.coins = 10
    expect(apply(s, { t: 'buy', itemId: 'led240', qty: 1 })).toMatchObject({ ok: false, reason: 'no-money' })
    s.coins = 1000
    expect(apply(s, { t: 'buy', itemId: 'led240', qty: 1 }).ok).toBe(true)
    expect(apply(s, { t: 'install', tentId: 't1', itemId: 'led240' }).ok).toBe(true)
    expect(s.tents[0]!.light).toBe('led240')
    expect(apply(s, { t: 'buy', itemId: 'tent100', qty: 1 }).ok).toBe(true)
    expect(apply(s, { t: 'install', tentId: 't2', itemId: 'tent100' }).ok).toBe(true)
    expect(s.tents).toHaveLength(2)
  })

  it('logs successful actions only', () => {
    const { s, id } = sown(1)
    s.log = []
    apply(s, { t: 'water', plantId: id, liters: 1, ph: 6.5, feed: [] })
    apply(s, { t: 'water', plantId: 'ghost', liters: 1, ph: 6.5, feed: [] })
    expect(s.log).toHaveLength(1)
    expect(s.log[0]!.atH).toBe(s.nowH)
  })

  it('replays a challenge to the same score as live play', () => {
    const def: ChallengeDef = { id: 'c1', week: '2026-W42', seed: 99, strainId: 'auto', medium: 'soil', potL: 11, tentItem: 'tent60', light: 'led100', gear: ['exhaust100'], startCoins: 500, eventsSeed: 4 }
    const live = sim.newChallenge(def, 0)
    const id = Object.keys(live.plants)[0]!
    apply(live, { t: 'buy', itemId: 'grow@1000', qty: 1 })
    apply(live, { t: 'buy', itemId: 'bloom@1000', qty: 2 })
    for (let h = 24; h < 90 * 24; h += 24) {
      sim.syncToNow(live, live.syncedAtMs + 24 * REAL_MS_PER_GAME_HOUR)
      const p = live.plants[id]
      if (!p || p.stage === 'harvested') break
      if (p.root.water < 0.45) {
        const r = recipe(p.stage, 'soil', (live.nowH - p.sownAtH) / 24)
        apply(live, { t: 'water', plantId: id, liters: 3, ph: r.ph, feed: r.feed.filter(f => f.productId !== 'calmag') })
      }
      const fp = sim.flowerProgress(p, live.nowH)
      if (fp !== null && fp >= 0.95) apply(live, { t: 'harvest', plantId: id })
    }
    const score = sim.challengeScore(live)
    expect(score.dryG).toBeGreaterThan(0)
    const replayed = sim.replayChallenge(def, JSON.parse(JSON.stringify(live.log)))
    expect(replayed).toEqual(score)
  })

  it('observes signs and only metered readings', () => {
    const { s, id } = sown(1)
    advance(s, 30 * 24)
    s.plants[id]!.problems.push({ id: 'n_def', severity: 0.5, onsetH: s.nowH })
    let o = sim.observe(s, id)
    expect(o.signs).toHaveLength(1)
    expect(o.signs[0]!.phase).toBe('clear')
    expect(o.signs[0]!.lines[0]!.en).toBe('n_def clear')
    expect(JSON.stringify(o.signs)).not.toContain('"n_def"')
    expect(o.readings).toEqual({})
    s.owned.push('phpen', 'thermo')
    s.tents[0]!.gear.push('phpen', 'thermo')
    o = sim.observe(s, id)
    expect(o.readings.ph).toBeTypeOf('number')
    expect(o.readings.tempC).toBeTypeOf('number')
    expect(o.readings.ec).toBeUndefined()
  })

  it('maps problems and water to visual symptoms', () => {
    const { s, id } = sown(1)
    advance(s, 40 * 24)
    const p = s.plants[id]!
    p.problems.push({ id: 'spider_mites', severity: 0.8, onsetH: s.nowH })
    p.root.water = 0.05
    const v = sim.plantVisual(p, s.tents[0]!)
    const kinds = v.symptoms.map(x => x.kind)
    expect(kinds).toContain('stipple')
    expect(kinds).toContain('droop')
    expect(kinds).toContain('wilt')
    expect(v.heightCm).toBeGreaterThan(10)
    expect(v.life).toBeGreaterThan(0.3)
    expect(v.life).toBeLessThan(0.7)
  })

  it('diagnosis pays once, wrong guesses cost xp, scanner reveals problems', () => {
    const { s, id } = sown(1)
    advance(s, 20 * 24)
    s.plants[id]!.problems.push({ id: 'n_def', severity: 0.3, onsetH: s.nowH })
    s.xp = 50
    expect(apply(s, { t: 'diagnose', plantId: id, problemId: 'mg_def' })).toMatchObject({ ok: true, data: { correct: false } })
    expect(s.xp).toBe(45)
    const coins = s.coins
    apply(s, { t: 'diagnose', plantId: id, problemId: 'n_def' })
    apply(s, { t: 'diagnose', plantId: id, problemId: 'n_def' })
    expect(s.coins).toBe(coins + 10)
    expect(s.knowledge).toEqual(['n_def'])
    expect(apply(s, { t: 'scan', plantId: id })).toMatchObject({ ok: false, reason: 'no-item' })
    apply(s, { t: 'buy', itemId: 'scanner-credit', qty: 1 })
    expect(apply(s, { t: 'scan', plantId: id })).toMatchObject({ ok: true, data: [{ id: 'n_def', phase: 'subtle' }] })
  })

  it('a helping treatment beats a spreading disease, a wrong one does not', () => {
    const run = (treatment: string) => {
      const { s, id } = sown(2)
      advance(s, 25 * 24)
      s.plants[id]!.problems.push({ id: 'powdery_mildew', severity: 0.2, onsetH: s.nowH })
      s.inventory['sulfur-spray'] = 1
      expect(apply(s, { t: 'treat', plantId: id, treatmentId: treatment }).ok).toBe(true)
      advance(s, s.nowH + 96)
      return s.plants[id]!.problems.find(p => p.id === 'powdery_mildew')?.severity ?? 0
    }
    expect(run('sulfur-spray')).toBe(0)
    expect(run('fan-up')).toBeGreaterThan(0.3)
    expect(apply(newGame(1, 0), { t: 'treat', plantId: 'x', treatmentId: 'sulfur-spray' }).ok).toBe(false)
  })

  it('forecasts thirst and ripeness', () => {
    const { s, id } = sown(1)
    advance(s, 40 * 24)
    apply(s, { t: 'water', plantId: id, liters: 5, ph: 6.5, feed: [] })
    const f = sim.forecast(s, 60 * 24)
    const thirsty = f.find(x => x.kind === 'thirsty')
    const ripe = f.find(x => x.kind === 'ripe')
    expect(thirsty?.plantId).toBe(id)
    expect(thirsty!.atH).toBeGreaterThan(s.nowH)
    expect(ripe?.atH).toBeGreaterThan(thirsty!.atH)
    expect(f.map(x => x.atH)).toEqual([...f.map(x => x.atH)].sort((a, b) => a - b))
    const before = JSON.stringify(s)
    sim.forecast(s, 100)
    expect(JSON.stringify(s)).toBe(before)
  })

  it('harvest moves the plant out of the tent and keeps a pending result until the cure ends', () => {
    const { s, id } = sown(1)
    play(s, id, 72 * 24)
    const r = apply(s, { t: 'harvest', plantId: id })
    expect(r.ok).toBe(true)
    expect(s.plants[id]!.stage).toBe('harvested')
    expect(s.tents[0]!.plantIds).not.toContain(id)
    expect(s.pending).toHaveLength(1)
    expect(s.drying).toHaveLength(1)
    expect(s.pending![0]!.dryG).toBeGreaterThan(10)
  })
})

describe('shadow grow sim events and pots', () => {
  afterAll(() => setSimContent({}))

  it('random events do not depend on player actions and hit the climate', () => {
    setSimContent({ ...FIXTURE, randomEvents: [{ kind: 'heatwave', chancePerDay: 0.5, minLevel: 1, durationH: 48, magnitude: 8, text: { en: 'hot', cs: 'horko' } }] })
    const a = sown(11)
    const b = sown(11)
    apply(b.s, { t: 'water', plantId: b.id, liters: 2, ph: 6.5, feed: [] })
    advance(a.s, 20 * 24)
    advance(b.s, 20 * 24)
    const heat = (s: GameState) => s.events.filter(e => e.kind === 'heatwave').map(e => e.atH)
    expect(heat(a.s).length).toBeGreaterThan(3)
    expect(heat(a.s)).toEqual(heat(b.s))
    const at = heat(a.s)[0]!
    const c = sown(11)
    advance(c.s, at + 30)
    const hot = c.s.tents[0]!.env.tempC
    setSimContent(FIXTURE)
    const d = sown(11)
    advance(d.s, at + 30)
    expect(hot - d.s.tents[0]!.env.tempC).toBeGreaterThan(5)
  })

  it('a light leak during flowering makes a photoperiod herm', () => {
    setSimContent(FIXTURE)
    const { s, id } = sown(4, 'photo')
    s.tents[0]!.tentItem = 'tent60leaky'
    apply(s, { t: 'flip', tentId: 't1' })
    advance(s, 60 * 24)
    expect(s.plants[id]!.hermed).toBe(true)
    expect(s.events.some(e => e.kind === 'herm' && e.plantId === id)).toBe(true)
  })

  it('consumes a matching pot from stock when the catalog sells pots', () => {
    setSimContent({})
    const s = newGame(1, 0)
    expect(s.inventory['pot-soil-11']).toBe(2)
    s.inventory['pot-soil-11'] = 0
    expect(apply(s, { t: 'sow', strainId: 'first-light-auto', tentId: 't1', medium: 'soil', potL: 11 })).toMatchObject({ ok: false, reason: 'no-item' })
    expect(apply(s, { t: 'buy', itemId: 'pot-soil-11', qty: 1 }).ok).toBe(true)
    expect(apply(s, { t: 'sow', strainId: 'first-light-auto', tentId: 't1', medium: 'soil', potL: 11 }).ok).toBe(true)
    expect(s.inventory['pot-soil-11']).toBe(0)
    expect(apply(s, { t: 'sow', strainId: 'first-light-auto', tentId: 't1', medium: 'soil', potL: 13 }).ok).toBe(false)
  })
})

describe('shadow grow sim performance', () => {
  afterAll(() => setSimContent({}))

  it('catches up 3 real days for 20 plants with the real content quickly', async () => {
    setSimContent({})
    const { newTent } = await import('../shared/game/sim/state.ts')
    const s = newGame(7, 0)
    s.tents = []
    for (let t = 0; t < 4; t++) {
      const tent = newTent(`t${t}`, 'tent-120', 'light-fs-720', ['exhaust-400', 'fan-clip', 'irrigation-drip'])
      tent.dim = 0.4
      tent.lastFeed = { ph: 6.4, feed: [{ productId: 'base-veg', mlPerL: 4 }, { productId: 'calmag-mix', mlPerL: 1 }] }
      s.tents.push(tent)
    }
    s.inventory['base-veg'] = 1e7
    s.inventory['calmag-mix'] = 1e7
    s.inventory['seed:snow-veil'] = 20
    s.inventory['pot-soil-11'] = 20
    for (let i = 0; i < 20; i++) expect(apply(s, { t: 'sow', strainId: 'snow-veil', tentId: `t${i % 4}`, medium: 'soil', potL: 11 }).ok).toBe(true)
    const t0 = performance.now()
    sim.syncToNow(s, s.syncedAtMs + 3 * 24 * 3_600_000)
    const ms = performance.now() - t0
    expect(s.nowH).toBe(216 * 24)
    expect(Object.values(s.plants).filter(p => !p.dead)).toHaveLength(20)
    expect(ms).toBeLessThan(1500)
  })
})
