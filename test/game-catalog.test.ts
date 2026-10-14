import { describe, expect, it } from 'vitest'
import type { L10n, ProblemId } from '../shared/game/types'
import {
  BOTTLE_SIZES, EQUIPMENT, EQUIPMENT_STAT_KEYS, harvestCoins, harvestXp, itemPrice, itemUnlockLevel, levelForXp, MAX_LEVEL, parseItemId,
  potItemFor, PRODUCTS, RANDOM_EVENTS, SCANNER_ITEM, SCANNER_PRICE, STARTER, STRAINS, TREATMENT_IDS, TREATMENTS, xpForLevel
} from '../shared/game/content/catalog'

const ALL_PROBLEMS: Record<ProblemId, true> = {
  n_def: true, p_def: true, k_def: true, ca_def: true, mg_def: true, s_def: true, fe_def: true, zn_def: true, mn_def: true, b_def: true, cu_def: true, mo_def: true,
  nutrient_burn: true, n_toxicity: true, ph_lockout: true, salt_buildup: true,
  light_burn: true, taco_leaves: true, low_light: true, light_leak_stress: true, overwatering: true, underwatering: true, root_rot: true,
  heat_stress: true, cold_stress: true, high_humidity: true, low_humidity: true, wind_burn: true, hermaphrodite: true, transplant_shock: true, foxtailing: true,
  spider_mites: true, thrips: true, aphids: true, fungus_gnats: true, whiteflies: true, caterpillars: true, mealybugs: true, leaf_miners: true,
  russet_broad_mites: true, root_aphids: true, powdery_mildew: true, botrytis: true, septoria: true, fusarium_wilt: true, hlvd: true
}

const texts: [string, L10n][] = [
  ...STRAINS.map(s => [`strain ${s.id}`, s.blurb] as [string, L10n]),
  ...EQUIPMENT.flatMap(e => [[`eq ${e.id} name`, e.name], [`eq ${e.id} blurb`, e.blurb]] as [string, L10n][]),
  ...PRODUCTS.map(p => [`product ${p.id}`, p.name] as [string, L10n]),
  ...TREATMENTS.flatMap(t => [[`treat ${t.id} name`, t.name], [`treat ${t.id} blurb`, t.blurb]] as [string, L10n][]),
  ...RANDOM_EVENTS.map(e => [`event ${e.kind}`, e.text] as [string, L10n])
]

const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi

