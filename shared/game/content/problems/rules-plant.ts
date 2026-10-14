import type { Nutrient, PlantSim, ProblemId, ProblemRule, Stage } from '../../types.ts'
import {
  clamp, dli, findProblem, hurtRoots, inFlower, isGrowing, lateFlower, phOff, rule, settle, severityOf, treatedRecently
} from './core.ts'

const DEF_HEAL = 0.0012

function deficiency(id: ProblemId, el: Nutrient): ProblemRule {
  return rule(id, (ctx) => {
    const { plant } = ctx
    if (!isGrowing(plant)) return 0
    const r = plant.reserves[el]
    // fan leaves fading in the last weeks of flower is normal senescence
    const low = el === 'N' && plant.stage === 'ripening' ? 0.45 : 0.6
    let x = r < low ? (low - r) / 0.3 : r > low + 0.15 ? -1 : 0
    if (el === 'N' && treatedRecently(ctx, findProblem(plant, id), ['flush-water'], 48)) x = Math.max(x, 0) + 0.5
    return settle(ctx, id, x, DEF_HEAL)
  })
}

const BURN_EC: Partial<Record<Stage, number>> = { seedling: 1.2, veg: 2.2, flower: 2.6, ripening: 2.4 }
const LIGHT_MAX: Partial<Record<Stage, number>> = { seedling: 450, veg: 900, flower: 1100, ripening: 1100 }
const TACO_PPFD: Partial<Record<Stage, number>> = { seedling: 380, veg: 800, flower: 950, ripening: 950 }
const DLI_MIN: Partial<Record<Stage, number>> = { seedling: 8, veg: 15, flower: 20, ripening: 20 }
const RH_MAX: Partial<Record<Stage, number>> = { seedling: 80, veg: 70, flower: 60, ripening: 55 }
const VPD_MAX: Partial<Record<Stage, number>> = { seedling: 1.2, veg: 1.6, flower: 1.8, ripening: 1.8 }

const lightStage = (plant: PlantSim): boolean => isGrowing(plant)

export const NUTRIENT_RULES: ProblemRule[] = [
  deficiency('n_def', 'N'),
  deficiency('p_def', 'P'),
  deficiency('k_def', 'K'),
  deficiency('ca_def', 'Ca'),
  deficiency('mg_def', 'Mg'),
  deficiency('s_def', 'S'),
  deficiency('fe_def', 'Fe'),
  deficiency('zn_def', 'Zn'),
  deficiency('mn_def', 'Mn'),
  deficiency('b_def', 'B'),
  deficiency('cu_def', 'Cu'),
  deficiency('mo_def', 'Mo'),

  rule('nutrient_burn', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant)) return 0
    // dry air makes the same feed burn
    const limit = (BURN_EC[plant.stage] ?? 2.2) * plant.genome.feedDemand - (tent.env.vpd > 1.6 ? 0.3 : 0)
    const ec = plant.root.ec
    const x = ec > limit ? (ec - limit) / 0.8 : ec < limit - 0.3 ? -1 : 0
    return settle(ctx, 'nutrient_burn', x, 0.001)
  }),

  rule('n_toxicity', (ctx) => {
    const n = ctx.plant.reserves.N
    if (!isGrowing(ctx.plant)) return 0
    const x = n > 1.3 ? (n - 1.3) / 0.2 : n < 1.2 ? -1 : 0
    return settle(ctx, 'n_toxicity', x, 0.001)
  }),

  rule('ph_lockout', (ctx) => {
    const { plant } = ctx
    if (!isGrowing(plant)) return 0
    const off = phOff(plant)
    let x = off > 0 ? off / 0.5 : -1
    // a pH off by a hair only locks out when the plant already runs low on several elements
    if (off > 0 && off < 0.2) {
      const low = Object.values(plant.reserves).filter(r => r < 0.7).length
      x = low >= 2 ? x + 0.3 : 0
    }
    return settle(ctx, 'ph_lockout', x, 0.0015)
  }),

  rule('salt_buildup', (ctx) => {
    const s = ctx.plant.root.salts
    if (!isGrowing(ctx.plant)) return 0
    const x = s > 0.5 ? (s - 0.5) / 0.3 : s < 0.4 ? -1 : 0
    return settle(ctx, 'salt_buildup', x, 0.0015)
  })
]

