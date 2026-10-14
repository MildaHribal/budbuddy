import { describe, expect, it } from 'vitest'
import {
  breedStrain, cross, MIXED_AUTO_CHANCE, NUMERIC_TRAITS, previewCross, sanitizeStrainName, strainSlug, TRAIT_RANGES
} from '../shared/game/genetics'
import { makeRand } from '../shared/game/rng'
import type { GameState, Genome, PlantSim } from '../shared/game/types'

const auto: Genome = {
  kind: 'auto', autoLifeDays: 75, flowerDays: 56, vigor: 0.9, stretch: 1.4, yieldPotential: 60, terpenes: 0.6,
  potency: 0.55, moldResistance: 0.7, pestResistance: 0.5, feedDemand: 0.8, hermRisk: 0.1, leafShape: 0.7, purple: 0.2
}
const photo: Genome = {
  kind: 'photo', autoLifeDays: 90, flowerDays: 70, vigor: 1.3, stretch: 2, yieldPotential: 140, terpenes: 0.8,
  potency: 0.8, moldResistance: 0.4, pestResistance: 0.6, feedDemand: 1.2, hermRisk: 0.3, leafShape: 0.2, purple: 0.6
}
const randOf = (seed: number) => makeRand({ rng: seed })

function plant(id: string, genome: Genome, over: Partial<PlantSim> = {}): PlantSim {
  return {
    id, strainId: 'base-strain', genome, seed: 1, tentId: 't1', sownAtH: 0, stage: 'flower', stageStartH: 0,
    medium: 'soil', potL: 11, root: { water: 0.5, ph: 6.5, ec: 1, salts: 0, health: 1 },
    reserves: {} as PlantSim['reserves'], biomass: 10, budMass: 5, heightCm: 50, nodes: 6,
    training: { topped: 0, lst: false }, health: 1, damage: 0, stress: 0, problems: [], ripeness: 0.2,
    hermed: false, dead: false, ...over
  }
}

function state(plants: PlantSim[], inventory: Record<string, number> = {}): GameState {
  return {
    v: 1, seed: 7, rng: 12345, nowH: 500, syncedAtMs: 0, coins: 0, xp: 0, level: 6, tents: [],
    plants: Object.fromEntries(plants.map(p => [p.id, p])), inventory, owned: [], drying: [], jars: [], history: [],
    knowledge: [], customStrains: [], rewardedReal: [], events: [], settings: { notifications: false }
  }
}

describe('cross', () => {
  it('is deterministic for the same random sequence', () => {
    expect(cross(auto, photo, randOf(42))).toEqual(cross(auto, photo, randOf(42)))
    expect(cross(auto, photo, randOf(42))).not.toEqual(cross(auto, photo, randOf(43)))
  })

  it('keeps every trait inside its bounds', () => {
    const rand = randOf(1)
    for (let i = 0; i < 500; i++) {
      const g = cross(auto, photo, rand)
      for (const t of NUMERIC_TRAITS) {
        expect(g[t]).toBeGreaterThanOrEqual(TRAIT_RANGES[t].min)
        expect(g[t]).toBeLessThanOrEqual(TRAIT_RANGES[t].max)
      }
    }
  })

  it('mostly lands between the parents, with rare outliers', () => {
    const rand = randOf(9)
    let inside = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const y = cross(auto, photo, rand).yieldPotential
      if (y >= 55 && y <= 145) inside++
    }
    expect(inside / n).toBeGreaterThan(0.85)
    expect(inside / n).toBeLessThan(1)
  })

  it('follows the photoperiod rules', () => {
    const rand = randOf(3)
    expect(cross(auto, auto, rand).kind).toBe('auto')
    expect(cross(photo, photo, rand).kind).toBe('photo')
    let autos = 0
    const n = 4000
    for (let i = 0; i < n; i++) if (cross(auto, photo, rand).kind === 'auto') autos++
    expect(autos / n).toBeGreaterThan(MIXED_AUTO_CHANCE * 0.6)
    expect(autos / n).toBeLessThan(MIXED_AUTO_CHANCE * 1.4)
  })

  it('takes auto timing from the auto parent when a mixed cross flowers on its own', () => {
    const rand = randOf(5)
    for (let i = 0; i < 300; i++) {
      const g = cross(auto, photo, rand)
      if (g.kind === 'auto') expect(Math.abs(g.autoLifeDays - auto.autoLifeDays)).toBeLessThanOrEqual(10)
      else expect(Math.abs(g.flowerDays - photo.flowerDays)).toBeLessThanOrEqual(10)
    }
  })
})

