import { STEP_H, REAL_MS_PER_GAME_HOUR } from '../types.ts'
import type { GameState, PlantSim, ProblemCtx } from '../types.ts'
import { makeRand } from '../rng.ts'
import { stepDrying } from '../drying.ts'
import { ambientAt, stepClimate } from './climate.ts'
import { levelFor } from './content.ts'
import { pushEvent, rollRandomEvents, tentModifiers } from './events.ts'
import { plantPpfd } from './light.ts'
import { areaPerPlant, stepPlant, transpiration } from './plant.ts'
import { autoIrrigate } from './actions.ts'
import { tentSpec } from './spec.ts'
import { MAX_CATCHUP_REAL_MS, lightsOnAt, msToGameHour } from './time.ts'

const living = (p: PlantSim | undefined): p is PlantSim => !!p && !p.dead && p.stage !== 'harvested'

/** One sim step of STEP_H game hours. */
export function step(state: GameState): void {
  const dt = STEP_H
  const rand = makeRand(state)
  rollRandomEvents(state)
  for (const tent of state.tents) {
    const spec = tentSpec(tent)
    const mod = tentModifiers(state, tent.id)
    const plants: PlantSim[] = []
    for (const id of tent.plantIds) {
      const p = state.plants[id]
      if (living(p)) plants.push(p)
    }
    const lightsOn = mod.power && !!spec.light && lightsOnAt(state.nowH, tent.lightHours)
    let transp = 0
    const areaPer = areaPerPlant(spec, plants.length)
    for (const p of plants) transp += transpiration(p, tent.env.vpd, lightsOn, areaPer)
    stepClimate(tent, spec, ambientAt(state.nowH, mod.tempC, mod.rh, mod.power), lightsOn, transp)
    let canopy = plantPpfd(null, spec, tent.dim)
    const ctx: ProblemCtx = { plant: plants[0] as PlantSim, tent, nowH: state.nowH, rand }
    const se = { spec, ppfd: 0, plantsInTent: plants.length }
    for (const p of plants) {
      const ppfd = plantPpfd(p, spec, tent.dim)
      if (ppfd > canopy) canopy = ppfd
      tent.env.ppfd = lightsOn ? ppfd : 0
      ctx.plant = p
      if (spec.irrigation && mod.power) autoIrrigate(state, p, tent)
      se.ppfd = ppfd
      stepPlant(state, p, tent, se, ctx, dt)
    }
    tent.env.ppfd = lightsOn ? canopy : 0
  }
  stepDrying(state, dt)
  state.nowH += dt
  const lvl = levelFor(state.xp)
  if (lvl > state.level) {
    state.level = lvl
    pushEvent(state, 'info', { en: `Level ${lvl} reached.`, cs: `Dosažena úroveň ${lvl}.` })
  }
}

/** Steps until nowH reaches toH (whole steps only). */
export function advance(state: GameState, toH: number): void {
  while (state.nowH + STEP_H <= toH + 1e-9) step(state)
}

/** Advances to the real clock; offline catch-up is capped, the rest of the gap is skipped. */
export function syncToNow(state: GameState, nowMs: number): void {
  if (nowMs <= state.syncedAtMs) return
  const capped = nowMs - state.syncedAtMs > MAX_CATCHUP_REAL_MS
  const target = msToGameHour(state, capped ? state.syncedAtMs + MAX_CATCHUP_REAL_MS : nowMs)
  advance(state, target)
  state.syncedAtMs = capped ? nowMs : nowMs - (target - state.nowH) * REAL_MS_PER_GAME_HOUR
}
