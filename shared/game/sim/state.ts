import type { GameState, Tent } from '../types.ts'
import { vpd } from './climate.ts'
import { content, equipmentDef, levelFor, seedKey } from './content.ts'

export function newTent(id: string, tentItem: string, light: string | null, gear: string[]): Tent {
  return {
    id,
    tentItem,
    light,
    gear: gear.filter(g => equipmentDef(g)?.slot !== 'pot'),
    env: { tempC: 22, rh: 55, vpd: vpd(22, 55, false), ppfd: 0, lightsOn: false, lightHours: 18, airflow: 0, leak: 0 },
    climate: { tempC: 25, rh: 55 },
    lightHours: 18,
    dim: 1,
    plantIds: []
  }
}

export function emptyState(seed: number, nowMs: number): GameState {
  const s = seed | 0
  return {
    v: 1,
    seed: s,
    rng: (s ^ 0x2545F491) | 0,
    nowH: 0,
    syncedAtMs: nowMs,
    coins: 0,
    xp: 0,
    level: levelFor(0),
    tents: [],
    plants: {},
    inventory: {},
    owned: [],
    drying: [],
    jars: [],
    history: [],
    knowledge: [],
    customStrains: [],
    rewardedReal: [],
    events: [],
    settings: { notifications: true },
    pending: [],
    seq: 0
  }
}

/** Starter tent with starter light and gear, starter seeds and coins. */
export function newGame(seed: number, nowMs: number): GameState {
  const st = content().starter
  const state = emptyState(seed, nowMs)
  state.coins = st.coins
  state.tents.push(newTent('t1', st.tentItem, st.light || null, st.gear))
  state.owned = [st.tentItem, st.light, ...st.gear].filter(Boolean)
  if (st.strainId) state.inventory[seedKey(st.strainId)] = st.seeds
  for (const [id, n] of Object.entries(st.stock ?? {})) state.inventory[id] = n
  return state
}
