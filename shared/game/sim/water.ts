import type { Medium, PlantSim } from '../types.ts'
import { NUTRIENTS } from '../types.ts'
import type { Pool, Solution } from './nutrients.ts'

/** Litres of plant-available water per litre of pot. */
const RETENTION: Record<Medium, number> = { soil: 0.35, coco: 0.45, hydro: 1 }
/** Nutrient-holding volume of the medium itself (CEC), litres per pot litre. */
const BUFFER: Record<Medium, number> = { soil: 0.3, coco: 0.08, hydro: 0 }
/** How much of the input pH reaches the root zone per pot volume of water. */
const PH_BUFFER: Record<Medium, number> = { soil: 0.35, coco: 0.75, hydro: 1 }
/** How well runoff washes the medium. */
const WASH: Record<Medium, number> = { soil: 0.35, coco: 0.8, hydro: 1 }

/**
 * Game pots dry slower than real ones so a watering lasts several real hours
 * (a game day is 20 real minutes). Real litres / WATER_SLOW = pot litres.
 */
export const WATER_SLOW = 7.5

export const THIRSTY = 0.3

export const capacityL = (p: PlantSim): number => p.potL * RETENTION[p.medium]
export const effVol = (p: PlantSim, water: number): number => capacityL(p) * water + p.potL * BUFFER[p.medium]

export interface IrrigateResult { retained: number, runoff: number }

/** Adds `liters` of solution at `ph`; excess drains as runoff and washes the root zone. */
export function irrigate(p: PlantSim, liters: number, ph: number, sol: Solution): IrrigateResult {
  const root = p.root
  const pool = root.pool as Pool
  if (p.medium === 'hydro') {
    const f = Math.min(1, liters / p.potL)
    for (const k of NUTRIENTS) pool[k] = pool[k] * (1 - f) + sol.units[k] * p.potL * f
    root.ec = root.ec * (1 - f) + sol.ec * f
    root.ph += (ph - root.ph) * f
    root.salts *= 1 - f * 0.9
    root.water = 1
    return { retained: liters, runoff: 0 }
  }
  const cap = capacityL(p)
  const ev0 = effVol(p, root.water)
  const space = cap * (1 - root.water)
  const retained = Math.min(liters, space)
  const runoff = liters - retained
  root.water = Math.min(1, root.water + retained / cap)
  const ev1 = effVol(p, root.water)
  const wash = Math.exp((-runoff / ev1) * WASH[p.medium])
  for (const k of NUTRIENTS) {
    const c = (pool[k] + sol.units[k] * retained) / ev1
    pool[k] = (sol.units[k] + (c - sol.units[k]) * wash) * ev1
  }
  const ec = (root.ec * ev0 + sol.ec * retained) / ev1
  root.ec = sol.ec + (ec - sol.ec) * wash
  root.ph += (ph - root.ph) * Math.min(1, ((retained + runoff) / ev1) * PH_BUFFER[p.medium])
  if (runoff > 0) root.salts *= Math.exp((-1.5 * runoff) / cap)
  if (sol.ec > 1.6) root.salts = Math.min(1, root.salts + (sol.ec - 1.6) * 0.06 * (retained / cap))
  return { retained, runoff }
}