export const ENVIRONMENT_RULES: ProblemRule[] = [
  rule('light_burn', (ctx) => {
    const { plant, tent } = ctx
    if (!lightStage(plant) || !tent.env.lightsOn) return 0
    const max = LIGHT_MAX[plant.stage] ?? 900
    const ppfd = tent.env.ppfd
    const x = ppfd > max ? (ppfd - max) / 300 : ppfd < max - 100 ? -1 : 0
    return settle(ctx, 'light_burn', x, 0.0008)
  }),

  rule('taco_leaves', (ctx) => {
    const { plant, tent } = ctx
    const env = tent.env
    if (!lightStage(plant) || !env.lightsOn) return 0
    const thr = TACO_PPFD[plant.stage] ?? 800
    const x = Math.max((env.ppfd - thr) / 250, (env.tempC - 29) / 4, (env.vpd - 1.8) / 0.5)
    const fine = env.ppfd < thr - 50 && env.tempC < 28 && env.vpd < 1.6
    return settle(ctx, 'taco_leaves', x > 0 ? x : fine ? -1 : 0, 0.004)
  }),

  rule('low_light', (ctx) => {
    const { plant, tent } = ctx
    if (!lightStage(plant) || !tent.env.lightsOn) return 0
    const min = DLI_MIN[plant.stage] ?? 15
    const d = dli(ctx)
    const x = d < min ? (min - d) / (min * 0.5) : d > min * 1.2 ? -1 : 0
    return settle(ctx, 'low_light', x, 0.002)
  }),

  rule('light_leak_stress', (ctx) => {
    const { plant, tent } = ctx
    // autoflowers ignore the light schedule
    if (plant.genome.kind !== 'photo' || !inFlower(plant) || tent.env.lightsOn) return 0
    const leak = tent.env.leak
    const x = leak > 0.02 ? leak / 0.3 : -1
    return settle(ctx, 'light_leak_stress', x, 0.0015)
  }),

  rule('overwatering', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant) && plant.stage !== 'germination') return 0
    if (plant.medium === 'hydro') return settle(ctx, 'overwatering', -1, 0.004)
    const w = plant.root.water
    const slow = (tent.env.tempC < 20 ? 1.3 : 1) * (tent.env.vpd < 0.6 ? 1.2 : 1)
    const x = w > 0.85 ? ((w - 0.85) / 0.15) * (plant.medium === 'coco' ? 0.3 : 0.6) * slow : w < 0.75 ? -1 : 0
    return settle(ctx, 'overwatering', x, 0.004)
  }, (ctx, p) => hurtRoots(ctx.plant, 0.0004 * p.severity)),

  rule('underwatering', (ctx) => {
    const { plant } = ctx
    if (!isGrowing(plant) || plant.medium === 'hydro') return settle(ctx, 'underwatering', -1, 0.02)
    const w = plant.root.water
    const x = w < 0.15 ? (0.15 - w) / 0.15 + 0.2 : w > 0.25 ? -1 : 0
    return settle(ctx, 'underwatering', x, 0.02)
  }),

  rule('root_rot', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant)) return 0
    const t = tent.env.tempC
    const weak = 1 - plant.root.health
    let x: number
    if (plant.medium === 'hydro') {
      // reservoir follows the tent; warm water holds little oxygen
      x = t > 26 ? (t - 26) / 4 + weak * 0.3 : t < 25 ? -1 : 0
    } else {
      const w = plant.root.water
      const wet = (w - 0.88) / 0.12
      const warm = clamp((t - 22) / 6)
      x = wet > 0 ? wet * (0.3 + 0.7 * warm) + weak * 0.5 * wet : w < 0.7 ? -1 : 0
      if (x >= 0 && severityOf(plant, 'overwatering') > 0.4) x += 0.3
    }
    return settle(ctx, 'root_rot', x, 0.0008)
  }, (ctx, p) => hurtRoots(ctx.plant, 0.0015 * p.severity)),

  rule('heat_stress', (ctx) => {
    const t = ctx.tent.env.tempC
    if (!isGrowing(ctx.plant)) return 0
    const x = t > 30 ? (t - 30) / 4 : t < 28.5 ? -1 : 0
    return settle(ctx, 'heat_stress', x, 0.004)
  }),

  rule('cold_stress', (ctx) => {
    const t = ctx.tent.env.tempC
    if (!isGrowing(ctx.plant)) return 0
    const x = t < 16 ? (16 - t) / 5 : t > 18 ? -1 : 0
    return settle(ctx, 'cold_stress', x, 0.004)
  }),

  rule('high_humidity', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant)) return 0
    const max = lateFlower(plant) ? 55 : RH_MAX[plant.stage] ?? 70
    const rh = tent.env.rh
    const x = rh > max ? (rh - max) / 15 : rh < max - 5 ? -1 : 0
    return settle(ctx, 'high_humidity', x, 0.006)
  }),

  rule('low_humidity', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant)) return 0
    const max = VPD_MAX[plant.stage] ?? 1.6
    const { vpd, rh } = tent.env
    const x = vpd > max && rh < 50 ? (vpd - max) / 0.6 : vpd < max - 0.2 ? -1 : 0
    return settle(ctx, 'low_humidity', x, 0.004)
  }),

  rule('wind_burn', (ctx) => {
    const { plant, tent } = ctx
    if (!isGrowing(plant)) return 0
    const max = plant.stage === 'seedling' ? 0.6 : plant.heightCm < 25 ? 0.7 : 0.85
    const a = tent.env.airflow
    const x = a > max ? (a - max) / 0.15 : a < max - 0.1 ? -1 : 0
    return settle(ctx, 'wind_burn', x, 0.002)
  }),

  rule('hermaphrodite', (ctx) => {
    const { plant, tent } = ctx
    if (!inFlower(plant)) return 0
    const leak = Math.max(severityOf(plant, 'light_leak_stress') * 1.5, !tent.env.lightsOn && plant.genome.kind === 'photo' ? tent.env.leak : 0)
    const heat = (tent.env.tempC - 30) / 4
    const strain = plant.stress - 0.5
    const overripe = plant.ripeness >= 0.98 ? 0.4 : 0
    const score = Math.max(leak, heat, strain, overripe)
    let x = score * (0.3 + plant.genome.hermRisk * 1.4) - 0.25
    if (plant.hermed) x = Math.max(x, 0.5)
    return settle(ctx, 'hermaphrodite', x > 0 ? x : score <= 0 ? -1 : 0, 0.002)
  }),

  rule('transplant_shock', (ctx) => {
    const { plant, tent } = ctx
    const p = findProblem(plant, 'transplant_shock')
    // seeded by the engine on transplant; this only shapes how hard it hits
    if (!p || !isGrowing(plant)) return 0
    const age = ctx.nowH - p.onsetH
    const soggy = plant.root.water > 0.9
    const bright = tent.env.lightsOn && tent.env.ppfd > (LIGHT_MAX[plant.stage] ?? 900) * 0.8
    if (age < 72 || (age < 240 && (soggy || bright))) {
      return settle(ctx, 'transplant_shock', 0.5 + (soggy ? 0.3 : 0) + (bright ? 0.3 : 0) + (1 - plant.root.health), 0.004)
    }
    return settle(ctx, 'transplant_shock', -1, 0.004)
  }),

  rule('foxtailing', (ctx) => {
    const { plant, tent } = ctx
    if (!lateFlower(plant)) return 0
    const env = tent.env
    const x = Math.max((env.tempC - 29) / 4, env.lightsOn ? (env.ppfd - 1050) / 300 : -1)
    const fine = env.tempC < 28 && (!env.lightsOn || env.ppfd < 1000)
    return settle(ctx, 'foxtailing', x > 0 ? x : fine ? -1 : 0, 0.0008)
  })
]
