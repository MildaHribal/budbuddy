import type { ActiveProblem, ProblemCtx, ProblemId, ProblemRule } from '../../types.ts'
import {
  clamp, findProblem, hoursSinceTreated, hurtRoots, inFlower, isGrowing, lateFlower, MAX_RATE_LATE, rule, SEED_LOAD, settle,
  severityOf, sprayedRecently, stillAir, worsen
} from './core.ts'
import { PROBLEM_TREATMENTS } from './treatments.ts'

/** per-hour kill fraction of a treatment, working from lagH to lagH + durH after it was applied */
interface Knockdown { kill: number, lagH: number, durH: number }

const KNOCKDOWN: Record<string, Knockdown> = {
  'neem-oil': { kill: 0.025, lagH: 0, durH: 96 },
  'insecticidal-soap': { kill: 0.035, lagH: 0, durH: 48 },
  // predators need a couple of days to settle, then keep hunting for weeks
  'predatory-mites': { kill: 0.02, lagH: 48, durH: 720 },
  'spinosad': { kill: 0.04, lagH: 0, durH: 96 },
  'bt-spray': { kill: 0.035, lagH: 12, durH: 96 },
  'sticky-traps': { kill: 0.006, lagH: 0, durH: 2000 },
  'sulfur-spray': { kill: 0.035, lagH: 0, durH: 72 },
  'hydrogen-peroxide': { kill: 0.06, lagH: 0, durH: 12 },
  'beneficial-nematodes': { kill: 0.02, lagH: 24, durH: 400 },
  'remove-buds': { kill: 0.1, lagH: 0, durH: 8 },
  'repot': { kill: 0.15, lagH: 0, durH: 6 }
}

/** below this population the colony is dying out and symptoms fade */
const DYING_LOAD = 0.015
const PEST_HEAL = 0.006

interface PestDef {
  id: ProblemId
  /** logistic growth per hour at favour 1 */
  r: number
  /** how much current conditions suit the pest, about 0..2; below 0.3 the colony shrinks */
  favour: (ctx: ProblemCtx) => number
  /** spontaneous onset intensity (bagged soil, moths); default: only the hitchhiker event seeds it */
  onset?: (ctx: ProblemCtx) => number
  effect?: (ctx: ProblemCtx, load: number) => void
}

const warmth = (ctx: ProblemCtx, from = 22, span = 8) => clamp((ctx.tent.env.tempC - from) / span, 0, 1.2)
const dryness = (ctx: ProblemCtx) => clamp((50 - ctx.tent.env.rh) / 20)
const loadOf = (p: ActiveProblem | undefined) => p?.load ?? SEED_LOAD

export function knockdown(ctx: ProblemCtx, p: ActiveProblem): number {
  if (!p.treatedWith || !PROBLEM_TREATMENTS[p.id]?.includes(p.treatedWith)) return 0
  const k = KNOCKDOWN[p.treatedWith]
  if (!k) return 0
  const h = hoursSinceTreated(ctx, p)
  return h >= k.lagH && h < k.lagH + k.durH ? k.kill : 0
}

function pest(def: PestDef): ProblemRule {
  return rule(def.id, (ctx) => {
    const p = findProblem(ctx.plant, def.id)
    if (!p) return def.onset && isGrowing(ctx.plant) ? worsen(ctx, def.id, def.onset(ctx)) : 0
    const load = loadOf(p)
    if (load < DYING_LOAD) return -PEST_HEAL
    return worsen(ctx, def.id, load / 0.4)
  }, (ctx, p) => {
    let load = loadOf(p)
    const r = def.r * (def.favour(ctx) - 0.3) * (1 - 0.5 * ctx.plant.genome.pestResistance)
    load += r * load * (1 - load)
    load *= 1 - knockdown(ctx, p)
    p.load = load < 0.005 ? 0 : clamp(load)
    def.effect?.(ctx, p.load)
  })
}

const soilBound = (ctx: ProblemCtx) => ctx.plant.medium !== 'hydro'

