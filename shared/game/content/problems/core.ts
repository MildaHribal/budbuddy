import { REAL_MS_PER_GAME_HOUR, STEP_H } from '../../types.ts'
import type { ActiveProblem, PlantSim, ProblemCtx, ProblemId, ProblemRule, Stage } from '../../types.ts'

export const GAME_H_PER_REAL_H = 3_600_000 / REAL_MS_PER_GAME_HOUR
export const PHASES: [number, number, number] = [0.15, 0.4, 0.75]
const MARGIN = 1.1
/** fastest worsening below 'clear': onset to clear takes >= 2 real hours */
export const MAX_RATE_EARLY = PHASES[1] / (2 * GAME_H_PER_REAL_H * MARGIN)
/** fastest worsening from 'clear' on: clear to severe takes >= 3 more real hours */
export const MAX_RATE_LATE = (PHASES[2] - PHASES[1]) / (3 * GAME_H_PER_REAL_H * MARGIN)

/** load a pest starts from when the engine seeds it without one */
export const SEED_LOAD = 0.02

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))

export const findProblem = (plant: PlantSim, id: ProblemId): ActiveProblem | undefined => plant.problems.find(p => p.id === id)

export const severityOf = (plant: PlantSim, id: ProblemId): number => findProblem(plant, id)?.severity ?? 0

/** Pressure for a bad-condition intensity x (0..1+), capped so phases respect the real-time balance targets. */
export function worsen(ctx: ProblemCtx, id: ProblemId, x: number): number {
  if (x <= 0) return 0
  const sev = severityOf(ctx.plant, id)
  return clamp(x) * (sev < PHASES[1] ? MAX_RATE_EARLY : MAX_RATE_LATE)
}

/**
 * x > 0 worsens, x < 0 heals at healRate while active, x === 0 holds (stops progressing).
 */
export function settle(ctx: ProblemCtx, id: ProblemId, x: number, healRate: number): number {
  if (x > 0) return worsen(ctx, id, x)
  if (x < 0 && findProblem(ctx.plant, id)) return -healRate
  return 0
}

const GROWING: Stage[] = ['seedling', 'veg', 'flower', 'ripening']
export const isGrowing = (plant: PlantSim): boolean => !plant.dead && GROWING.includes(plant.stage)
export const isAlive = (plant: PlantSim): boolean => !plant.dead && plant.stage !== 'harvested' && plant.stage !== 'dead'
export const inFlower = (plant: PlantSim): boolean => plant.stage === 'flower' || plant.stage === 'ripening'
export const lateFlower = (plant: PlantSim): boolean => plant.stage === 'ripening' || (plant.stage === 'flower' && plant.ripeness >= 0.35)

/** Past roughly week 2 of flower buds are forming and must not be sprayed. */
export function budsForming(ctx: ProblemCtx): boolean {
  const { plant, nowH } = ctx
  if (!inFlower(plant)) return false
  if (plant.stage === 'ripening' || plant.ripeness >= 0.2) return true
  const start = plant.flipAtH ?? plant.stageStartH
  return nowH - start > 14 * 24
}

export const phWindow = (plant: PlantSim): [number, number] => plant.medium === 'soil' ? [6.0, 7.0] : [5.5, 6.5]

/** how far root pH sits outside the medium's window, 0 inside */
export function phOff(plant: PlantSim): number {
  const [lo, hi] = phWindow(plant)
  const ph = plant.root.ph
  return ph < lo ? lo - ph : ph > hi ? ph - hi : 0
}

export const dli = (ctx: ProblemCtx): number => ctx.tent.env.ppfd * ctx.tent.env.lightHours * 0.0036

/** Treatments that leave buds wet; the harsh ones also burn trichomes and pistils. */
export const HARSH_SPRAYS = ['neem-oil', 'insecticidal-soap', 'sulfur-spray', 'potassium-bicarbonate', 'spinosad']
export const WET_SPRAYS = [...HARSH_SPRAYS, 'bt-spray']
const SPRAY_HARM_H = 24
const SPRAY_HARM_TOTAL = 0.036

export const hoursSinceTreated = (ctx: ProblemCtx, p: ActiveProblem | undefined): number =>
  p?.treatedAtH === undefined ? Infinity : ctx.nowH - p.treatedAtH

export function treatedRecently(ctx: ProblemCtx, p: ActiveProblem | undefined, ids: string[], withinH: number): boolean {
  if (!p?.treatedWith || !ids.includes(p.treatedWith)) return false
  const h = hoursSinceTreated(ctx, p)
  return h >= 0 && h < withinH
}

/** any problem on the plant was sprayed within the window (wet leaves and buds) */
export const sprayedRecently = (ctx: ProblemCtx, withinH: number): boolean =>
  ctx.plant.problems.some(p => treatedRecently(ctx, p, WET_SPRAYS, withinH))

/** Harsh sprays on forming buds damage them, spread over the hours after spraying. */
export function sprayHarm(ctx: ProblemCtx, p: ActiveProblem): void {
  if (!budsForming(ctx) || !treatedRecently(ctx, p, HARSH_SPRAYS, SPRAY_HARM_H)) return
  ctx.plant.damage = clamp(ctx.plant.damage + (SPRAY_HARM_TOTAL / SPRAY_HARM_H) * STEP_H)
}

export function rule(
  id: ProblemId,
  pressure: (ctx: ProblemCtx) => number,
  effect?: (ctx: ProblemCtx, p: ActiveProblem) => void
): ProblemRule {
  return {
    id,
    pressure: ctx => isAlive(ctx.plant) ? pressure(ctx) : 0,
    effect: (ctx, p) => {
      sprayHarm(ctx, p)
      effect?.(ctx, p)
    }
  }
}

export const hurtRoots = (plant: PlantSim, amount: number): void => {
  plant.root.health = clamp(plant.root.health - amount)
}

/** 0 with decent air movement, 1 in still air */
export const stillAir = (ctx: ProblemCtx): number => clamp((0.4 - ctx.tent.env.airflow) / 0.4)
