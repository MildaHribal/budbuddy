// Display rows for genome traits: a range (cross preview) or a single value (bred strain).
import { TRAIT_RANGES } from '~~/shared/game/genetics'
import type { Genome } from '~~/shared/game/types'

export type ShownTrait = 'flowerDays' | 'autoLifeDays' | 'yieldPotential' | 'potency' | 'terpenes' | 'moldResistance' | 'vigor' | 'hermRisk'
type Unit = 'days' | 'g' | 'pct' | 'x'

const UNITS: Record<ShownTrait, Unit> = {
  flowerDays: 'days', autoLifeDays: 'days', yieldPotential: 'g', potency: 'pct', terpenes: 'pct',
  moldResistance: 'pct', vigor: 'x', hermRisk: 'pct'
}
const REST: ShownTrait[] = ['yieldPotential', 'potency', 'terpenes', 'moldResistance', 'vigor', 'hermRisk']

export interface TraitRow {
  key: ShownTrait
  /** 0..1 positions on the trait's full scale */
  from: number
  to: number
  unit: Unit
  a: string
  b: string | null
}

const fmt = (unit: Unit, v: number) => (unit === 'pct' ? String(Math.round(v * 100)) : unit === 'x' ? v.toFixed(1) : String(Math.round(v)))

function row(key: ShownTrait, lo: number, hi: number): TraitRow {
  const { min, max } = TRAIT_RANGES[key]
  const unit = UNITS[key]
  const a = fmt(unit, lo)
  const b = fmt(unit, hi)
  return { key, from: (lo - min) / (max - min), to: (hi - min) / (max - min), unit, a, b: a === b ? null : b }
}

/** Timing row follows the photoperiod: autos show seed to harvest, photos flowering time. */
export function timingKey(autoShare: number): ShownTrait {
  return autoShare >= 0.5 ? 'autoLifeDays' : 'flowerDays'
}

export function rangeRows(traits: Record<ShownTrait, [number, number]>, autoShare: number): TraitRow[] {
  return [timingKey(autoShare), ...REST].map(k => row(k, traits[k][0], traits[k][1]))
}

export function genomeRows(g: Genome): TraitRow[] {
  return [g.kind === 'auto' ? 'autoLifeDays' : 'flowerDays', ...REST].map(k => row(k as ShownTrait, g[k as ShownTrait], g[k as ShownTrait]))
}