export const PEST_RULES: ProblemRule[] = [
  pest({
    id: 'spider_mites',
    r: 0.02,
    favour: ctx => (0.4 + warmth(ctx, 24, 6) + dryness(ctx) * 0.6 + stillAir(ctx) * 0.3) * (ctx.tent.env.rh > 65 ? 0.5 : 1)
  }),
  pest({ id: 'thrips', r: 0.018, favour: ctx => 0.5 + warmth(ctx) + dryness(ctx) * 0.3 }),
  pest({
    id: 'aphids',
    r: 0.022,
    // soft, nitrogen-rich growth feeds colonies
    favour: ctx => 0.5 + (ctx.plant.reserves.N > 1.1 ? 0.5 : 0) + (ctx.tent.env.tempC > 18 && ctx.tent.env.tempC < 28 ? 0.3 : 0)
  }),
  pest({
    id: 'fungus_gnats',
    r: 0.02,
    favour: (ctx) => {
      if (!soilBound(ctx)) return 0.1
      const w = ctx.plant.root.water
      return w > 0.6 ? 0.5 + (w - 0.6) * 3 : 0.15
    },
    // eggs come in with bagged soil; larvae only take off in soil that stays wet
    onset: ctx => ctx.plant.medium === 'soil' && ctx.plant.root.water > 0.85 && ctx.rand() < 0.002 ? 1 : 0,
    effect: (ctx, load) => hurtRoots(ctx.plant, 0.0006 * load * (ctx.plant.stage === 'seedling' ? 2 : 1))
  }),
  pest({ id: 'whiteflies', r: 0.016, favour: ctx => 0.5 + warmth(ctx) + stillAir(ctx) }),
  pest({
    id: 'caterpillars',
    r: 0.012,
    favour: ctx => inFlower(ctx.plant) ? 1 : 0.7,
    // a moth slipping in through the intake now and then
    onset: ctx => inFlower(ctx.plant) && ctx.rand() < 0.00002 ? 1 : 0,
    effect: (ctx, load) => {
      if (inFlower(ctx.plant)) ctx.plant.budMass = Math.max(0, ctx.plant.budMass * (1 - 0.0004 * load))
    }
  }),
  pest({ id: 'mealybugs', r: 0.012, favour: ctx => 0.5 + warmth(ctx) * 0.6 + dryness(ctx) * 0.3 + stillAir(ctx) }),
  pest({ id: 'leaf_miners', r: 0.012, favour: () => 0.8 }),
  pest({ id: 'russet_broad_mites', r: 0.016, favour: ctx => 0.6 + warmth(ctx) * 0.8 }),
  pest({
    id: 'root_aphids',
    r: 0.012,
    favour: ctx => soilBound(ctx) ? 0.8 + (ctx.plant.root.water < 0.4 ? 0.2 : 0) : 0.2,
    effect: (ctx, load) => hurtRoots(ctx.plant, 0.0008 * load)
  })
]

/** canopy density 0..1 from bud mass against the strain's potential */
const budDensity = (ctx: ProblemCtx) => clamp(ctx.plant.budMass / Math.max(1, ctx.plant.genome.yieldPotential))
const leafDensity = (ctx: ProblemCtx) => clamp((ctx.plant.biomass - 60) / 120)

export const DISEASE_RULES: ProblemRule[] = [
  rule('powdery_mildew', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant) || plant.stage === 'seedling') return 0
    const thr = inFlower(plant) ? 60 : 65
    const rh = tent.env.rh + severityOf(plant, 'high_humidity') * 5
    const rhX = (rh - thr) / 15
    const x = rhX > 0 ? rhX * (0.3 + stillAir(ctx) + 0.5 * leafDensity(ctx)) * (1 - 0.6 * plant.genome.moldResistance) : 0
    const dryAndBreezy = tent.env.rh < thr - 5 && tent.env.airflow > 0.3
    return settle(ctx, 'powdery_mildew', x > 0 ? x : dryAndBreezy ? -1 : 0, 0.0003)
  }),

  rule('botrytis', (ctx) => {
    const { plant, tent } = ctx
    if (!lateFlower(plant)) return 0
    const rh = tent.env.rh
    const rhX = clamp((rh - 55) / 15, 0, 1.5)
    const cat = findProblem(plant, 'caterpillars')
    let x = rhX * (0.4 + budDensity(ctx) + stillAir(ctx)) * (1 - 0.7 * plant.genome.moldResistance)
    if (cat) x += (cat.load ?? 0) * 0.5
    if (rh > 45 && sprayedRecently(ctx, 24)) x += 0.4
    const active = findProblem(plant, 'botrytis')
    // rot inside a bud keeps eating unless the air is really dry
    if (active && rh >= 50) x = Math.max(x, 0.15)
    return settle(ctx, 'botrytis', x > 0 ? x : rh < 45 && tent.env.airflow > 0.4 ? -1 : 0, 0.0003)
  }, (ctx, p) => {
    ctx.plant.budMass = Math.max(0, ctx.plant.budMass * (1 - 0.0008 * p.severity))
  }),

  rule('septoria', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant) || plant.stage === 'seedling') return 0
    const rh = tent.env.rh
    let x = rh > 70 ? ((rh - 70) / 15) * (0.5 + stillAir(ctx)) * (1 - 0.4 * plant.genome.moldResistance) : 0
    if (rh > 55 && sprayedRecently(ctx, 24)) x += 0.3 * (0.5 + stillAir(ctx))
    return settle(ctx, 'septoria', x > 0 ? x : rh < 60 ? -1 : 0, 0.0004)
  }),

  rule('fusarium_wilt', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant) || !soilBound(ctx)) return 0
    const warm = clamp((tent.env.tempC - 26) / 4)
    const wet = clamp((plant.root.water - 0.75) / 0.25)
    const hurt = clamp((1 - plant.root.health) / 0.3)
    let x = warm * wet * hurt * 0.8
    // once the vessels are blocked there is no way back
    if (findProblem(plant, 'fusarium_wilt')) x = Math.max(x, 0.35)
    return settle(ctx, 'fusarium_wilt', x, 0)
  }, (ctx, p) => hurtRoots(ctx.plant, 0.001 * p.severity)),

  rule('hlvd', (ctx) => {
    if (!isGrowing(ctx.plant)) return 0
    // latent viroid: rare, no cure, slow
    if (findProblem(ctx.plant, 'hlvd')) return 0.4 * MAX_RATE_LATE
    return ctx.rand() < 0.000015 ? worsen(ctx, 'hlvd', 1) : 0
  })
]
