import { NUTRIENTS } from '../types.ts'
import type { GameState, Genome, Medium, PlantSim, ProblemCtx, Stage, Tent } from '../types.ts'
import { pushEvent } from './events.ts'
import { lightResponse, maxTentPlantHeight } from './light.ts'
import { NUTRIENT_STEP_H, nutrientFit, stepNutrients, zeroPool } from './nutrients.ts'
import type { Pool } from './nutrients.ts'
import { DEFAULT_PHASES, stepProblems } from './problems.ts'
import { ruleDef } from './content.ts'
import type { TentSpec } from './spec.ts'
import { THIRSTY, WATER_SLOW, capacityL, effVol } from './water.ts'
import { realH } from './time.ts'

export const GERM_H = 48
export const SEEDLING_END_D = 14
/** photos cannot start flowering before this age (days) + the transition */
export const JUVENILE_D = 21
export const TRANSITION_D = 10
const AUTO_FLOWER_FRAC = 0.32
/** g dry biomass per mol of intercepted photons */
const EFF = 0.6
/** genome.yieldPotential (g) that the base growth model reaches */
const YP_REF = 150
/** critical hours before a plant dies (~16 real hours) */
export const DEATH_H = Math.round(realH(16.5))
/** past this flowering progress buds start to lose weight and terpenes */
export const OVERRIPE_FP = 1.3

export function newPlant(id: string, strainId: string, genome: Genome, tentId: string, medium: Medium, potL: number, seed: number, nowH: number): PlantSim {
  const p: PlantSim = {
    id, strainId, genome: { ...genome }, seed, tentId,
    sownAtH: nowH, stage: 'germination', stageStartH: nowH,
    medium, potL,
    root: { water: 0.7, ph: 6.5, ec: 0.3, salts: 0, health: 1, pool: zeroPool() },
    reserves: Object.fromEntries(NUTRIENTS.map(n => [n, 1])) as Record<typeof NUTRIENTS[number], number>,
    biomass: 0.02, budMass: 0, heightCm: 2, nodes: 0,
    training: { topped: 0, lst: false },
    health: 1, damage: 0, stress: 0, problems: [], ripeness: 0, hermed: false, dead: false,
    lastH: nowH, critH: 0, ideal: { biomass: 0.02, bud: 0 }, acc: { flowerH: 0, density: 0, terp: 0 }
  }
  freshMedium(p)
  return p
}

/** Fresh, pre-moistened medium: soil carries a few weeks of food, coco a little, hydro only tap water. */
export function freshMedium(p: PlantSim): void {
  const root = p.root
  const pool = zeroPool()
  if (p.medium === 'soil') {
    root.ph = 6.5
    root.ec = 0.9
    for (const k of NUTRIENTS) pool[k] = 0.6
  } else if (p.medium === 'coco') {
    root.ph = 6.1
    root.ec = 0.5
    for (const k of NUTRIENTS) pool[k] = 0.25
    pool.K = 0.5
  } else {
    root.ph = 5.8
    root.ec = 0.3
    pool.Ca = 0.25
    pool.Mg = 0.15
  }
  root.water = p.medium === 'hydro' ? 1 : 0.7
  root.salts = 0
  const ev = effVol(p, root.water)
  for (const k of NUTRIENTS) pool[k] *= ev
  root.pool = pool
}

export function flowerClock(p: PlantSim): { startH: number, lenH: number } | null {
  const g = p.genome
  if (g.kind === 'auto') {
    const fd = g.flowerDays > 0 && g.flowerDays < g.autoLifeDays - 14 ? g.autoLifeDays - g.flowerDays : Math.round(g.autoLifeDays * AUTO_FLOWER_FRAC)
    return { startH: p.sownAtH + fd * 24, lenH: Math.max(24, (g.autoLifeDays - fd) * 24) }
  }
  if (p.flipAtH === undefined) return null
  return { startH: p.flipAtH + TRANSITION_D * 24, lenH: Math.max(24, g.flowerDays * 24) }
}

/** Fraction of the flowering period done at hour h; <0 before flowering, null when not scheduled. */
export function flowerProgress(p: PlantSim, h: number): number | null {
  const c = flowerClock(p)
  return c ? (h - c.startH) / c.lenH : null
}

export const leafArea = (biomass: number, bud: number): number => 0.03 * Math.max(0, biomass - bud) * 0.6

