// Shadow Grow: shared contract between sim, content, renderer, UI and server.
// Imports inside shared/game use explicit .ts extensions (Deno edge functions import this code too).

export type L10n = { en: string, cs: string }

/** Sim time unit is the game hour. 1 game day = GAME_DAY_REAL_MIN real minutes. */
export const GAME_DAY_REAL_MIN = 20
export const REAL_MS_PER_GAME_HOUR = (GAME_DAY_REAL_MIN * 60_000) / 24
/** One sim step. */
export const STEP_H = 1

export type Medium = 'soil' | 'coco' | 'hydro'
export type Photoperiod = 'auto' | 'photo'
export type Stage = 'germination' | 'seedling' | 'veg' | 'flower' | 'ripening' | 'harvested' | 'dead'
export type Nutrient = 'N' | 'P' | 'K' | 'Ca' | 'Mg' | 'S' | 'Fe' | 'Zn' | 'Mn' | 'B' | 'Cu' | 'Mo'
export const NUTRIENTS: Nutrient[] = ['N', 'P', 'K', 'Ca', 'Mg', 'S', 'Fe', 'Zn', 'Mn', 'B', 'Cu', 'Mo']

/** Ids equal problem ids of the in-app atlas (app/utils/problems). */
export type ProblemId
  = | 'n_def' | 'p_def' | 'k_def' | 'ca_def' | 'mg_def' | 's_def' | 'fe_def' | 'zn_def' | 'mn_def' | 'b_def' | 'cu_def' | 'mo_def'
    | 'nutrient_burn' | 'n_toxicity' | 'ph_lockout' | 'salt_buildup'
    | 'light_burn' | 'taco_leaves' | 'low_light' | 'light_leak_stress' | 'overwatering' | 'underwatering' | 'root_rot'
    | 'heat_stress' | 'cold_stress' | 'high_humidity' | 'low_humidity' | 'wind_burn' | 'hermaphrodite' | 'transplant_shock' | 'foxtailing'
    | 'spider_mites' | 'thrips' | 'aphids' | 'fungus_gnats' | 'whiteflies' | 'caterpillars' | 'mealybugs' | 'leaf_miners'
    | 'russet_broad_mites' | 'root_aphids' | 'powdery_mildew' | 'botrytis' | 'septoria' | 'fusarium_wilt' | 'hlvd'

// ---------- genetics & catalogue ----------

export interface Genome {
  kind: Photoperiod
  /** autos: total life days; photos: ignored */
  autoLifeDays: number
  /** photo flowering length in game days */
  flowerDays: number
  /** height multiplier, 0.6..1.6 */
  vigor: number
  /** flower stretch multiplier, 1..2.5 */
  stretch: number
  /** dry yield potential per plant in grams under ideal conditions */
  yieldPotential: number
  /** 0..1 */
  terpenes: number
  /** 0..1 */
  potency: number
  /** 0..1, higher = more resistant */
  moldResistance: number
  pestResistance: number
  /** 0.6..1.4 nutrient appetite */
  feedDemand: number
  /** 0..1 chance modifier for herming under stress */
  hermRisk: number
  /** leaf shape: 0 sativa (thin, 9-11 fingers) .. 1 indica (broad, 5-7 fingers) */
  leafShape: number
  /** 0..1 purple expression late flower */
  purple: number
}

export interface StrainDef {
  id: string
  name: string
  blurb: L10n
  genome: Genome
  price: number
  unlockLevel: number
}

export type EquipmentSlot = 'tent' | 'light' | 'exhaust' | 'fan' | 'dehumidifier' | 'humidifier' | 'heater' | 'ac' | 'meter' | 'irrigation' | 'pot'

export interface EquipmentDef {
  id: string
  slot: EquipmentSlot
  name: L10n
  blurb: L10n
  price: number
  unlockLevel: number
  /** free-form numbers the sim reads, e.g. { watts: 240, ppfdAt30: 900 } or { sizeCm: 80, slots: 4 } */
  stats: Record<string, number>
}

