// Small deterministic catalog + problem rules for sim tests (independent of the real content files).
import type { EquipmentDef, GameState, Genome, ProblemPresentation, ProblemRule, ProductDef, StrainDef, TreatmentDef } from '../shared/game/types.ts'
import type { SimContent } from '../shared/game/sim/content.ts'

const L = (en: string) => ({ en, cs: en })

const base: Genome = {
  kind: 'auto', autoLifeDays: 75, flowerDays: 63, vigor: 1, stretch: 1.5, yieldPotential: 250, terpenes: 0.6,
  potency: 0.6, moldResistance: 0.6, pestResistance: 0.6, feedDemand: 1, hermRisk: 0.3, leafShape: 0.5, purple: 0.2
}

export const STRAINS: StrainDef[] = [
  { id: 'auto', name: 'Fixture Auto', blurb: L('auto'), genome: { ...base }, price: 10, unlockLevel: 1 },
  { id: 'photo', name: 'Fixture Photo', blurb: L('photo'), genome: { ...base, kind: 'photo', yieldPotential: 300 }, price: 10, unlockLevel: 1 }
]

const eq = (id: string, slot: EquipmentDef['slot'], stats: Record<string, number>, price = 50, unlockLevel = 1): EquipmentDef =>
  ({ id, slot, name: L(id), blurb: L(id), price, unlockLevel, stats })

export const EQUIPMENT: EquipmentDef[] = [
  eq('tent60', 'tent', { widthCm: 60, heightCm: 140, slots: 2 }),
  eq('tent60leaky', 'tent', { widthCm: 60, heightCm: 140, slots: 2, leak: 0.6 }),
  eq('tent100', 'tent', { widthCm: 100, heightCm: 200, slots: 4 }, 150),
  eq('led100', 'light', { watts: 100, ppfd: 650, heat: 5 }),
  eq('led240', 'light', { watts: 240, ppfd: 1100, heat: 9 }, 200),
  eq('exhaust100', 'exhaust', { m3h: 100 }),
  eq('clipfan', 'fan', { airflow: 0.5 }),
  eq('dehum', 'dehumidifier', { lPerDay: 6 }),
  eq('heater', 'heater', { watts: 150 }),
  eq('phpen', 'meter', { ph: 1 }),
  eq('ecpen', 'meter', { ec: 1 }),
  eq('thermo', 'meter', { climate: 1 }),
  eq('drip', 'irrigation', { auto: 1 }),
  eq('locked-light', 'light', { watts: 600, ppfd: 1500, heat: 12 }, 50, 9)
]

/** npk in mg/L per 1 ml/L, like the real catalog */
export const PRODUCTS: ProductDef[] = [
  { id: 'grow', kind: 'base', name: L('grow'), price: 18, npk: { N: 26, P: 6, K: 22, Ca: 9, Mg: 4, S: 6, Fe: 0.4, Mn: 0.12, Zn: 0.06, B: 0.06, Cu: 0.015, Mo: 0.01 }, ecPerMl: 0.16, unlockLevel: 1 },
  { id: 'bloom', kind: 'bloom', name: L('bloom'), price: 18, npk: { N: 12, P: 14, K: 32, Ca: 7, Mg: 5, S: 10, Fe: 0.4, Mn: 0.12, Zn: 0.06, B: 0.08, Cu: 0.015, Mo: 0.01 }, ecPerMl: 0.17, unlockLevel: 1 },
  { id: 'calmag', kind: 'calmag', name: L('calmag'), price: 14, npk: { N: 14, Ca: 30, Mg: 12, Fe: 0.2 }, ecPerMl: 0.2, unlockLevel: 1 }
]

export const TREATMENTS: TreatmentDef[] = [
  { id: 'neem-oil', name: L('neem'), blurb: L('neem'), price: 5, unlockLevel: 1, helps: ['spider_mites'] },
  { id: 'sulfur-spray', name: L('sulfur'), blurb: L('sulfur'), price: 5, unlockLevel: 1, helps: ['powdery_mildew'] },
  { id: 'fan-up', name: L('fan'), blurb: L('fan'), price: 0, unlockLevel: 1, helps: ['heat_stress'] },
  { id: 'ph-down', name: L('ph-down'), blurb: L('ph-down'), price: 2, unlockLevel: 1, helps: ['fe_def'] },
  { id: 'flush-water', name: L('flush'), blurb: L('flush'), price: 0, unlockLevel: 1, helps: ['nutrient_burn'] }
]