/** Light-intercepting canopy area (m²) of a plant given the floor area it has. */
export function interceptArea(biomass: number, bud: number, areaPer: number, bonus = 1): number {
  return areaPer * (1 - Math.exp((-1.6 * leafArea(biomass, bud) * bonus) / areaPer))
}

export const areaPerPlant = (spec: TentSpec, plants: number): number => Math.max(0.09, spec.areaM2 / Math.max(1, plants))

/** Physiological transpiration in real litres per hour; scales with intercepted canopy, VPD and light. */
export function transpiration(p: PlantSim, vpd: number, lightsOn: boolean, areaPer: number, ia = interceptArea(p.biomass, p.budMass, areaPer)): number {
  if (p.dead || p.stage === 'harvested' || p.stage === 'germination') return 0
  const vpdF = Math.min(2, Math.max(0.25, vpd / 1.1))
  const waterF = p.medium === 'hydro' ? 1 : Math.min(1, p.root.water / THIRSTY)
  return 0.19 * ia * (lightsOn ? 1 : 0.1) * vpdF * waterF
}

/** Pot litres lost per game hour (plant + surface evaporation). */
export function potLossLph(p: PlantSim, vpd: number, lightsOn: boolean, areaPer: number, ia?: number): number {
  if (p.medium === 'hydro' || p.dead) return 0
  const evap = 0.0012 * Math.pow(p.potL, 0.67) * p.root.water
  return (transpiration(p, vpd, lightsOn, areaPer, ia) + evap) / WATER_SLOW
}

const VPD_RANGE: Record<Stage, [number, number]> = {
  germination: [0.4, 0.9], seedling: [0.4, 0.9], veg: [0.8, 1.2], flower: [1.0, 1.5], ripening: [1.1, 1.6], harvested: [1, 1.5], dead: [1, 1.5]
}

export function vpdFit(stage: Stage, v: number): number {
  const [lo, hi] = VPD_RANGE[stage]
  const d = v < lo ? lo - v : v > hi ? v - hi : 0
  return Math.max(0.3, 1 - d * 0.7)
}

export function tempFit(t: number): number {
  const d = t < 22 ? 22 - t : t > 28 ? t - 28 : 0
  return Math.max(0.1, 1 - d * 0.07)
}

export function waterFit(p: PlantSim): number {
  const w = p.root.water
  if (p.medium !== 'hydro' && w > 0.95) return 0.9
  if (w >= THIRSTY) return 1
  if (w >= 0.15) return 0.6 + ((w - 0.15) / 0.15) * 0.4
  return (w / 0.15) * 0.6
}

const potFactor = (b: number, potL: number): number => {
  const x = b / (potL * 25)
  return 1 / (1 + x * x)
}

function budShare(fp: number): number {
  if (fp < 0.05) return 0
  return Math.min(0.6, (fp - 0.05) * 2)
}

const senescence = (fp: number): number => fp > 0.9 ? Math.max(0, 1 - (fp - 0.9) * 4) : 1

/** d/dB of height potential 9·vigor·B^0.45 times the veg gain */
function heightGain(g: Genome, vegB: number, veg: number): number {
  return 9 * g.vigor * 0.45 * Math.pow(Math.max(0.01, vegB + veg / 2), -0.55) * veg
}

function setStage(state: GameState, p: PlantSim, stage: Stage, tent: Tent): void {
  if (p.stage === stage) return
  p.stage = stage
  p.stageStartH = state.nowH
  const text = STAGE_TEXT[stage]
  if (text) pushEvent(state, 'stage', text, p.id, tent.id)
}

const STAGE_TEXT: Partial<Record<Stage, { en: string, cs: string }>> = {
  seedling: { en: 'The seed sprouted.', cs: 'Semínko vyklíčilo.' },
  veg: { en: 'Vegetative growth started.', cs: 'Začal vegetativní růst.' },
  flower: { en: 'Flowering started.', cs: 'Začalo kvetení.' },
  ripening: { en: 'Buds are ripening.', cs: 'Palice dozrávají.' }
}

export interface StepEnv {
  spec: TentSpec
  /** canopy PPFD for this plant with lights on */
  ppfd: number
  plantsInTent: number
}

