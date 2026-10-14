// Breeding: per-trait mix of two parent genomes and naming of the resulting strain.
import { STRAINS } from './content/catalog.ts'
import { makeRand } from './rng.ts'
import type { GameState, Genome, PlantSim, StrainDef } from './types.ts'

/** same as BREED_LEVEL in app/utils/gameUi.ts */
export const BREED_UNLOCK_LEVEL = 5
/** same cap as the sim's breed action */
export const MAX_CUSTOM_STRAINS = 50
export const NAME_MIN = 2
export const NAME_MAX = 32
/** Autoflowering is recessive; an auto x photo cross still throws an auto now and then (hybrid carriers). */
export const MIXED_AUTO_CHANCE = 0.125
/** Share of numeric traits that land outside both parents. */
export const TRANSGRESSIVE_CHANCE = 0.08
export const POLLEN_PREFIX = 'pollen:'
export const SEED_PREFIX = 'seed:'
export const CUSTOM_PREFIX = 'custom:'

type NumericTrait = Exclude<keyof Genome, 'kind'>

/** Hard bounds per numeric trait and the decimals kept after rounding. */
export const TRAIT_RANGES: Record<NumericTrait, { min: number, max: number, dp: number }> = {
  autoLifeDays: { min: 60, max: 100, dp: 0 },
  flowerDays: { min: 49, max: 84, dp: 0 },
  vigor: { min: 0.6, max: 1.6, dp: 2 },
  stretch: { min: 1, max: 2.5, dp: 2 },
  yieldPotential: { min: 15, max: 300, dp: 0 },
  terpenes: { min: 0, max: 1, dp: 2 },
  potency: { min: 0, max: 1, dp: 2 },
  moldResistance: { min: 0, max: 1, dp: 2 },
  pestResistance: { min: 0, max: 1, dp: 2 },
  feedDemand: { min: 0.6, max: 1.4, dp: 2 },
  hermRisk: { min: 0, max: 1, dp: 2 },
  leafShape: { min: 0, max: 1, dp: 2 },
  purple: { min: 0, max: 1, dp: 2 }
}
export const NUMERIC_TRAITS = Object.keys(TRAIT_RANGES) as NumericTrait[]

/** Base scatter around the parents' mean, as a share of the trait's full range. */
const BASE_SPREAD = 0.03
const sdOf = (lo: number, hi: number, range: number) => (hi - lo) / 5 + BASE_SPREAD * range
const TRANSGRESS_MAX = 0.15

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number, dp: number) => {
  const f = 10 ** dp
  return Math.round(v * f) / f
}
/** Roughly normal, sd 1, bounded to +-3 (sum of three uniforms). */
const gauss = (rand: () => number) => (rand() + rand() + rand() - 1.5) * 2

function mixTrait(trait: NumericTrait, a: number, b: number, rand: () => number): number {
  const { min, max, dp } = TRAIT_RANGES[trait]
  const range = max - min
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  let v: number
  if (rand() < TRANSGRESSIVE_CHANCE) {
    const beyond = rand() * TRANSGRESS_MAX * range
    v = rand() < 0.5 ? lo - beyond : hi + beyond
  } else {
    v = (a + b) / 2 + gauss(rand) * sdOf(lo, hi, range)
  }
  return round(clamp(v, min, max), dp)
}

export function cross(a: Genome, b: Genome, rand: () => number): Genome {
  const kind = a.kind === b.kind ? a.kind : (rand() < MIXED_AUTO_CHANCE ? 'auto' : 'photo')
  const out = { kind } as Genome
  for (const trait of NUMERIC_TRAITS) {
    let pa = a[trait]
    let pb = b[trait]
    // timing genes follow the parent that actually expresses them
    if (trait === 'autoLifeDays' && kind === 'auto' && a.kind !== b.kind) pa = pb = a.kind === 'auto' ? a[trait] : b[trait]
    if (trait === 'flowerDays' && kind === 'photo' && a.kind !== b.kind) pa = pb = a.kind === 'photo' ? a[trait] : b[trait]
    out[trait] = mixTrait(trait, pa, pb, rand)
  }
  return out
}