export type ProductKind = 'base' | 'bloom' | 'calmag' | 'micro' | 'silica' | 'ph-down' | 'ph-up' | 'enzyme'
export interface ProductDef {
  id: string
  kind: ProductKind
  name: L10n
  price: number
  /** nutrient contribution per ml/L at 1.0 strength */
  npk: Partial<Record<Nutrient, number>>
  /** EC added per ml/L */
  ecPerMl: number
  unlockLevel: number
}

export interface TreatmentDef {
  id: string
  name: L10n
  blurb: L10n
  price: number
  unlockLevel: number
  /** problems this treatment really helps against; anything else wastes it (or hurts, see sim) */
  helps: ProblemId[]
}

// ---------- sim state ----------

export interface ClimateTarget {
  tempC: number
  rh: number
}

export interface Env {
  tempC: number
  rh: number
  /** kPa, derived */
  vpd: number
  /** at canopy, µmol/m²/s, while lights on */
  ppfd: number
  lightsOn: boolean
  /** hours of light per day, e.g. 18 or 12 */
  lightHours: number
  /** 0..1 air movement */
  airflow: number
  /** light leak during dark period (0 none) */
  leak: number
}

export interface Root {
  /** fraction of pot water capacity 0..1 */
  water: number
  ph: number
  /** mS/cm in root zone */
  ec: number
  /** accumulated salts 0..1 */
  salts: number
  /** root health 0..1 */
  health: number
  /** sim: nutrient units in the root zone (1 unit per litre of effective volume = full-strength feed) */
  pool?: Record<Nutrient, number>
}

export type ProblemPhase = 'hidden' | 'subtle' | 'clear' | 'severe'

export interface ActiveProblem {
  id: ProblemId
  /** 0..1 */
  severity: number
  onsetH: number
  /** for pests/disease: population/spread 0..1 */
  load?: number
  /** treatment applied and when */
  treatedWith?: string
  treatedAtH?: number
  /** player diagnosed it correctly (bonus applied once) */
  diagnosed?: boolean
}

export interface Training {
  topped: number
  lst: boolean
  defoliatedAtH?: number
}

export interface PlantSim {
  id: string
  strainId: string
  genome: Genome
  /** custom name for bred strains */
  label?: string
  seed: number
  tentId: string
  sownAtH: number
  stage: Stage
  stageStartH: number
  /** photos only: when the tent flipped to 12/12 */
  flipAtH?: number
  medium: Medium
  potL: number
  root: Root
  /** 0..1.5, 1 = ideal saturation */
  reserves: Record<Nutrient, number>
  /** grams dry-equivalent */
  biomass: number
  budMass: number
  heightCm: number
  nodes: number
  training: Training
  /** current vitality 0..1 */
  health: number
  /** permanent damage 0..1, reduces yield and quality */
  damage: number
  stress: number
  problems: ActiveProblem[]
  /** 0..1 maturity in flower: drives pistils and trichomes */
  ripeness: number
  hermed: boolean
  dead: boolean
  /** sim: game hour of the last step applied to this plant */
  lastH?: number
  /** sim: game hours spent in a critical state (drives death) */
  critH?: number
  /** sim: the same plant grown with perfect care in this tent (yield potential) */
  ideal?: { biomass: number, bud: number }
  /** sim: flower-period quality accumulators */
  acc?: { flowerH: number, density: number, terp: number }
}

export interface Tent {
  id: string
  /** equipment id of slot 'tent' */
  tentItem: string
  light: string | null
  gear: string[]
  env: Env
  climate: ClimateTarget
  /** 18 for veg, 12 after flip; autos may run 18-20 */
  lightHours: number
  /** light dimmer 0.2..1 */
  dim: number
  plantIds: string[]
  /** last recipe used by water; auto-irrigation reuses it */
  lastFeed?: { ph: number, feed: FeedDose[] }
}

export interface DryBatch {
  id: string
  plantId: string
  strainId: string
  startedAtH: number
  wetG: number
  /** 0..1 moisture */
  moisture: number
  tempC: number
  rh: number
  terpeneLoss: number
  moldRisk: number
  done: boolean
}

