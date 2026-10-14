// Drying and curing physics. Pure curves; no state mutation here.
// Units: moisture 0..1 (water share of bud weight), RH and temperature as the player sets them (% and °C).
// Time is in game hours (1 game hour ≈ 50 real seconds, see REAL_MS_PER_GAME_HOUR).

export const WET_MOISTURE = 0.75
/** Snap test says "ready" between these. */
export const READY_HI = 0.15
export const READY_LO = 0.115
export const OVERDRY = 0.10
/** The engine/UI should not let anything wetter than this into a jar. */
export const JAR_MAX_MOISTURE = 0.3

export const TEMP_MIN = 12
export const TEMP_MAX = 30
export const RH_MIN = 30
export const RH_MAX = 80
export const DEFAULT_TEMP = 22
export const DEFAULT_RH = 50

/** Drying speed per kPa of VPD per game hour. Tuned so 19 °C / 60 % reaches the snap point in ~205 h (2.8 real h). */
const DRY_K = 0.016

export const JAR_TAU_H = 20
export const SWEAT0 = 0.025
export const SWEAT_TAU_H = 120
export const JAR_RH_LO = 58
export const JAR_RH_HI = 65
export const CURE_TAU_H = 216
export const MIN_CURE_H = 120
export const MOLD_LOSS_FROM = 0.4

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Saturation vapour pressure in kPa (Tetens). */
export function svp(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
}

export function vpd(tempC: number, rhPct: number): number {
  return svp(tempC) * (1 - clamp(rhPct, 0, 100) / 100)
}

/** RH (%) that air settles at around buds of this moisture: 10 % → 55 %, 12 % → 62 %, 14 % → 69 %. */
export function eqRh(moisture: number): number {
  return clamp(55 + 350 * (moisture - 0.1), 25, 95)
}

/** Moisture buds approach when left in air of this RH. */
export function eqMoisture(rhPct: number): number {
  return clamp(0.1 + (rhPct - 55) / 350, 0.04, 0.25)
}

export function dryRate(tempC: number, rhPct: number): number {
  return DRY_K * vpd(tempC, rhPct)
}

/** Hours until moisture falls to `target` at a fixed climate, or null if the room air never gets it there. */
export function hoursToMoisture(moisture: number, target: number, tempC: number, rhPct: number): number | null {
  if (moisture <= target) return 0
  const meq = eqMoisture(rhPct)
  if (meq >= target - 0.002) return null
  const k = dryRate(tempC, rhPct)
  return Math.log((moisture - meq) / (target - meq)) / k
}

export interface DryStep { moisture: number, terpene: number, mold: number }

/** One integration step of a hanging batch. `resist` is the strain's mold resistance 0..1. */
export function dryStep(moisture: number, tempC: number, rhPct: number, resist: number, h: number): DryStep {
  const meq = eqMoisture(rhPct)
  const next = meq + (moisture - meq) * Math.exp(-dryRate(tempC, rhPct) * h)
  const rate = Math.max(0, moisture - next) / h

  let terpene = 0.0003 + 0.0005 * Math.max(0, tempC - 20) + 0.4 * Math.max(0, rate - 0.006)
  if (next < OVERDRY) terpene += 0.002 * (OVERDRY - next) / 0.03

  const humid = Math.max(0, rhPct - 58) / 15
  const wet = clamp((moisture - READY_HI) / 0.45, 0, 1)
  const warm = clamp((tempC - 10) / 8, 0.3, 1)
  const mold = 0.006 * humid * (0.25 + 0.75 * wet) * warm * (1.3 - 0.6 * resist)

  return { moisture: next, terpene: terpene * h, mold: mold * h }
}

/** Extra apparent moisture right after jarring: the bud core sweats water out to the surface. */
export function sweat(ageH: number): number {
  return SWEAT0 * Math.exp(-Math.max(0, ageH) / SWEAT_TAU_H)
}

/** Air in a sealed jar goes stale; the allowed gap between burps grows as the cure settles. */
export function airIntervalH(ageH: number): number {
  return 36 + 0.3 * Math.max(0, ageH)
}