/** Likely range of each child trait (mean +-2 sd), ignoring the rare transgressive outlier. */
export function previewCross(a: Genome, b: Genome): { kind: { auto: number, photo: number }, traits: Record<NumericTrait, [number, number]> } {
  const autoShare = a.kind === b.kind ? (a.kind === 'auto' ? 1 : 0) : MIXED_AUTO_CHANCE
  const traits = {} as Record<NumericTrait, [number, number]>
  for (const trait of NUMERIC_TRAITS) {
    const { min, max, dp } = TRAIT_RANGES[trait]
    const lo = Math.min(a[trait], b[trait])
    const hi = Math.max(a[trait], b[trait])
    const sd = sdOf(lo, hi, max - min)
    const mid = (a[trait] + b[trait]) / 2
    traits[trait] = [round(clamp(mid - 2 * sd, min, max), dp), round(clamp(mid + 2 * sd, min, max), dp)]
  }
  return { kind: { auto: autoShare, photo: 1 - autoShare }, traits }
}

/** Trimmed display name, or null when it is too short or long after cleaning. */
export function sanitizeStrainName(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.normalize('NFC').replace(/[^\p{L}\p{N} '.#-]/gu, '').replace(/\s+/g, ' ').trim()
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : null
}

export function strainSlug(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '')
}

export function findStrain(state: Pick<GameState, 'customStrains'>, id: string): StrainDef | undefined {
  return STRAINS.find(s => s.id === id) ?? state.customStrains.find(s => s.id === id)
}

const canMother = (p: PlantSim | undefined): p is PlantSim => !!p && !p.dead && (p.stage === 'flower' || p.stage === 'ripening')

export interface PollenSource {
  /** plant id or inventory item id `pollen:<strainId>` */
  id: string
  genome: Genome
  strainId: string
  label: string
}

/** Resolves the father: a living hermed plant (or the mother herself, which selfs her) or pollen from the inventory. */
export function pollenSource(state: GameState, fatherId: string): PollenSource | null {
  if (fatherId.startsWith(POLLEN_PREFIX)) {
    if ((state.inventory[fatherId] ?? 0) < 1) return null
    const strain = findStrain(state, fatherId.slice(POLLEN_PREFIX.length))
    return strain ? { id: fatherId, genome: strain.genome, strainId: strain.id, label: strain.name } : null
  }
  const plant = state.plants[fatherId]
  if (!plant || plant.dead || !plant.hermed) return null
  return { id: fatherId, genome: plant.genome, strainId: plant.strainId, label: plant.label ?? findStrain(state, plant.strainId)?.name ?? plant.strainId }
}

export function breedStrain(state: GameState, motherId: string, fatherId: string, name: string): StrainDef | null {
  const mother = state.plants[motherId]
  if (!canMother(mother)) return null
  if (fatherId === motherId && !mother.hermed) return null
  const father = pollenSource(state, fatherId)
  const clean = sanitizeStrainName(name)
  if (!father || !clean || state.customStrains.length >= MAX_CUSTOM_STRAINS) return null
  const base = strainSlug(clean)
  if (!base) return null

  let id = `${CUSTOM_PREFIX}${base}`
  for (let n = 2; findStrain(state, id); n++) id = `${CUSTOM_PREFIX}${base}-${n}`

  const rand = makeRand(state)
  const genome = cross(mother.genome, father.genome, rand)
  const seeds = 3 + Math.floor(rand() * 4)
  const motherName = mother.label ?? findStrain(state, mother.strainId)?.name ?? mother.strainId

  const strain: StrainDef = {
    id,
    name: clean,
    blurb: { en: `Your cross: ${motherName} x ${father.label}.`, cs: `Tvůj kříženec: ${motherName} x ${father.label}.` },
    genome,
    price: 0,
    unlockLevel: 1
  }
  if (fatherId.startsWith(POLLEN_PREFIX)) {
    const left = (state.inventory[fatherId] ?? 0) - 1
    if (left > 0) state.inventory[fatherId] = left
    else state.inventory = Object.fromEntries(Object.entries(state.inventory).filter(([k]) => k !== fatherId))
  }
  state.customStrains.push(strain)
  const seedKey = `${SEED_PREFIX}${id}`
  state.inventory[seedKey] = (state.inventory[seedKey] ?? 0) + seeds
  return strain
}
