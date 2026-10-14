import { describe, expect, it } from 'vitest'
import { PROBLEMS } from '../app/utils/problems'
import { PROBLEM_PRESENTATION } from '../shared/game/content/problems'
import type { ProblemId, ProblemPresentation } from '../shared/game/types'
import { ALL_IDS } from './game-problems-fixtures'

const PHASES = ['subtle', 'clear', 'severe'] as const
const MOBILE: ProblemId[] = ['n_def', 'p_def', 'k_def', 'mg_def', 'mo_def']
const IMMOBILE: ProblemId[] = ['ca_def', 's_def', 'fe_def', 'zn_def', 'mn_def', 'b_def', 'cu_def']

/** words that give the answer away */
const EN_GIVEAWAYS = [
  'deficiency', 'deficient', 'toxicity', 'nitrogen', 'phosphorus', 'potassium', 'calcium', 'magnesium', 'sulfur', 'sulphur', 'iron', 'zinc',
  'manganese', 'boron', 'copper', 'molybdenum', 'mildew', 'mold', 'mould', 'rot', 'rotting', 'fungus', 'fungal', 'virus', 'viroid', 'pest',
  'mites', 'lockout', 'ph', 'ec', 'overwatered', 'underwatered', 'hermie', 'nanners', 'foxtail', 'foxtails', 'taco', 'botrytis', 'septoria', 'fusarium'
]
const CS_GIVEAWAYS = [
  'nedostat', 'dusík', 'fosfor', 'draslík', 'vápník', 'hořčík', 'síra', 'síry', 'železo', 'železa', 'zinek', 'zinku', 'mangan', 'bór', 'boru',
  'měď', 'mědi', 'molybden', 'sviluš', 'roztoč', 'třásněn', 'mšic', 'smutnic', 'molic', 'housen', 'červc', 'vlnatk', 'minov', 'padlí', 'plíse',
  'plísn', 'hnilob', 'fusari', 'viroid', 'hermafrodit', 'herm', 'přelit', 'přemok', 'spálení', 'škůdc', 'houb'
]

const allPresentations = () => ALL_IDS.map(id => PROBLEM_PRESENTATION[id]).filter((p): p is ProblemPresentation => !!p)
const words = (s: string) => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)

describe('problem presentation', () => {
  it('covers every problem id with matching ids', () => {
    for (const id of ALL_IDS) {
      const p = PROBLEM_PRESENTATION[id]
      expect(p, id).toBeDefined()
      expect(p!.id).toBe(id)
      expect(p!.atlasId).toBe(id)
    }
    expect(Object.keys(PROBLEM_PRESENTATION).sort()).toEqual([...ALL_IDS].sort())
  })

  it('every atlas id used by the game exists in the in-app atlas', () => {
    const atlas = new Set(PROBLEMS.map(p => p.id))
    for (const p of allPresentations()) expect(atlas.has(p.atlasId), p.atlasId).toBe(true)
  })

  it('has symptoms in every phase that never fade as it gets worse', () => {
    for (const p of allPresentations()) {
      for (const ph of PHASES) {
        expect(p.symptoms[ph].length, `${p.id} ${ph}`).toBeGreaterThan(0)
        for (const s of p.symptoms[ph]) {
          expect(s.intensity).toBeGreaterThan(0)
          expect(s.intensity).toBeLessThanOrEqual(1)
        }
      }
      const max = (ph: typeof PHASES[number]) => Math.max(...p.symptoms[ph].map(s => s.intensity))
      expect(max('clear'), p.id).toBeGreaterThan(max('subtle'))
      expect(max('severe'), p.id).toBeGreaterThanOrEqual(max('clear'))
      for (const s of p.symptoms.subtle) {
        const later = p.symptoms.severe.find(x => x.kind === s.kind && x.where === s.where)
        expect(later, `${p.id} ${s.kind}`).toBeDefined()
        expect(later!.intensity).toBeGreaterThanOrEqual(s.intensity)
      }
    }
  })

  it('shows mobile nutrients on old leaves and immobile ones on new leaves', () => {
    for (const id of MOBILE) expect(PROBLEM_PRESENTATION[id]!.symptoms.clear[0]!.where, id).toBe('old')
    for (const id of IMMOBILE) expect(PROBLEM_PRESENTATION[id]!.symptoms.clear[0]!.where, id).toBe('new')
  })

  it('has 1 to 3 observation lines per phase in English and Czech', () => {
    for (const p of allPresentations()) {
      for (const ph of PHASES) {
        const ls = p.observations[ph]
        expect(ls.length, `${p.id} ${ph}`).toBeGreaterThanOrEqual(1)
        expect(ls.length, `${p.id} ${ph}`).toBeLessThanOrEqual(3)
        for (const l of ls) {
          expect(l.en.trim().length).toBeGreaterThan(10)
          expect(l.cs.trim().length).toBeGreaterThan(10)
          expect(l.en).toMatch(/\.$/)
          expect(l.cs).toMatch(/\.$/)
        }
      }
    }
  })

  it('uses no em or en dashes', () => {
    for (const p of allPresentations()) {
      for (const ph of PHASES) for (const l of p.observations[ph]) expect(`${l.en} ${l.cs}`, p.id).not.toMatch(/[\u2013\u2014]/)
    }
  })

  it('never names the problem in what the player sees', () => {
    const names = PROBLEMS.map(p => p.name.replace(/\s*\(.*?\)/g, '').toLowerCase())
    for (const p of allPresentations()) {
      for (const ph of PHASES) {
        for (const l of p.observations[ph]) {
          const en = l.en.toLowerCase()
          for (const n of names) expect(en, `${p.id}: "${n}"`).not.toContain(n)
          const enWords = words(l.en)
          for (const w of EN_GIVEAWAYS) expect(enWords, `${p.id}: ${w}`).not.toContain(w)
          for (const w of words(l.cs)) {
            for (const g of CS_GIVEAWAYS) expect(w.startsWith(g), `${p.id}: ${w}`).toBe(false)
          }
        }
      }
    }
  })

  it('makes lookalikes hard to tell apart early and easy later', () => {
    const subtle = (id: ProblemId) => PROBLEM_PRESENTATION[id]!.observations.subtle.map(l => l.en).join(' ')
    const clear = (id: ProblemId) => PROBLEM_PRESENTATION[id]!.observations.clear.map(l => l.en).join(' ')
    const pairs: [ProblemId, ProblemId][] = [['overwatering', 'underwatering'], ['s_def', 'fe_def'], ['taco_leaves', 'heat_stress']]
    for (const [a, b] of pairs) {
      expect(subtle(a)).toBe(subtle(b))
      expect(clear(a)).not.toBe(clear(b))
    }
  })
})