export function airFactor(sinceBurpH: number, ageH: number): number {
  const allow = airIntervalH(ageH)
  return sinceBurpH <= allow ? 1 : Math.max(0.4, 1 - (sinceBurpH - allow) / 150)
}

/** How well curing proceeds at this jar RH: full speed in 58-65 %, stalls when dry, slows (and smells) when wet. */
export function rhFactor(rhPct: number): number {
  if (rhPct < JAR_RH_LO) return clamp(1 - (JAR_RH_LO - rhPct) / 8 * 0.85, 0.15, 1)
  if (rhPct > JAR_RH_HI) return clamp(1 - (rhPct - JAR_RH_HI) / 10 * 0.65, 0.35, 1)
  return 1
}

export interface JarStep { jarRh: number, cure: number, terpene: number, mold: number }

export function jarStep(jarRh: number, moisture: number, ageH: number, sinceBurpH: number, cure: number, resist: number, h: number): JarStep {
  const target = eqRh(moisture + sweat(ageH))
  const rh = target + (jarRh - target) * Math.exp(-h / JAR_TAU_H)
  const mid = (rh + jarRh) / 2
  const growth = (1 - cure) * (1 - Math.exp(-h / CURE_TAU_H)) * rhFactor(mid) * airFactor(sinceBurpH, ageH)
  const humid = mid > JAR_RH_HI ? 0.0012 * (mid - JAR_RH_HI) / 5 : 0
  // jarred too wet: water sits inside the bud where burping cannot reach it
  const soggy = Math.max(0, moisture - READY_HI) / 0.05 * 0.008
  const mold = (humid + soggy) * (1.3 - 0.6 * resist) * h
  const terpene = mid > 70 ? 0.0008 * ((mid - 70) / 5) * h : 0
  return { jarRh: rh, cure: cure + growth, terpene, mold }
}

export interface BurpEffect { moisture: number, jarRh: number, terpene: number }

/** Opening the jar vents humid air: some water leaves, jar air mixes with the room, a little aroma escapes. */
export function burpEffect(jarRh: number, moisture: number, roomRh: number): BurpEffect {
  const vented = 0.02 * Math.max(0, jarRh - 45) / 100
  return {
    moisture: Math.max(0.04, moisture - vented),
    jarRh: jarRh * 0.3 + roomRh * 0.7,
    terpene: 0.003 + (jarRh < JAR_RH_LO ? 0.004 : 0)
  }
}

/** Hours until jar air climbs past 65 % (ignores the slow fade of sweating), or null if it stays below. */
export function hoursToJarHigh(jarRh: number, moisture: number, ageH: number): number | null {
  if (jarRh > JAR_RH_HI) return 0
  const target = eqRh(moisture + sweat(ageH))
  if (target <= JAR_RH_HI + 0.2) return null
  return JAR_TAU_H * Math.log((target - jarRh) / (target - JAR_RH_HI))
}

export type SnapResult = 'bend' | 'small-snap' | 'snap' | 'brittle'

export function snapTest(moisture: number): SnapResult {
  if (moisture > 0.17) return 'bend'
  if (moisture > READY_HI) return 'small-snap'
  if (moisture >= OVERDRY) return 'snap'
  return 'brittle'
}

export interface CureBreakdown {
  /** 0..1 aroma kept (1 - terpene loss) */
  aroma: number
  /** 0..1, 1 = no mold pressure */
  cleanliness: number
  /** 0..1 factor from cure progress */
  cure: number
  /** 0..1 factor from final bud moisture */
  moisture: number
  score: number
}

export function breakdown(terpeneLoss: number, moldRisk: number, cureProgress: number | null, finalMoisture: number): CureBreakdown {
  const aroma = clamp(1 - terpeneLoss, 0, 1)
  const cleanliness = 1 - 0.6 * clamp(moldRisk, 0, 1) ** 1.5
  const cure = cureProgress == null ? 0.45 : 0.6 + 0.4 * clamp(cureProgress, 0, 1)
  const dev = Math.max(0, Math.abs(finalMoisture - 0.115) - 0.01)
  const moisture = clamp(1 - dev * 8, 0.6, 1)
  return { aroma, cleanliness, cure, moisture, score: clamp(aroma * cleanliness * cure * moisture, 0, 1) }
}