/** onset -> clear needs >= 144 game h at the max rate, clear -> severe >= 216 h */
const UP = 0.0025
const DOWN = -0.004
const def = (cond: boolean, k = 1): number => cond ? UP * k : DOWN

export const RULES: ProblemRule[] = [
  { id: 'underwatering', pressure: ({ plant }) => plant.medium !== 'hydro' && plant.root.water < 0.12 ? UP : DOWN },
  { id: 'overwatering', pressure: ({ plant }) => def(plant.stage !== 'germination' && plant.root.water > 0.98 && plant.root.health < 0.9, 0.6) },
  { id: 'n_def', pressure: ({ plant }) => def(plant.reserves.N < 0.6) },
  { id: 'fe_def', pressure: ({ plant }) => def(plant.reserves.Fe < 0.6) },
  { id: 'mg_def', pressure: ({ plant }) => def(plant.reserves.Mg < 0.6) },
  { id: 'nutrient_burn', pressure: ({ plant }) => def(plant.root.ec > (plant.medium === 'soil' ? 2.6 : 3.0)) },
  { id: 'heat_stress', pressure: ({ tent }) => def(tent.env.lightsOn && tent.env.tempC > 31) },
  {
    id: 'spider_mites',
    pressure: ({ plant }) => plant.problems.some(p => p.id === 'spider_mites') ? 0.002 : 0,
    effect: (_c, p) => { p.load = Math.min(1, (p.load ?? 0) + 0.001) }
  },
  { id: 'powdery_mildew', pressure: ({ plant }) => plant.problems.some(p => p.id === 'powdery_mildew') ? 0.002 : 0 },
  { id: 'hermaphrodite', pressure: ({ plant, tent }) => (plant.stage === 'flower' || plant.stage === 'ripening') && tent.env.leak > 0 ? 0.004 * tent.env.leak : 0 }
]

const pres = (id: ProblemPresentation['id'], kind: 'droop' | 'chlorosis-uniform' | 'stipple'): ProblemPresentation => ({
  id,
  atlasId: id,
  symptoms: {
    subtle: [{ kind, where: 'old', intensity: 0.3 }],
    clear: [{ kind, where: 'old', intensity: 0.6 }],
    severe: [{ kind, where: 'all', intensity: 1 }]
  },
  observations: { subtle: [L(`${id} subtle`)], clear: [L(`${id} clear`)], severe: [L(`${id} severe`)] }
})

export const PRESENTATION: SimContent['presentation'] = {
  underwatering: pres('underwatering', 'droop'),
  n_def: pres('n_def', 'chlorosis-uniform'),
  spider_mites: pres('spider_mites', 'stipple')
}

export const STARTER = { coins: 300, strainId: 'auto', tentItem: 'tent60', light: 'led100', gear: ['exhaust100', 'clipfan'], seeds: 2 }

export const FIXTURE: Partial<SimContent> = {
  strains: STRAINS,
  equipment: EQUIPMENT,
  products: PRODUCTS,
  treatments: TREATMENTS,
  scannerPrice: 15,
  starter: STARTER,
  levelForXp: (xp: number) => 1 + Math.floor(Math.sqrt(xp / 100)),
  randomEvents: [],
  rules: RULES,
  presentation: PRESENTATION
}

/** Stage-appropriate feed, as a decent player would mix it. */
export function recipe(stage: string, medium: 'soil' | 'coco' | 'hydro', ageDays: number) {
  const ph = medium === 'soil' ? 6.5 : 5.9
  const cm = medium === 'soil' ? [] : [{ productId: 'calmag', mlPerL: 1.5 }]
  if (stage === 'seedling' || stage === 'germination') return { ph, feed: medium === 'soil' ? [] : [...cm, { productId: 'grow', mlPerL: 1.5 }] }
  if (stage === 'veg') return { ph, feed: medium === 'soil' && ageDays < 21 ? [] : [...cm, { productId: 'grow', mlPerL: medium === 'soil' ? 5 : 6 }] }
  if (stage === 'flower') return { ph, feed: [...cm, { productId: 'bloom', mlPerL: medium === 'soil' ? 5 : 6 }] }
  return { ph, feed: [...cm, { productId: 'bloom', mlPerL: 2.5 }] }
}

