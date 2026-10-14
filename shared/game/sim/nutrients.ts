import { NUTRIENTS } from '../types.ts'
import type { FeedDose, Medium, Nutrient, PlantSim, Stage } from '../types.ts'
import { productDef } from './content.ts'

export type Pool = Record<Nutrient, number>

export const zeroPool = (): Pool => ({ N: 0, P: 0, K: 0, Ca: 0, Mg: 0, S: 0, Fe: 0, Zn: 0, Mn: 0, B: 0, Cu: 0, Mo: 0 })

/** Tap water: EC and the Ca/Mg it carries. */
export const TAP_EC = 0.3
const TAP: Partial<Pool> = { Ca: 0.25, Mg: 0.15 }

/** EC contributed by 1 unit/L of each element; macros dominate EC. */
const EC_W: Pool = { N: 0.35, P: 0.1, K: 0.3, Ca: 0.25, Mg: 0.15, S: 0.1, Fe: 0.01, Zn: 0.01, Mn: 0.01, B: 0.01, Cu: 0.01, Mo: 0.01 }

const VEG: Pool = { N: 1, P: 0.6, K: 0.8, Ca: 0.9, Mg: 0.9, S: 0.8, Fe: 0.9, Zn: 0.9, Mn: 0.9, B: 0.9, Cu: 0.9, Mo: 0.9 }
const FLOWER: Pool = { N: 0.55, P: 1, K: 1, Ca: 0.9, Mg: 1, S: 0.9, Fe: 0.9, Zn: 0.9, Mn: 0.9, B: 0.9, Cu: 0.9, Mo: 0.9 }
const LATE: Pool = { N: 0.25, P: 0.7, K: 0.8, Ca: 0.6, Mg: 0.6, S: 0.6, Fe: 0.6, Zn: 0.6, Mn: 0.6, B: 0.6, Cu: 0.6, Mo: 0.6 }
const SEEDLING: Pool = Object.fromEntries(NUTRIENTS.map(n => [n, VEG[n] * 0.3])) as Pool

const toArr = (p: Pool): number[] => NUTRIENTS.map(n => p[n])
const DEMAND_ARR = new Map<Pool, number[]>([VEG, FLOWER, LATE, SEEDLING].map(p => [p, toArr(p)]))
const EC_W_ARR = toArr(EC_W)

/** Relative demand per element; 1.0 = what a full-strength stage feed supplies. */
export function demand(stage: Stage): Pool {
  switch (stage) {
    case 'germination':
    case 'seedling': return SEEDLING
    case 'flower': return FLOWER
    case 'ripening': return LATE
    default: return VEG
  }
}

export const PH_WINDOW: Record<Medium, [number, number]> = { soil: [6.0, 7.0], coco: [5.5, 6.5], hydro: [5.5, 6.5] }
export const PH_IDEAL: Record<Medium, number> = { soil: 6.5, coco: 6.0, hydro: 5.8 }

/** [low-side narrowing, high-side narrowing] of the pH window per element */
const PH_SHIFT: Record<Nutrient, [number, number]> = {
  N: [0, 0], K: [0, 0], S: [0, 0],
  P: [0.2, 0.1],
  Ca: [0.25, 0], Mg: [0.25, 0], Mo: [0.3, 0],
  Fe: [0, 0.3], Mn: [0, 0.3], Zn: [0, 0.25], B: [0, 0.2], Cu: [0, 0.25]
}

/** Uptake availability 0..1 of an element at a root-zone pH. */
export function availability(n: Nutrient, ph: number, medium: Medium): number {
  const i = Math.round((Math.min(9, Math.max(3, ph)) - 3) * 100)
  return availTable(medium)[NUTRIENT_INDEX[n] * 601 + i] as number
}

function availTable(medium: Medium): Float64Array {
  return AVAIL[medium] ??= buildTable(medium)
}

const NUTRIENT_INDEX = Object.fromEntries(NUTRIENTS.map((n, i) => [n, i])) as Record<Nutrient, number>
const AVAIL: Partial<Record<Medium, Float64Array>> = {}
function buildTable(medium: Medium): Float64Array {
  const t = new Float64Array(NUTRIENTS.length * 601)
  NUTRIENTS.forEach((n, k) => {
    for (let i = 0; i <= 600; i++) t[k * 601 + i] = availabilityExact(n, 3 + i / 100, medium)
  })
  return t
}