export function stepPlant(state: GameState, p: PlantSim, tent: Tent, se: StepEnv, ctx: ProblemCtx, dt: number): void {
  const now = state.nowH
  const env = tent.env
  const g = p.genome
  const age = now - p.sownAtH

  if (g.kind === 'photo' && p.stage !== 'flower' && p.stage !== 'ripening') {
    if (p.flipAtH === undefined && tent.lightHours <= 13 && p.stage !== 'germination') {
      p.flipAtH = Math.max(now, p.sownAtH + JUVENILE_D * 24)
    } else if (p.flipAtH !== undefined && tent.lightHours > 13) {
      delete p.flipAtH
    }
  }
  const clock = flowerClock(p)
  const fp = clock ? (now - clock.startH) / clock.lenH : -1
  if (clock && fp >= 0) setStage(state, p, fp >= 0.85 ? 'ripening' : 'flower', tent)
  else if (age >= SEEDLING_END_D * 24) setStage(state, p, 'veg', tent)
  else if (age >= GERM_H) setStage(state, p, 'seedling', tent)
  if (p.stage === 'germination') {
    p.lastH = now + dt
    return
  }

  // water and nutrients
  const root = p.root
  const areaPer = areaPerPlant(se.spec, se.plantsInTent)
  const ia = interceptArea(p.biomass, p.budMass, areaPer)
  const loss = potLossLph(p, env.vpd, env.lightsOn, areaPer, ia) * dt
  const cap = capacityL(p)
  const ev0 = effVol(p, root.water)
  if (p.medium !== 'hydro') root.water = Math.max(0, root.water - loss / cap)
  const ev1 = effVol(p, root.water)
  root.ec *= ev0 / ev1
  if (now % NUTRIENT_STEP_H === 0) stepNutrients(p, loss * NUTRIENT_STEP_H, ev1, env.tempC, age, NUTRIENT_STEP_H)
  const ecHigh = p.medium === 'soil' ? 2.0 : 2.6
  if (root.ec > ecHigh) root.salts = Math.min(1, root.salts + (root.ec - ecHigh) * 0.002 * dt)
  const activity = env.lightsOn ? 1 : 0.3
  if (p.medium === 'soil') root.ph += (6.5 - root.ph) * 0.00025 * dt
  else if (p.medium === 'coco') root.ph = Math.min(6.9, root.ph + (0.4 * loss) / cap)
  else root.ph = Math.min(7.2, root.ph + 0.004 * activity * Math.min(1, p.biomass / 30) * dt)

  // root zone health
  const w = root.water
  if (p.medium !== 'hydro' && w < 0.08) root.health -= 0.002 * dt
  else if (p.medium !== 'hydro' && w > 0.97) root.health -= 0.0004 * dt
  else if (p.medium === 'hydro' && env.tempC > 26) root.health -= 0.0005 * (env.tempC - 26) * dt
  else root.health += 0.002 * (1 - root.health) * dt
  if (root.ec > 3.5) root.health -= 0.001 * (root.ec - 3.5) * dt
  root.health = Math.min(1, Math.max(0, root.health))

  // growth
  const vf = vpdFit(p.stage, env.vpd)
  const tf = tempFit(env.tempC)
  const wf = waterFit(p)
  const pf = potFactor(p.biomass, p.potL)
  const sen = fp >= 0 ? senescence(fp) : 1
  const share = fp >= 0 ? budShare(fp) : 0
  const gy = g.yieldPotential / YP_REF
  const t = p.training
  const trainBonus = Math.min(1.2, 1 + 0.05 * t.topped + (t.lst ? 0.08 : 0))
  if (env.lightsOn && se.ppfd > 0) {
    const nf = nutrientFit(p)
    const molH = lightResponse(se.ppfd) * 0.0036
    const intercept = trainBonus === 1 ? ia : interceptArea(p.biomass, p.budMass, areaPer, trainBonus)
    const mods = vf * tf * wf * nf * (0.3 + 0.7 * root.health) * (1 - 0.7 * p.stress) * (0.4 + 0.6 * p.health) * pf * (env.airflow < 0.1 ? 0.92 : 1)
    const gain = EFF * molH * intercept * mods * sen * dt
    const bud = gain * share * gy
    const veg = gain * (1 - share)
    const vegB = p.biomass - p.budMass
    const stretching = (fp < 0 && p.flipAtH !== undefined && now >= p.flipAtH) || (fp >= 0 && fp < 0.4)
    const dh = veg <= 0 ? 0 : heightGain(g, vegB, veg) * Math.pow(0.8, t.topped) * (t.lst ? 0.8 : 1) * (stretching ? g.stretch : 1)
    p.biomass += veg + bud
    p.budMass += bud
    p.heightCm = Math.min(maxTentPlantHeight(se.spec), p.heightCm + dh)

    // perfect-care twin: same climate, full dimmer (capped), perfect water, food and health
    const ideal = p.ideal ??= { biomass: p.biomass, bud: p.budMass }
    const ppfdI = Math.min(900, se.ppfd / Math.max(0.2, tent.dim))
    const interI = interceptArea(ideal.biomass, ideal.bud, areaPer)
    const gainI = EFF * lightResponse(ppfdI) * 0.0036 * interI * vf * tf * potFactor(ideal.biomass, p.potL) * sen * dt
    ideal.bud += gainI * share * gy
    ideal.biomass += gainI * (1 - share) + gainI * share * gy
  }
  const nodeLen = 3.5 + 2.5 * (1 - g.leafShape)
  p.nodes = Math.max(p.nodes, Math.floor(p.heightCm / nodeLen))

  // problems
  const pr = stepProblems(state, p, tent, ctx, dt)
  const herm = p.problems.find(x => x.id === 'hermaphrodite')
  if (herm && !p.hermed && fp >= 0 && herm.severity >= (ruleDef('hermaphrodite')?.phases ?? DEFAULT_PHASES)[1]) {
    p.hermed = true
    pushEvent(state, 'herm', { en: 'Pollen sacs (bananas) showed up between the buds.', cs: 'Mezi palicemi se objevily pylové váčky (banány).' }, p.id, tent.id)
  }

  // health, stress, damage, death
  const waterStress = p.medium !== 'hydro' && w < 0.15 ? (0.15 - w) / 0.15 : 0
  const harsh = env.tempC > 35 ? (env.tempC - 35) * 0.1 : env.tempC < 10 ? (10 - env.tempC) * 0.1 : 0
  const hTarget = Math.max(0, 1 - Math.min(1, pr.sum * 0.55 + waterStress * 0.8 + harsh))
  p.health += (hTarget - p.health) * (hTarget < p.health ? 0.03 : 0.015) * dt
  const reveg = fp >= 0 && g.kind === 'photo' && tent.lightHours > 13 ? 0.3 : 0
  const sTarget = Math.min(1, pr.sum * 0.6 + waterStress * 0.5 + (1 - tf) * 0.3 + reveg)
  p.stress += (sTarget - p.stress) * (sTarget > p.stress ? 0.05 : 0.02) * dt
  if (pr.severe > 0) p.damage += 0.0012 * (1 + pr.severe * 4) * dt
  if (p.health < 0.2) p.damage += 0.001 * dt
  p.damage = Math.min(1, p.damage)
  if (p.health < 0.3) p.critH = (p.critH ?? 0) + dt
  else p.critH = Math.max(0, (p.critH ?? 0) - 2 * dt)
  if ((p.critH ?? 0) >= DEATH_H) {
    p.dead = true
    p.stage = 'dead'
    p.stageStartH = now
    pushEvent(state, 'dead', { en: 'A plant died after a long time in bad shape.', cs: 'Rostlina po dlouhé době ve špatném stavu uhynula.' }, p.id, tent.id)
    p.lastH = now + dt
    return
  }

  // flower quality and maturity
  if (fp >= 0) {
    const prevRipe = p.ripeness
    p.ripeness = Math.min(1, Math.max(0, (fp - 0.3) / 0.7))
    if (fp > OVERRIPE_FP) p.budMass *= 1 - 0.0004 * dt
    if (env.lightsOn) {
      const acc = p.acc ??= { flowerH: 0, density: 0, terp: 0 }
      const pk = Math.min(1, Math.min((p.reserves as Pool).P, (p.reserves as Pool).K) / 0.85)
      acc.flowerH += dt
      acc.density += (0.45 * Math.min(1, se.ppfd / 650) + 0.25 * vf + 0.15 * pk + 0.15 * (1 - p.stress)) * dt
      const overripe = fp > OVERRIPE_FP ? Math.min(0.5, (fp - OVERRIPE_FP) * 2) : 0
      acc.terp += Math.min(1, Math.max(0, 1 - Math.max(0, env.tempC - 27) * 0.08 - Math.max(0, se.ppfd - 1100) / 1000 - p.stress * 0.3 - overripe)) * dt
    }
    if (prevRipe < 0.93 && p.ripeness >= 0.93) {
      pushEvent(state, 'ripe', { en: 'Trichomes are turning milky: the harvest window is open.', cs: 'Trichomy mléčně zakalují: okno pro sklizeň je otevřené.' }, p.id, tent.id)
    }
  }
  p.lastH = now + dt
}
