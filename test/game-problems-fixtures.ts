import { PROBLEM_RULES } from '../shared/game/content/problems'
import { NUTRIENTS } from '../shared/game/types'
import type { ActiveProblem, Env, Genome, Nutrient, PlantSim, ProblemCtx, ProblemId, ProblemRule, Root, Tent } from '../shared/game/types'

export const ALL_IDS: ProblemId[] = [
  'n_def', 'p_def', 'k_def', 'ca_def', 'mg_def', 's_def', 'fe_def', 'zn_def', 'mn_def', 'b_def', 'cu_def', 'mo_def',
  'nutrient_burn', 'n_toxicity', 'ph_lockout', 'salt_buildup',
  'light_burn', 'taco_leaves', 'low_light', 'light_leak_stress', 'overwatering', 'underwatering', 'root_rot',
  'heat_stress', 'cold_stress', 'high_humidity', 'low_humidity', 'wind_burn', 'hermaphrodite', 'transplant_shock', 'foxtailing',
  'spider_mites', 'thrips', 'aphids', 'fungus_gnats', 'whiteflies', 'caterpillars', 'mealybugs', 'leaf_miners',
  'russet_broad_mites', 'root_aphids', 'powdery_mildew', 'botrytis', 'septoria', 'fusarium_wilt', 'hlvd'
]

export const PESTS: ProblemId[] = [
  'spider_mites', 'thrips', 'aphids', 'fungus_gnats', 'whiteflies', 'caterpillars', 'mealybugs', 'leaf_miners', 'russet_broad_mites', 'root_aphids'
]

export const NOW_H = 2000

export const GENOME: Genome = {
  kind: 'photo', autoLifeDays: 0, flowerDays: 56, vigor: 1, stretch: 1.5, yieldPotential: 100, terpenes: 0.6, potency: 0.6,
  moldResistance: 0.6, pestResistance: 0.5, feedDemand: 1, hermRisk: 0.15, leafShape: 0.5, purple: 0
}

const fullReserves = (): Record<Nutrient, number> => Object.fromEntries(NUTRIENTS.map(n => [n, 1])) as Record<Nutrient, number>

export interface Scene { plant: PlantSim, tent: Tent }

function scene(env: Partial<Env>, root: Partial<Root>, plant: Partial<PlantSim>): Scene {
  const tent: Tent = {
    id: 't1', tentItem: 'tent-60', light: 'light', gear: [], climate: { tempC: 25, rh: 60 }, lightHours: 18, dim: 1, plantIds: ['p1'],
    env: { tempC: 25, rh: 60, vpd: 1.27, ppfd: 600, lightsOn: true, lightHours: 18, airflow: 0.5, leak: 0, ...env }
  }
  const p: PlantSim = {
    id: 'p1', strainId: 's', genome: { ...GENOME }, seed: 1, tentId: 't1', sownAtH: NOW_H - 800, stage: 'veg', stageStartH: NOW_H - 500,
    medium: 'soil', potL: 11, root: { water: 0.55, ph: 6.5, ec: 1.4, salts: 0.1, health: 1, ...root }, reserves: fullReserves(),
    biomass: 50, budMass: 0, heightCm: 40, nodes: 6, training: { topped: 0, lst: false }, health: 1, damage: 0, stress: 0,
    problems: [], ripeness: 0, hermed: false, dead: false, ...plant
  }
  return { plant: p, tent }
}

export const IDEAL = {
  vegDay: () => scene({}, {}, {}),
  vegNight: () => scene({ lightsOn: false, ppfd: 0, tempC: 21, rh: 60, vpd: 1.0 }, {}, {}),
  seedling: () => scene({ ppfd: 250, rh: 70, vpd: 0.95, airflow: 0.3 }, { ec: 0.6 }, { stage: 'seedling', heightCm: 8, biomass: 3, nodes: 2 }),
  flowerDay: () => scene({ rh: 50, vpd: 1.58, ppfd: 850, lightHours: 12 }, { ec: 1.8, ph: 6.0 },
    { medium: 'coco', stage: 'flower', stageStartH: NOW_H - 720, flipAtH: NOW_H - 720, ripeness: 0.5, budMass: 40, biomass: 150 }),
  flowerNight: () => scene({ lightsOn: false, ppfd: 0, tempC: 21, rh: 55, vpd: 1.12, lightHours: 12 }, { ec: 1.8 },
    { stage: 'flower', stageStartH: NOW_H - 720, flipAtH: NOW_H - 720, ripeness: 0.5, budMass: 40, biomass: 150 }),
  ripening: () => scene({ rh: 45, tempC: 23, vpd: 1.55, ppfd: 800, lightHours: 12 }, { ec: 1.2 },
    { stage: 'ripening', stageStartH: NOW_H - 200, flipAtH: NOW_H - 1300, ripeness: 0.9, budMass: 90, biomass: 160, reserves: { ...fullReserves(), N: 0.5 } }),
  hydroVeg: () => scene({ tempC: 24, vpd: 1.2 }, { water: 1, ph: 5.9 }, { medium: 'hydro' })
}

export type IdealName = keyof typeof IDEAL

export const ctxOf = (s: Scene, rand: () => number = () => 0.5, nowH = NOW_H): ProblemCtx => ({ plant: s.plant, tent: s.tent, nowH, rand })

