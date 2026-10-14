import type { ActiveProblem, GameState, PlantSim, ProblemCtx, ProblemId, ProblemPhase, ProblemRule, Tent } from '../types.ts'
import { ruleDef, rules, treatmentDef } from './content.ts'
import { PEST_IDS, pushEvent } from './events.ts'

export const DEFAULT_PHASES: [number, number, number] = [0.15, 0.4, 0.75]
/** severity a problem starts at the first hour its pressure turns positive */
export const ONSET = 0.02
/** a helping treatment pulls severity down this much per game hour */
export const TREAT_PULL = 0.015
export const TREAT_H = 96

export function phaseOf(sev: number, phases: [number, number, number] = DEFAULT_PHASES): ProblemPhase {
  if (sev >= phases[2]) return 'severe'
  if (sev >= phases[1]) return 'clear'
  if (sev >= phases[0]) return 'subtle'
  return 'hidden'
}

export const problemPhase = (p: ActiveProblem): ProblemPhase => phaseOf(p.severity, ruleDef(p.id)?.phases)

/**
 * Problems healed by the real state change a treatment causes (pH shift, flush, Ca/Mg) or by the rule's own
 * knockdown model (pests); they get no generic pull.
 */
const NO_PULL = new Set<ProblemId>([
  'n_def', 'p_def', 'k_def', 'ca_def', 'mg_def', 's_def', 'fe_def', 'zn_def', 'mn_def', 'b_def', 'cu_def', 'mo_def',
  'nutrient_burn', 'n_toxicity', 'ph_lockout', 'salt_buildup', ...PEST_IDS
])

export function treatmentHelps(p: ActiveProblem, nowH: number): boolean {
  if (!p.treatedWith || p.treatedAtH === undefined || nowH - p.treatedAtH >= TREAT_H) return false
  return !!treatmentDef(p.treatedWith)?.helps.includes(p.id)
}

export const pullsDown = (p: ActiveProblem, nowH: number): boolean => !NO_PULL.has(p.id) && treatmentHelps(p, nowH)

export function activate(plant: PlantSim, id: ProblemId, severity: number, nowH: number, load?: number): ActiveProblem {
  let p = plant.problems.find(x => x.id === id)
  if (!p) {
    p = { id, severity, onsetH: nowH }
    if (load !== undefined) p.load = load
    plant.problems.push(p)
  }
  return p
}

const LOAD = { sum: 0, severe: 0 }

/** Steps every rule for one plant (the returned object is reused). `sum` is the load on the plant: worst severity plus a third of the rest. */
export function stepProblems(state: GameState, plant: PlantSim, tent: Tent, ctx: ProblemCtx, dt: number): { sum: number, severe: number } {
  const list = rules()
  let sum = 0
  let max = 0
  let severe = 0
  for (let i = 0; i < list.length; i++) {
    const rule: ProblemRule = list[i] as ProblemRule
    let pressure = rule.pressure(ctx)
    if (!Number.isFinite(pressure)) pressure = 0
    const idx = plant.problems.length ? findIdx(plant.problems, rule.id) : -1
    if (idx < 0) {
      if (pressure > 0) activate(plant, rule.id, Math.max(ONSET, pressure * dt), state.nowH)
      continue
    }
    const p = plant.problems[idx] as ActiveProblem
    if (pullsDown(p, state.nowH)) pressure -= TREAT_PULL
    const phases = rule.phases ?? DEFAULT_PHASES
    const before = p.severity
    p.severity = Math.min(1, Math.max(0, before + pressure * dt))
    if (p.severity <= 0) {
      plant.problems.splice(idx, 1)
      continue
    }
    if (before < phases[1] && p.severity >= phases[1]) {
      pushEvent(state, 'problem', { en: 'Something is visibly wrong with a plant.', cs: 'Na rostlině je vidět, že něco není v pořádku.' }, plant.id, tent.id)
    }
    rule.effect?.(ctx, p)
    sum += p.severity
    if (p.severity > max) max = p.severity
    if (p.severity >= phases[2]) severe = Math.max(severe, p.severity - phases[2] + 0.01)
  }
  // problems without a rule (seeded by events) slowly fade
  for (let i = plant.problems.length - 1; i >= 0; i--) {
    const p = plant.problems[i] as ActiveProblem
    if (ruleDef(p.id)) continue
    p.severity -= 0.002 * dt
    if (p.severity <= 0) plant.problems.splice(i, 1)
    else {
      sum += p.severity
      if (p.severity > max) max = p.severity
    }
  }
  LOAD.sum = max + (sum - max) / 3
  LOAD.severe = severe
  return LOAD
}

function findIdx(list: ActiveProblem[], id: ProblemId): number {
  for (let i = 0; i < list.length; i++) if ((list[i] as ActiveProblem).id === id) return i
  return -1
}
