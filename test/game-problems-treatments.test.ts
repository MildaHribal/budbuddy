import { describe, expect, it } from 'vitest'
import { TREATMENTS } from '../shared/game/content/catalog'
import { PROBLEM_TREATMENTS } from '../shared/game/content/problems'
import type { ActiveProblem, ProblemId } from '../shared/game/types'
import { activate, ALL_IDS, badScene, ctxOf, IDEAL, NOW_H, PESTS, ruleOf } from './game-problems-fixtures'
import type { Scene } from './game-problems-fixtures'

const TREATMENT_IDS = [
  'flush-water', 'calmag', 'ph-down', 'ph-up', 'neem-oil', 'insecticidal-soap', 'predatory-mites', 'spinosad', 'bt-spray', 'sticky-traps',
  'sulfur-spray', 'potassium-bicarbonate', 'hydrogen-peroxide', 'beneficial-nematodes', 'remove-buds', 'raise-light', 'defoliate', 'fan-up',
  'dehumidify', 'repot', 'cull-plant'
]

/** steps a pest for h hours and returns its population */
function grow(id: ProblemId, s: Scene, p: ActiveProblem, hours: number): number {
  const rule = ruleOf(id)
  for (let h = 0; h < hours; h++) rule.effect?.(ctxOf(s, () => 0.5, NOW_H + h), p)
  return p.load ?? 0
}

function pestScene(id: ProblemId, treatedWith?: string) {
  const s = badScene(id)
  const p = activate(s, id, { severity: 0.2, load: 0.3, ...(treatedWith ? { treatedWith, treatedAtH: NOW_H } : {}) })
  return { s, p }
}

describe('problem treatments', () => {
  it('only uses known treatment ids and known problems', () => {
    for (const [id, list] of Object.entries(PROBLEM_TREATMENTS)) {
      expect(ALL_IDS).toContain(id)
      for (const t of list) expect(TREATMENT_IDS, `${id}: ${t}`).toContain(t)
    }
  })

  it('every pest and disease has at least one real treatment', () => {
    for (const id of [...PESTS, 'powdery_mildew', 'botrytis', 'septoria', 'fusarium_wilt', 'hlvd', 'root_rot'] as ProblemId[]) {
      expect(PROBLEM_TREATMENTS[id]?.length, id).toBeGreaterThan(0)
    }
  })

  it.runIf(TREATMENTS.length > 0)('matches TreatmentDef.helps in the catalog', () => {
    for (const t of TREATMENTS) {
      for (const p of t.helps) expect(PROBLEM_TREATMENTS[p] ?? [], `${t.id} helps ${p}`).toContain(t.id)
    }
    for (const [p, list] of Object.entries(PROBLEM_TREATMENTS)) {
      for (const id of list) expect(TREATMENTS.find(t => t.id === id)?.helps ?? [], `${p} lists ${id}`).toContain(p)
    }
  })

  it.each(PESTS)('%s grows when left alone and shrinks under a correct treatment', (id) => {
    const untreated = pestScene(id)
    const before = untreated.p.load ?? 0
    const left = grow(id, untreated.s, untreated.p, 72)
    expect(left).toBeGreaterThan(before)
    const best = Math.min(...PROBLEM_TREATMENTS[id]!.map((t) => {
      const treated = pestScene(id, t)
      return grow(id, treated.s, treated.p, 72)
    }))
    expect(best).toBeLessThan(left * 0.5)
  })

  it.each(PESTS)('%s ignores a wrong treatment', (id) => {
    const wrong = ['potassium-bicarbonate', 'calmag', 'raise-light'].find(t => !PROBLEM_TREATMENTS[id]!.includes(t))!
    const a = pestScene(id)
    const b = pestScene(id, wrong)
    expect(grow(id, b.s, b.p, 150)).toBeCloseTo(grow(id, a.s, a.p, 150), 10)
  })

  it('one spray round is not enough, repeated rounds knock mites down', () => {
    const { s, p } = pestScene('spider_mites', 'neem-oil')
    const low = grow('spider_mites', s, p, 96)
    expect(grow('spider_mites', s, p, 150)).toBeGreaterThan(low * 1.5)
    const rounds = pestScene('spider_mites')
    for (let r = 0; r < 3; r++) {
      rounds.p.treatedWith = 'neem-oil'
      rounds.p.treatedAtH = NOW_H + r * 96
      for (let h = r * 96; h < (r + 1) * 96; h++) ruleOf('spider_mites').effect?.(ctxOf(rounds.s, () => 0.5, NOW_H + h), rounds.p)
    }
    expect(rounds.p.load ?? 0).toBeLessThan(0.1)
  })

  it('predatory mites need time before they bite', () => {
    const plain = pestScene('spider_mites')
    const pred = pestScene('spider_mites', 'predatory-mites')
    expect(grow('spider_mites', pred.s, pred.p, 24)).toBeCloseTo(grow('spider_mites', plain.s, plain.p, 24), 10)
    expect(grow('spider_mites', pred.s, pred.p, 300)).toBeLessThan(grow('spider_mites', plain.s, plain.p, 300) * 0.3)
  })

  it('a dying colony lets the symptoms fade', () => {
    const { s, p } = pestScene('aphids')
    p.load = 0.01
    expect(ruleOf('aphids').pressure(ctxOf(s))).toBeLessThan(0)
  })

  it('pests do not start on their own, except gnats in wet soil and rare moths', () => {
    for (const id of PESTS.filter(p => p !== 'fungus_gnats' && p !== 'caterpillars')) {
      expect(ruleOf(id).pressure(ctxOf(badScene(id), () => 0)), id).toBe(0)
    }
    const wet = IDEAL.vegDay()
    wet.plant.root.water = 0.95
    expect(ruleOf('fungus_gnats').pressure(ctxOf(wet, () => 0))).toBeGreaterThan(0)
    expect(ruleOf('caterpillars').pressure(ctxOf(IDEAL.flowerDay(), () => 0))).toBeGreaterThan(0)
  })

  it('harsh sprays on forming buds cause damage, in veg they do not', () => {
    const run = (s: Scene) => {
      const p = activate(s, 'spider_mites', { load: 0.3, treatedWith: 'neem-oil', treatedAtH: NOW_H })
      for (let h = 0; h < 30; h++) ruleOf('spider_mites').effect?.(ctxOf(s, () => 0.5, NOW_H + h), p)
      return s.plant.damage
    }
    expect(run(IDEAL.vegDay())).toBe(0)
    const late = run(IDEAL.flowerDay())
    expect(late).toBeGreaterThan(0.02)
    expect(late).toBeLessThan(0.06)
  })

  it('root pests and rot hurt the roots', () => {
    for (const id of ['fungus_gnats', 'root_aphids', 'root_rot', 'fusarium_wilt'] as ProblemId[]) {
      const s = badScene(id)
      const before = s.plant.root.health
      const p = activate(s, id, { severity: 0.5, load: 0.5 })
      for (let h = 0; h < 50; h++) ruleOf(id).effect?.(ctxOf(s, () => 0.5, NOW_H + h), p)
      expect(s.plant.root.health, id).toBeLessThan(before)
    }
  })
})