export const ruleOf = (id: ProblemId): ProblemRule => {
  const r = PROBLEM_RULES.find(x => x.id === id)
  if (!r) throw new Error(`no rule ${id}`)
  return r
}

export const activate = (s: Scene, id: ProblemId, over: Partial<ActiveProblem> = {}): ActiveProblem => {
  const p: ActiveProblem = { id, severity: 0.001, onsetH: NOW_H, ...over }
  s.plant.problems.push(p)
  return p
}

export interface BadCase {
  /** ideal scene to start from; also used to check healing */
  base: IdealName
  set: (s: Scene) => void
  /** problems that only exist once seeded (pests, transplant) */
  seed?: Partial<ActiveProblem>
  rand?: () => number
}

interface Mod { env?: Partial<Env>, root?: Partial<Root>, plant?: Partial<PlantSim>, genome?: Partial<Genome>, reserves?: Partial<Record<Nutrient, number>> }

const mod = (m: Mod) => (s: Scene): void => {
  Object.assign(s.tent.env, m.env)
  Object.assign(s.plant.root, m.root)
  Object.assign(s.plant, m.plant)
  Object.assign(s.plant.genome, m.genome)
  Object.assign(s.plant.reserves, m.reserves)
}

const def = (el: Nutrient): BadCase => ({ base: 'vegDay', set: mod({ reserves: { [el]: 0.3 } }) })
const pestCase = (m: Mod = {}): BadCase => ({ base: 'vegDay', set: mod(m), seed: { load: 0.3 } })

export const BAD: Record<ProblemId, BadCase> = {
  n_def: def('N'), p_def: def('P'), k_def: def('K'), ca_def: def('Ca'), mg_def: def('Mg'), s_def: def('S'),
  fe_def: def('Fe'), zn_def: def('Zn'), mn_def: def('Mn'), b_def: def('B'), cu_def: def('Cu'), mo_def: def('Mo'),
  nutrient_burn: { base: 'vegDay', set: mod({ root: { ec: 3.5 } }) },
  n_toxicity: { base: 'vegDay', set: mod({ reserves: { N: 1.5 } }) },
  ph_lockout: { base: 'vegDay', set: mod({ root: { ph: 7.8 } }) },
  salt_buildup: { base: 'vegDay', set: mod({ root: { salts: 0.9 } }) },
  light_burn: { base: 'vegDay', set: mod({ env: { ppfd: 1300 } }) },
  taco_leaves: { base: 'vegDay', set: mod({ env: { tempC: 32 } }) },
  low_light: { base: 'vegDay', set: mod({ env: { ppfd: 150 } }) },
  light_leak_stress: { base: 'flowerNight', set: mod({ env: { leak: 0.3 } }) },
  overwatering: { base: 'vegDay', set: mod({ root: { water: 0.98 }, env: { tempC: 19 } }) },
  underwatering: { base: 'vegDay', set: mod({ root: { water: 0.05 } }) },
  root_rot: { base: 'vegDay', set: mod({ root: { water: 0.97, health: 0.7 }, env: { tempC: 27 } }) },
  heat_stress: { base: 'vegDay', set: mod({ env: { tempC: 34 } }) },
  cold_stress: { base: 'vegNight', set: mod({ env: { tempC: 12 } }) },
  high_humidity: { base: 'vegDay', set: mod({ env: { rh: 85, vpd: 0.5 } }) },
  low_humidity: { base: 'vegDay', set: mod({ env: { rh: 30, vpd: 2.3 } }) },
  wind_burn: { base: 'vegDay', set: mod({ env: { airflow: 1 } }) },
  hermaphrodite: { base: 'flowerDay', set: mod({ env: { tempC: 34 }, genome: { hermRisk: 0.4 } }) },
  transplant_shock: { base: 'vegDay', set: mod({ root: { water: 0.95 } }), seed: {} },
  foxtailing: { base: 'flowerDay', set: mod({ plant: { ripeness: 0.6 }, env: { tempC: 32 } }) },
  spider_mites: pestCase({ env: { tempC: 30, rh: 35 } }),
  thrips: pestCase({ env: { tempC: 28 } }),
  aphids: pestCase({ reserves: { N: 1.2 } }),
  fungus_gnats: pestCase({ root: { water: 0.9 } }),
  whiteflies: pestCase({ env: { tempC: 28, airflow: 0.1 } }),
  caterpillars: pestCase(),
  mealybugs: pestCase({ env: { tempC: 28, airflow: 0.1 } }),
  leaf_miners: pestCase(),
  russet_broad_mites: pestCase({ env: { tempC: 28 } }),
  root_aphids: pestCase(),
  powdery_mildew: { base: 'vegDay', set: mod({ env: { rh: 75, airflow: 0.1 }, plant: { biomass: 200 } }) },
  botrytis: { base: 'flowerDay', set: mod({ env: { rh: 70, airflow: 0.2 }, plant: { ripeness: 0.6, budMass: 80 } }) },
  septoria: { base: 'vegDay', set: mod({ env: { rh: 85, airflow: 0.1 } }) },
  fusarium_wilt: { base: 'vegDay', set: mod({ env: { tempC: 29 }, root: { water: 0.9, health: 0.6 } }) },
  hlvd: { base: 'vegDay', set: () => {}, rand: () => 0 }
}

export function badScene(id: ProblemId): Scene {
  const c = BAD[id]
  const s = IDEAL[c.base]()
  c.set(s)
  return s
}