export interface CureJar {
  id: string
  plantId: string
  startedAtH: number
  dryG: number
  jarRh: number
  lastBurpH: number
  cureQuality: number
  moldRisk: number
  done: boolean
}

export interface HarvestResult {
  plantId: string
  strainId: string
  label?: string
  dryG: number
  /** 0..100 */
  quality: number
  breakdown: { yield: number, density: number, terpenes: number, cleanliness: number, ripeness: number, cure: number }
  coins: number
  xp: number
  atH: number
}

export interface GameState {
  v: 1
  /** master seed for randomness */
  seed: number
  /** rng state */
  rng: number
  /** sim clock in game hours */
  nowH: number
  /** real ms when nowH was last synced */
  syncedAtMs: number
  coins: number
  xp: number
  level: number
  tents: Tent[]
  plants: Record<string, PlantSim>
  /** item id -> count (seeds, products in ml, treatments, scanner uses) */
  inventory: Record<string, number>
  owned: string[]
  drying: DryBatch[]
  jars: CureJar[]
  history: HarvestResult[]
  /** problem ids the player diagnosed at least once */
  knowledge: ProblemId[]
  /** bred strains */
  customStrains: StrainDef[]
  /** real journal harvests already rewarded (journal plant ids) */
  rewardedReal: string[]
  events: GameEvent[]
  /** challenge runs record every action for server replay */
  log?: LoggedAction[]
  settings: { notifications: boolean }
  /** harvests waiting for the cure to finish (cure part of the score is still open) */
  pending?: HarvestResult[]
  /** seed for scripted random events (challenge runs share it, independent of player actions) */
  eventsSeed?: number
  /** id counter for plants, events, batches */
  seq?: number
}

export interface GameEvent {
  id: string
  atH: number
  kind: 'power-cut' | 'heatwave' | 'cold-snap' | 'pest-hitchhiker' | 'humidity-spike' | 'problem' | 'stage' | 'ripe' | 'dead' | 'herm' | 'info'
  plantId?: string
  tentId?: string
  text: L10n
  read?: boolean
}

// ---------- actions ----------

export interface FeedDose {
  productId: string
  mlPerL: number
}

export type GameAction
  = | { t: 'sow', strainId: string, tentId: string, medium: Medium, potL: number }
    | { t: 'water', plantId: string, liters: number, ph: number, feed: FeedDose[] }
    | { t: 'flush', plantId: string }
    | { t: 'treat', plantId: string, treatmentId: string }
    | { t: 'train', plantId: string, kind: 'top' | 'lst' | 'defoliate' }
    | { t: 'transplant', plantId: string, potL: number }
    | { t: 'flip', tentId: string }
    | { t: 'climate', tentId: string, tempC: number, rh: number }
    | { t: 'light', tentId: string, lightHours: number, dim: number }
    | { t: 'harvest', plantId: string }
    | { t: 'cull', plantId: string }
    | { t: 'diagnose', plantId: string, problemId: ProblemId }
    | { t: 'scan', plantId: string }
    | { t: 'buy', itemId: string, qty: number }
    | { t: 'install', tentId: string, itemId: string }
    | { t: 'dry', batchId: string, tempC: number, rh: number }
    | { t: 'jar', batchId: string }
    | { t: 'burp', jarId: string }
    | { t: 'finishCure', jarId: string }
    | { t: 'breed', motherId: string, fatherId: string, name: string }

export interface LoggedAction {
  atH: number
  action: GameAction
}

export type ActionResult
  = | { ok: true, message?: L10n, data?: unknown }
    | { ok: false, reason: 'not-found' | 'no-money' | 'locked' | 'invalid' | 'no-space' | 'no-item', message?: L10n }

// ---------- problem rules (sim calls these every step) ----------

export interface ProblemCtx {
  plant: PlantSim
  tent: Tent
  nowH: number
  /** deterministic random 0..1 */
  rand: () => number
}

