import type { GameState, Observation } from '../types.ts'
import { presentation } from './content.ts'
import { problemPhase } from './problems.ts'
import { tentSpec } from './spec.ts'

const r1 = (x: number): number => Math.round(x * 10) / 10
const r2 = (x: number): number => Math.round(x * 100) / 100

/** What the player can see and measure. Readings only with the matching meter in the tent. */
export function observe(state: GameState, plantId: string): Observation {
  const p = state.plants[plantId]
  if (!p) throw new Error(`unknown plant ${plantId}`)
  const tent = state.tents.find(t => t.id === p.tentId)
  const pres = presentation()
  const signs: Observation['signs'] = []
  p.problems.forEach((x, i) => {
    const phase = problemPhase(x)
    if (phase === 'hidden') return
    const lines = pres[x.id]?.observations[phase]
    if (lines?.length) signs.push({ key: `${x.onsetH}-${i}`, phase, lines })
  })
  const readings: Observation['readings'] = {}
  if (tent) {
    const m = tentSpec(tent).meters
    if (m.ph) readings.ph = r1(p.root.ph)
    if (m.ec) readings.ec = r2(p.root.ec)
    if (m.climate) {
      readings.tempC = r1(tent.env.tempC)
      readings.rh = Math.round(tent.env.rh)
      readings.vpd = r2(tent.env.vpd)
    }
    if (m.ppfd) readings.ppfd = Math.round(tent.env.ppfd)
    if (m.moisture) readings.potWater = Math.round(p.root.water * 100) / 100
  }
  const w = p.root.water
  return {
    plantId,
    stage: p.stage,
    ageDays: Math.floor((state.nowH - p.sownAtH) / 24),
    signs,
    readings,
    potFeel: w < 0.3 ? 'dry' : w < 0.8 ? 'moist' : 'wet',
    health: r2(p.health)
  }
}
