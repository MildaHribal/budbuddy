import type { GameEvent, GameState, L10n, PlantSim, ProblemId } from '../types.ts'
import { nextRandom } from '../rng.ts'
import { randomEvents, ruleDef } from './content.ts'

export const MAX_EVENTS = 200

export function nextId(state: GameState, prefix: string): string {
  state.seq = (state.seq ?? 0) + 1
  return `${prefix}${state.seq}`
}

export function pushEvent(state: GameState, kind: GameEvent['kind'], text: L10n, plantId?: string, tentId?: string): GameEvent {
  const e: GameEvent = { id: nextId(state, 'e'), atH: state.nowH, kind, text }
  if (plantId) e.plantId = plantId
  if (tentId) e.tentId = tentId
  state.events.push(e)
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS)
  return e
}

/** Event dice depend only on (eventsSeed, hour, k) so they do not drift with player actions. */
export function eventRoll(seed: number, h: number, k: number): number {
  return nextRandom((seed ^ Math.imul(h + 1, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA6B)) | 0)[0]
}

/** Fallbacks when a RandomEventDef has no durationH / magnitude. */
const EVENT_HOURS: Record<string, number> = { 'power-cut': 6, 'heatwave': 48, 'cold-snap': 36, 'humidity-spike': 24 }
const EVENT_MAG: Record<string, number> = { 'heatwave': 8, 'cold-snap': -10, 'humidity-spike': 25 }
const MAX_EVENT_H = 240

export const PEST_IDS: ProblemId[] = ['spider_mites', 'thrips', 'aphids', 'fungus_gnats', 'whiteflies', 'caterpillars', 'mealybugs', 'leaf_miners', 'russet_broad_mites', 'root_aphids']

export interface TentModifiers { tempC: number, rh: number, power: boolean }

/** Climate offsets from recent random events hitting a tent. */
export function tentModifiers(state: GameState, tentId: string): TentModifiers {
  const m: TentModifiers = { tempC: 0, rh: 0, power: true }
  const ev = state.events
  const defs = randomEvents()
  for (let i = ev.length - 1; i >= 0; i--) {
    const e = ev[i] as GameEvent
    const age = state.nowH - e.atH
    if (age > MAX_EVENT_H) break
    if (e.tentId !== tentId || EVENT_HOURS[e.kind] === undefined) continue
    const def = defs.find(d => d.kind === e.kind)
    const dur = def?.durationH ?? EVENT_HOURS[e.kind]
    if (dur === undefined || age >= dur) continue
    const mag = def?.magnitude ?? EVENT_MAG[e.kind] ?? 0
    if (e.kind === 'power-cut') m.power = false
    else if (e.kind === 'heatwave') m.tempC += Math.abs(mag)
    else if (e.kind === 'cold-snap') m.tempC -= Math.abs(mag)
    else if (e.kind === 'humidity-spike') m.rh += mag
  }
  return m
}

export function rollRandomEvents(state: GameState): void {
  const defs = randomEvents()
  if (!defs.length || !state.tents.length) return
  const seed = state.eventsSeed ?? state.seed
  const h = state.nowH
  for (let k = 0; k < defs.length; k++) {
    const def = defs[k] as typeof defs[number]
    if (def.minLevel > state.level) continue
    if (eventRoll(seed, h, k * 3) >= def.chancePerDay / 24) continue
    const tent = state.tents[Math.floor(eventRoll(seed, h, k * 3 + 1) * state.tents.length)]
    if (!tent) continue
    if (def.kind === 'pest-hitchhiker') {
      const alive = tent.plantIds.map(id => state.plants[id]).filter((p): p is PlantSim => !!p && !p.dead && p.stage !== 'harvested')
      const pests = PEST_IDS.filter(id => ruleDef(id))
      if (!alive.length || !pests.length) continue
      const r = eventRoll(seed, h, k * 3 + 2)
      const plant = alive[Math.floor(r * alive.length)] as PlantSim
      const id = pests[Math.floor(((r * 997) % 1) * pests.length)] as ProblemId
      if (!plant.problems.some(p => p.id === id)) plant.problems.push({ id, severity: 0.03, onsetH: h })
      pushEvent(state, def.kind, def.text, plant.id, tent.id)
    } else {
      pushEvent(state, def.kind, def.text, undefined, tent.id)
    }
  }
}
