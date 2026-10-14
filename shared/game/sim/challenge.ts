import type { ChallengeDef, ChallengeScore, GameAction, GameState, LoggedAction } from '../types.ts'
import { apply, potItem } from './actions.ts'
import { seedKey } from './content.ts'
import { emptyState, newTent } from './state.ts'
import { advance } from './step.ts'

/** Hard limits so a submitted run cannot stall the server. */
export const CHALLENGE_MAX_H = 260 * 24
export const CHALLENGE_MAX_ACTIONS = 4000

/**
 * Fresh challenge run: fixed gear, one plant sown at hour 0, empty log.
 * The sow is part of the setup, not of the log.
 */
export function newChallenge(def: ChallengeDef, nowMs: number): GameState {
  const s = emptyState(def.seed, nowMs)
  s.eventsSeed = def.eventsSeed | 0
  s.coins = def.startCoins
  s.tents.push(newTent('t1', def.tentItem, def.light || null, def.gear))
  s.owned = [def.tentItem, def.light, ...def.gear].filter(Boolean)
  s.inventory[seedKey(def.strainId)] = 1
  const pot = potItem(def.potL, def.medium)
  if (pot) s.inventory[pot.id] = 1
  apply(s, { t: 'sow', strainId: def.strainId, tentId: 't1', medium: def.medium, potL: def.potL } as GameAction)
  s.log = []
  return s
}

export function challengeScore(s: GameState): ChallengeScore {
  const r = s.history[0] ?? s.pending?.[0]
  if (!r) return { quality: 0, dryG: 0, score: 0 }
  return { quality: r.quality, dryG: r.dryG, score: Math.round(r.dryG * r.quality / 10) }
}

/** Server and client: rebuild a challenge from its definition and logged actions. */
export function replayChallenge(def: ChallengeDef, actions: LoggedAction[]): ChallengeScore {
  const s = newChallenge(def, 0)
  const list = actions.slice(0, CHALLENGE_MAX_ACTIONS)
  for (const la of list) {
    const at = Math.floor(Number(la?.atH))
    if (!Number.isFinite(at) || at < s.nowH || at > CHALLENGE_MAX_H || !la.action) break
    advance(s, at)
    apply(s, la.action)
  }
  return challengeScore(s)
}