export function stock(s: GameState): void {
  for (const p of PRODUCTS) s.inventory[p.id] = 100_000
}

// ---------- scripted player against the real catalog ----------

const REAL_FEED: Record<string, string> = { grow: 'base-veg', bloom: 'base-bloom', calmag: 'calmag-mix' }

export interface PlayerOpts {
  /** flip photoperiods at this age (days) */
  flipDay?: number
  /** water when the pot is below this */
  waterBelow?: number
}

/** One check-in of a careful player: water/feed, fix pH, salts and climate, treat visible problems, harvest, cure. */
export function careCheck(s: GameState, sim: typeof import('../shared/game/sim/index.ts'), drying: typeof import('../shared/game/drying.ts'), problems: typeof import('../shared/game/content/problems.ts'), opts: PlayerOpts = {}): void {
  for (const tent of s.tents) {
    for (const id of [...tent.plantIds]) {
      const p = s.plants[id]
      if (!p || p.dead || p.stage === 'harvested') continue
      const ageDays = (s.nowH - p.sownAtH) / 24
      if (p.genome.kind === 'photo' && tent.lightHours > 12 && ageDays >= (opts.flipDay ?? 35)) sim.apply(s, { t: 'flip', tentId: tent.id })
      const fp = sim.flowerProgress(p, s.nowH)
      if (fp !== null && fp >= 0.92) {
        sim.apply(s, { t: 'harvest', plantId: id })
        continue
      }
      tent.climate = { tempC: 25, rh: p.stage === 'flower' || p.stage === 'ripening' ? 45 : 55 }
      const [lo, hi] = sim.PH_WINDOW[p.medium]
      if (p.root.ph > hi - 0.1) sim.apply(s, { t: 'treat', plantId: id, treatmentId: 'ph-down' })
      if (p.root.ph < lo + 0.1) sim.apply(s, { t: 'treat', plantId: id, treatmentId: 'ph-up' })
      if (p.root.salts > 0.35 || p.root.ec > 2.4) sim.apply(s, { t: 'flush', plantId: id })
      for (const x of p.problems) {
        if (sim.problemPhase(x) === 'hidden') continue
        if (!x.diagnosed) sim.apply(s, { t: 'diagnose', plantId: id, problemId: x.id })
        const fix = problems.PROBLEM_TREATMENTS[x.id]?.find(t => t !== 'cull-plant' && t !== 'repot')
        if (fix && (!x.treatedAtH || s.nowH - x.treatedAtH > 96)) {
          s.inventory[fix] = (s.inventory[fix] ?? 0) + 1
          sim.apply(s, { t: 'treat', plantId: id, treatmentId: fix })
        }
      }
      if (p.medium !== 'hydro' && p.root.water < (opts.waterBelow ?? 0.55)) {
        const r = recipe(p.stage, p.medium, ageDays)
        const cap = p.potL * (p.medium === 'soil' ? 0.35 : 0.45)
        const liters = Math.round((cap * (1 - p.root.water) * 1.15) * 100) / 100
        sim.apply(s, { t: 'water', plantId: id, liters, ph: r.ph, feed: r.feed.map(f => ({ productId: REAL_FEED[f.productId] ?? f.productId, mlPerL: f.mlPerL })) })
      }
    }
  }
  for (const b of s.drying) {
    if (b.done) continue
    if (b.tempC !== 18 || b.rh !== 60) sim.apply(s, { t: 'dry', batchId: b.id, tempC: 18, rh: 60 })
    sim.apply(s, { t: 'jar', batchId: b.id })
  }
  for (const j of [...s.jars]) {
    if (j.done) continue
    if (s.nowH - j.startedAtH >= drying.MIN_CURE_H) sim.apply(s, { t: 'finishCure', jarId: j.id })
    else if (drying.burpDue(s, j)) sim.apply(s, { t: 'burp', jarId: j.id })
  }
}

/** Real-time check-in schedule: 08:00, 13:00, 18:00 and 24:00 (8 h night gap), in game hours from the start. */
export function fourChecksADay(realDays: number, gameHPerRealH: number): number[] {
  const out: number[] = []
  for (let d = 0; d < realDays; d++) for (const h of [8, 13, 18, 24]) out.push(Math.round((d * 24 + h) * gameHPerRealH))
  return out
}