function availabilityExact(n: Nutrient, ph: number, medium: Medium): number {
  const [lo, hi] = PH_WINDOW[medium]
  const [sl, sh] = PH_SHIFT[n]
  const l = lo + sl
  const h = hi - sh
  if (ph < l) return Math.max(0.05, 1 - (l - ph) * 1.1)
  if (ph > h) return Math.max(0.05, 1 - (ph - h) * 1.1)
  return 1
}

/** mg/L of an element that equals 1 unit (full demand). Product npk is mg/L per 1 ml/L. */
export const PPM_PER_UNIT: Pool = { N: 150, P: 50, K: 150, Ca: 120, Mg: 45, S: 50, Fe: 2, Zn: 0.25, Mn: 0.5, B: 0.3, Cu: 0.06, Mo: 0.04 }

export interface Solution {
  ec: number
  units: Pool
}

/** Mixed feed per litre; returns null for unknown products. */
export function solutionOf(feed: FeedDose[]): Solution | null {
  const units = zeroPool()
  let ec = TAP_EC
  for (const k of NUTRIENTS) units[k] = TAP[k] ?? 0
  for (const d of feed) {
    const p = productDef(d.productId)
    if (!p) return null
    ec += p.ecPerMl * d.mlPerL
    for (const k of NUTRIENTS) units[k] += ((p.npk[k] ?? 0) * d.mlPerL) / PPM_PER_UNIT[k]
  }
  return { ec, units }
}

export const plainWater = (): Solution => solutionOf([]) as Solution

export function ecOfUnits(units: Pool): number {
  let s = 0
  for (const k of NUTRIENTS) s += units[k] * EC_W[k]
  return s
}

/** Saturating reserve target from supply relative to need. */
const reserveCurve = (r: number): number => r <= 1 ? Math.sqrt(Math.max(0, r)) : Math.min(1.5, 1 + 0.27 * Math.log(r))

const RESERVE_RATE = 0.012

/** Nutrient uptake runs on this clock (game hours, aligned to absolute time) to keep catch-up cheap. */
export const NUTRIENT_STEP_H = 2

/**
 * Uptake for dtH hours. drinkL is pot water taken in that time, ev the effective root-zone volume now.
 * Depletes the pool and EC and pulls reserves toward what the root zone can supply.
 */
export function stepNutrients(plant: PlantSim, drinkL: number, ev: number, rootTempC: number, ageH: number, dtH: number): void {
  const root = plant.root
  const pool = root.pool as Pool
  const dem = demand(plant.stage)
  const fd = plant.genome.feedDemand
  const rootF = (0.4 + 0.6 * root.health) * (1 - 0.4 * root.salts)
  // cotyledons feed the seedling for its first two weeks
  const seedFloor = Math.max(0, 1 - ageH / (14 * 24))
  const table = availTable(plant.medium)
  const phI = Math.round((Math.min(9, Math.max(3, root.ph)) - 3) * 100)
  const cold = rootTempC < 18 ? Math.max(0.3, 1 - (18 - rootTempC) * 0.08) : 1
  const rate = RESERVE_RATE * dtH
  const res = plant.reserves
  const demA = DEMAND_ARR.get(dem) as number[]
  let ecRemoved = 0
  for (let i = 0; i < NUTRIENTS.length; i++) {
    const k = NUTRIENTS[i] as Nutrient
    let a = table[i * 601 + phI] as number
    if (cold < 1 && (k === 'P' || k === 'Mg' || k === 'Ca')) a *= cold
    const need = (demA[i] as number) * fd
    const have = pool[k]
    const conc = have / ev
    const take = Math.min(have, drinkL * Math.min(conc, need * 1.2) * a)
    pool[k] = have - take
    ecRemoved += take * (EC_W_ARR[i] as number)
    const target = Math.max(seedFloor, Math.min(1.5, a * reserveCurve(conc / Math.max(0.3, need)) * rootF))
    res[k] += (target - res[k]) * rate
  }
  root.ec = Math.max(0.05, root.ec - ecRemoved / ev)
}

/** Mean-and-min fit of reserves for growth. */
export function nutrientFit(plant: PlantSim): number {
  let min = 1
  let sum = 0
  for (const k of NUTRIENTS) {
    const r = plant.reserves[k]
    const f = r < 0.8 ? Math.max(0, r / 0.8) : r > 1.3 ? Math.max(0.3, 1 - (r - 1.3) * 2) : 1
    sum += f
    if (f < min) min = f
  }
  return 0.5 * min + (0.5 * sum) / NUTRIENTS.length
}
