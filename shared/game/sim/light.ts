import type { PlantSim } from '../types.ts'
import type { TentSpec } from './spec.ts'

/** pot rim + lamp body take this much of the tent height */
const POT_CM = 22
const LAMP_CM = 15

/** The lamp hangs this far above the canopy while the tent has headroom; tall plants close the gap. */
export const LAMP_GAP_CM = 45

export function canopyDistanceCm(heightCm: number, spec: TentSpec): number {
  return Math.max(5, Math.min(LAMP_GAP_CM, spec.heightCm - POT_CM - LAMP_CM - heightCm))
}

/** Light stat `ppfd` is measured 30 cm under the lamp at full power. */
export function ppfdAtDistance(ppfd30: number, dim: number, distCm: number): number {
  return ppfd30 * dim * Math.pow(55 / (distCm + 25), 1.3)
}

export function plantPpfd(plant: PlantSim | null, spec: TentSpec, dim: number): number {
  if (!spec.light) return 0
  return ppfdAtDistance(spec.light.ppfd, dim, canopyDistanceCm(plant?.heightCm ?? 0, spec))
}

export const dli = (ppfd: number, lightHours: number): number => (ppfd * lightHours * 3600) / 1e6

/** Gross photosynthesis response, saturating without CO2. */
export const lightResponse = (ppfd: number): number => ppfd / (1 + ppfd / 1600)

export const maxTentPlantHeight = (spec: TentSpec): number => spec.heightCm - POT_CM - LAMP_CM - 5