export interface ProblemRule {
  id: ProblemId
  /** pressure per game hour toward onset/worsening, >0 grows severity, <0 heals; 0 = conditions absent */
  pressure: (ctx: ProblemCtx) => number
  /** extra effect each step while active (e.g. reduce reserves, health) */
  effect?: (ctx: ProblemCtx, p: ActiveProblem) => void
  /** severity thresholds for phases subtle/clear/severe; default 0.15/0.4/0.75 */
  phases?: [number, number, number]
}

// ---------- presentation contract for the renderer ----------

export type SymptomKind
  = | 'chlorosis-uniform' | 'chlorosis-interveinal' | 'yellow-edges-in' | 'tip-burn' | 'edge-burn'
    | 'rust-spots' | 'necrotic-spots' | 'bronze-patches' | 'purple-stems' | 'purple-petioles' | 'dark-green'
    | 'claw' | 'taco' | 'curl-down' | 'curl-up' | 'twisted-new-growth' | 'pale-new-growth' | 'bleached-top'
    | 'droop' | 'wilt' | 'stretch' | 'stunted'
    | 'stipple' | 'webbing' | 'silver-streaks' | 'insects' | 'powder' | 'gray-mold' | 'leaf-trails' | 'chewed' | 'sticky'
    | 'nanners' | 'foxtails'

export type SymptomWhere = 'old' | 'new' | 'all' | 'top' | 'buds' | 'stems' | 'underside'

export interface VisualSymptom {
  kind: SymptomKind
  where: SymptomWhere
  /** 0..1 */
  intensity: number
}

/** Everything the SVG renderer needs; produced by sim/visual.ts from PlantSim. */
export interface PlantVisual {
  seed: number
  stage: Stage
  /** 0..1 progress through the whole life */
  life: number
  heightCm: number
  nodes: number
  topped: number
  lst: boolean
  defoliated: boolean
  /** 0 sativa .. 1 indica */
  leafShape: number
  /** 0..1 leaf density */
  leafiness: number
  /** 0..1 */
  budSize: number
  budDensity: number
  /** 0 white pistils .. 1 orange/brown */
  pistils: number
  /** 0..1 trichome frost */
  frost: number
  /** 0..1 purple expression */
  purple: number
  /** overall healthy green 0..1 (lower = duller) */
  vigor: number
  medium: Medium
  potL: number
  symptoms: VisualSymptom[]
}

/** Text a player reads for an active problem at a given phase (no problem name, only what they see). */
export interface ProblemPresentation {
  id: ProblemId
  atlasId: ProblemId
  symptoms: Record<Exclude<ProblemPhase, 'hidden'>, VisualSymptom[]>
  observations: Record<Exclude<ProblemPhase, 'hidden'>, L10n[]>
}

// ---------- shadow challenge ----------

export interface ChallengeDef {
  id: string
  week: string
  seed: number
  strainId: string
  medium: Medium
  potL: number
  tentItem: string
  light: string
  gear: string[]
  startCoins: number
  /** scripted random events by game hour */
  eventsSeed: number
}

export interface ChallengeScore {
  quality: number
  dryG: number
  score: number
}

// ---------- read models ----------

export interface Observation {
  plantId: string
  stage: Stage
  /** game days since sowing */
  ageDays: number
  /** what the player can see; one entry per visible problem, no names */
  signs: { key: string, phase: Exclude<ProblemPhase, 'hidden'>, lines: L10n[] }[]
  /** only filled when the tent has the matching meter */
  readings: { ph?: number, ec?: number, tempC?: number, rh?: number, vpd?: number, ppfd?: number, potWater?: number }
  /** rough look without meters: 'dry' | 'moist' | 'wet' soil feel by lifting the pot */
  potFeel: 'dry' | 'moist' | 'wet'
  health: number
}

export interface Forecast {
  atH: number
  kind: 'thirsty' | 'problem' | 'ripe' | 'dry-done' | 'burp'
  plantId?: string
  jarId?: string
  batchId?: string
}
