import type { Forecast, GameState, PlantSim, ProblemCtx } from '../types.ts'
import { makeRand } from '../rng.ts'
import { dryingForecast } from '../drying.ts'
import { ruleDef } from './content.ts'
import { areaPerPlant, flowerClock, potLossLph } from './plant.ts'
import { DEFAULT_PHASES, TREAT_PULL, pullsDown } from './problems.ts'
import { tentSpec } from './spec.ts'
import { THIRSTY, capacityL } from './water.ts'

const living = (p: PlantSim): boolean => !p.dead && p.stage !== 'harvested'

/** Predicted moments within horizonH game hours, sorted by time. Does not mutate state. */
export function forecast(state: GameState, horizonH: number): Forecast[] {
  const now = state.nowH
  const end = now + horizonH
  const out: Forecast[] = []
  const holder = { rng: state.rng }
  const rand = makeRand(holder)
  for (const tent of state.tents) {
    const spec = tentSpec(tent)
    const irrigated = spec.irrigation
    const areaPer = areaPerPlant(spec, tent.plantIds.filter(id => !!state.plants[id] && living(state.plants[id] as PlantSim)).length)
    const ctx: ProblemCtx = { plant: undefined as unknown as PlantSim, tent, nowH: now, rand }
    for (const id of tent.plantIds) {
      const p = state.plants[id]
      if (!p || !living(p)) continue
      if (!irrigated && p.medium !== 'hydro' && p.stage !== 'germination') {
        const lh = Math.min(24, Math.max(0, tent.lightHours))
        const perH = (potLossLph(p, tent.env.vpd, true, areaPer) * lh + potLossLph(p, tent.env.vpd, false, areaPer) * (24 - lh)) / 24
        const spare = (p.root.water - THIRSTY) * capacityL(p)
        const at = spare <= 0 ? now : perH > 0 ? now + spare / perH : Infinity
        if (at <= end) out.push({ atH: Math.round(at), kind: 'thirsty', plantId: p.id })
      }
      ctx.plant = p
      for (const x of p.problems) {
        const rule = ruleDef(x.id)
        if (!rule) continue
        let pr = rule.pressure(ctx)
        if (pullsDown(x, now)) pr -= TREAT_PULL
        if (!(pr > 0)) continue
        const next = (rule.phases ?? DEFAULT_PHASES).find(t => t > x.severity)
        if (next === undefined) continue
        const at = now + (next - x.severity) / pr
        if (at <= end) out.push({ atH: Math.round(at), kind: 'problem', plantId: p.id })
      }
      const c = flowerClock(p)
      if (c) {
        const at = c.startH + 0.951 * c.lenH
        if (at > now && at <= end) out.push({ atH: Math.ceil(at), kind: 'ripe', plantId: p.id })
      }
    }
  }
  for (const f of dryingForecast(state)) if (f.atH <= end) out.push({ ...f, atH: Math.max(now, Math.round(f.atH)) })
  return out.sort((a, b) => a.atH - b.atH)
}