describe('previewCross', () => {
  it('brackets the parents and stays in bounds', () => {
    const p = previewCross(auto, photo)
    expect(p.kind.auto).toBe(MIXED_AUTO_CHANCE)
    const [lo, hi] = p.traits.yieldPotential
    expect(lo).toBeLessThanOrEqual(60)
    expect(hi).toBeGreaterThanOrEqual(140)
    expect(previewCross(auto, auto).kind.auto).toBe(1)
  })
})

describe('names', () => {
  it('sanitizes and slugs', () => {
    expect(sanitizeStrainName('  Zelená   Bába #2 ')).toBe('Zelená Bába #2')
    expect(sanitizeStrainName('<script>x</script>')).toBe('scriptxscript')
    expect(sanitizeStrainName('a')).toBeNull()
    expect(sanitizeStrainName('x'.repeat(33))).toBeNull()
    expect(strainSlug('Zelená Bába #2')).toBe('zelena-baba-2')
  })
})

describe('breedStrain', () => {
  it('crosses a flowering mother with a hermed plant and adds seeds', () => {
    const s = state([plant('m', auto), plant('f', photo, { hermed: true, stage: 'ripening' })])
    const strain = breedStrain(s, 'm', 'f', 'Night Shift')
    expect(strain?.id).toBe('custom:night-shift')
    expect(s.customStrains).toHaveLength(1)
    const seeds = s.inventory['seed:custom:night-shift']!
    expect(seeds).toBeGreaterThanOrEqual(3)
    expect(seeds).toBeLessThanOrEqual(6)
    expect(s.rng).not.toBe(12345)
  })

  it('is deterministic from the game state', () => {
    const a = state([plant('m', auto), plant('f', photo, { hermed: true })])
    const b = state([plant('m', auto), plant('f', photo, { hermed: true })])
    expect(breedStrain(a, 'm', 'f', 'Twin')).toEqual(breedStrain(b, 'm', 'f', 'Twin'))
    expect(a.inventory).toEqual(b.inventory)
  })

  it('uses up one pollen item', () => {
    const s = state([plant('m', auto)], { 'pollen:custom:dad': 2 })
    s.customStrains.push({ id: 'custom:dad', name: 'Dad', blurb: { en: '', cs: '' }, genome: photo, price: 0, unlockLevel: 1 })
    expect(breedStrain(s, 'm', 'pollen:custom:dad', 'Kid')).not.toBeNull()
    expect(s.inventory['pollen:custom:dad']).toBe(1)
    expect(breedStrain(s, 'm', 'pollen:custom:dad', 'Kid')?.id).toBe('custom:kid-2')
    expect(s.inventory['pollen:custom:dad']).toBeUndefined()
  })

  it('refuses invalid crosses without touching the state', () => {
    const s = state([plant('m', auto, { stage: 'veg' }), plant('f', photo), plant('g', photo, { hermed: true, dead: true }), plant('ok', auto)])
    const before = JSON.stringify(s)
    expect(breedStrain(s, 'm', 'f', 'Nope')).toBeNull() // mother still in veg
    expect(breedStrain(s, 'ok', 'f', 'Nope')).toBeNull() // father not hermed
    expect(breedStrain(s, 'ok', 'g', 'Nope')).toBeNull() // dead father
    expect(breedStrain(s, 'ok', 'ok', 'Nope')).toBeNull() // selfing needs a hermed mother
    expect(breedStrain(s, 'ok', 'pollen:missing', 'Nope')).toBeNull()
    expect(breedStrain(s, 'ok', 'f', '!')).toBeNull()
    expect(JSON.stringify(s)).toBe(before)
  })

  it('lets a hermed mother self', () => {
    const s = state([plant('m', auto, { hermed: true })])
    expect(breedStrain(s, 'm', 'm', 'Selfie')?.genome.kind).toBe('auto')
  })
})