describe('game catalog', () => {
  it('has unique ids across all inventory item kinds', () => {
    const ids = [
      ...STRAINS.map(s => `seed:${s.id}`), SCANNER_ITEM,
      ...EQUIPMENT.map(e => e.id), ...PRODUCTS.map(p => p.id), ...TREATMENTS.map(t => t.id)
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(STRAINS.map(s => s.name)).size).toBe(STRAINS.length)
  })

  it('has en + cs texts, no em dashes, no hype words', () => {
    for (const [where, t] of texts) {
      expect(t.en.trim(), where).not.toBe('')
      expect(t.cs.trim(), where).not.toBe('')
      for (const v of [t.en, t.cs]) {
        expect(v, where).not.toContain('—')
        expect(v, where).not.toMatch(/\b(ultimate|powerful|revolutionary|game.changer|cutting.edge)\b/i)
      }
    }
    for (const s of STRAINS) expect(s.name).not.toContain('—')
  })

  it('strains have realistic genomes', () => {
    expect(STRAINS.length).toBeGreaterThanOrEqual(14)
    expect(STRAINS.some(s => s.genome.kind === 'auto')).toBe(true)
    expect(STRAINS.some(s => s.genome.kind === 'photo')).toBe(true)
    for (const { id, genome: g, price, unlockLevel } of STRAINS) {
      if (g.kind === 'auto') expect(inRange(g.autoLifeDays, 70, 85), id).toBe(true)
      expect(inRange(g.flowerDays, 50, 75), id).toBe(true)
      expect(inRange(g.yieldPotential, 40, 180), id).toBe(true)
      expect(inRange(g.vigor, 0.6, 1.6), id).toBe(true)
      expect(inRange(g.stretch, 1, 2.5), id).toBe(true)
      expect(inRange(g.feedDemand, 0.6, 1.4), id).toBe(true)
      for (const k of ['terpenes', 'potency', 'moldResistance', 'pestResistance', 'hermRisk', 'leafShape', 'purple'] as const)
        expect(inRange(g[k], 0, 1), `${id}.${k}`).toBe(true)
      expect(price, id).toBeGreaterThan(0)
      expect(inRange(unlockLevel, 1, MAX_LEVEL), id).toBe(true)
    }
  })

  it('equipment has the stat keys the sim reads', () => {
    for (const e of EQUIPMENT) {
      for (const k of EQUIPMENT_STAT_KEYS[e.slot]) expect(e.stats[k], `${e.id}.${k}`).toBeTypeOf('number')
      if (e.slot === 'meter') expect(e.stats.ph || e.stats.ec || e.stats.climate, e.id).toBe(1)
      expect(e.price, e.id).toBeGreaterThan(0)
      expect(inRange(e.unlockLevel, 1, MAX_LEVEL), e.id).toBe(true)
    }
    expect(EQUIPMENT.filter(e => e.slot === 'tent').map(e => e.stats.slots)).toEqual([2, 4, 6, 9])
    const lights = EQUIPMENT.filter(e => e.slot === 'light')
    for (const l of lights) expect(inRange(l.stats.ppfd / l.stats.watts, 1, 6), l.id).toBe(true)
    expect(potItemFor('soil', 11)?.id).toBe('pot-soil-11')
    expect(potItemFor('hydro', 20)?.id).toBe('pot-dwc-20')
    expect(potItemFor('coco', 7)).toBeNull()
  })

  it('products have realistic EC', () => {
    for (const p of PRODUCTS) {
      expect(inRange(p.ecPerMl, 0, 0.3), p.id).toBe(true)
      if (p.kind === 'base') expect(inRange(p.ecPerMl, 0.1, 0.2), p.id).toBe(true)
      expect(inRange(p.unlockLevel, 1, MAX_LEVEL), p.id).toBe(true)
    }
    const micro = PRODUCTS.find(p => p.kind === 'micro')!
    for (const n of ['Fe', 'Zn', 'Mn', 'B', 'Cu', 'Mo'] as const) expect(micro.npk[n], n).toBeGreaterThan(0)
  })

  it('treatments cover the fixed id list with valid problems', () => {
    expect(TREATMENTS.map(t => t.id).sort()).toEqual([...TREATMENT_IDS].sort())
    for (const t of TREATMENTS) {
      expect(t.helps.length, t.id).toBeGreaterThan(0)
      for (const p of t.helps) expect(ALL_PROBLEMS[p], `${t.id} -> ${p}`).toBe(true)
      expect(inRange(t.unlockLevel, 1, MAX_LEVEL), t.id).toBe(true)
    }
    for (const id of ['raise-light', 'defoliate', 'fan-up', 'dehumidify', 'remove-buds', 'cull-plant', 'flush-water'])
      expect(TREATMENTS.find(t => t.id === id)?.price, id).toBe(0)
  })

  it('starter points at real level-1 items', () => {
    const strain = STRAINS.find(s => s.id === STARTER.strainId)!
    expect(strain.genome.kind).toBe('auto')
    expect(strain.unlockLevel).toBe(1)
    expect(itemUnlockLevel(STARTER.tentItem)).toBe(1)
    expect(itemUnlockLevel(STARTER.light)).toBe(1)
    expect(EQUIPMENT.find(e => e.id === STARTER.light)?.slot).toBe('light')
    expect(STARTER.seeds).toBe(2)
    expect(SCANNER_PRICE).toBeGreaterThan(0)
  })

  it('parses item ids and prices', () => {
    expect(parseItemId('seed:first-light-auto')?.type).toBe('seed')
    expect(parseItemId('base-veg@500')).toMatchObject({ type: 'product', ml: 500 })
    expect(parseItemId('base-veg@333')).toBeNull()
    expect(parseItemId('base-veg')).toBeNull()
    expect(itemPrice('scanner-credit')).toBe(SCANNER_PRICE)
    expect(itemPrice('nope')).toBeNull()
    for (const p of PRODUCTS) {
      const prices = Object.keys(BOTTLE_SIZES).map(ml => itemPrice(`${p.id}@${ml}`)!)
      expect([...prices].sort((a, b) => a - b), p.id).toEqual(prices)
    }
  })

  it('level curve is monotonic and paced', () => {
    expect(xpForLevel(1)).toBe(0)
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1))
      expect(levelForXp(xpForLevel(l))).toBe(l)
      expect(levelForXp(xpForLevel(l) - 1)).toBe(l - 1)
    }
    expect(levelForXp(1e9)).toBe(MAX_LEVEL)
    // every level up to 17 unlocks something, so each grow brings news
    const levels = new Set([...STRAINS, ...EQUIPMENT, ...PRODUCTS, ...TREATMENTS].map(i => i.unlockLevel))
    for (const l of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) expect(levels.has(l), `level ${l}`).toBe(true)
  })

  it('first grow buys one meaningful upgrade, not everything', () => {
    const setup = 2 * itemPrice('pot-soil-11')! + itemPrice('base-veg@250')! + itemPrice('base-bloom@250')!
    const plants = STARTER.seeds
    const earned = plants * harvestCoins(50, 65)
    const nextGrowCosts = setup + 2 * itemPrice(`seed:${STARTER.strainId}`)!
    const spendable = STARTER.coins - setup + earned - nextGrowCosts
    const light240 = itemPrice('light-fs-240')!
    expect(spendable).toBeGreaterThanOrEqual(light240)
    expect(spendable).toBeLessThan(light240 + itemPrice('tent-80')!)
    const firstXp = plants * harvestXp(50, 65)
    expect(levelForXp(firstXp)).toBeGreaterThanOrEqual(2)
    expect(levelForXp(firstXp)).toBeLessThanOrEqual(3)
    expect(harvestCoins(50, 90)).toBeGreaterThan(harvestCoins(50, 65))
    expect(harvestCoins(0, 90)).toBe(0)
  })

  it('random events are rare per game day', () => {
    for (const e of RANDOM_EVENTS) expect(inRange(e.chancePerDay, 0.001, 0.01), e.kind).toBe(true)
    expect(RANDOM_EVENTS.map(e => e.kind).sort()).toEqual(['cold-snap', 'heatwave', 'humidity-spike', 'pest-hitchhiker', 'power-cut'])
  })
})
