/**
 * Shadow Grow catalogue.
 *
 * Inventory item ids (GameState.inventory, `buy` action):
 * - `seed:<strainId>`      qty = seeds, price = StrainDef.price per seed
 * - `scanner-credit`       qty = scans, price = SCANNER_PRICE each
 * - `<productId>@<ml>`     buy id only; adds <ml> to inventory[<productId>] (stock is kept in ml).
 *                          Sizes in BOTTLE_SIZES (250/500/1000), price = bottlePrice(). ProductDef.price is per 1000 ml.
 * - `<treatmentId>`        qty = applications; treatments with price 0 are free actions and need no stock
 * - `<equipmentId>`        slot 'pot': consumable, qty = pots in stock, one is used per sow/repot/transplant
 *                          (price includes fresh medium; pick it with potItemFor(medium, liters)).
 *                          Other slots: bought once into GameState.owned, then installed into a tent.
 * Use parseItemId / itemPrice / itemUnlockLevel so the sim and UI agree.
 */
import type { EquipmentDef, Medium, ProductDef, StrainDef, TreatmentDef } from '../types.ts'
import { EQUIPMENT, MEDIUM_CODE } from './catalog/equipment.ts'
import { bottlePrice, PRODUCTS } from './catalog/products.ts'
import { STRAINS } from './catalog/strains.ts'
import { TREATMENTS } from './catalog/treatments.ts'

export { EQUIPMENT, EQUIPMENT_STAT_KEYS, MEDIUM_CODE } from './catalog/equipment.ts'
export { BOTTLE_SIZES, bottlePrice, PRODUCTS } from './catalog/products.ts'
export { STRAINS } from './catalog/strains.ts'
export { TREATMENT_IDS, TREATMENTS } from './catalog/treatments.ts'
export { DIAGNOSIS_REWARD, harvestCoins, harvestXp, JOURNAL_BONUS, levelForXp, MAX_LEVEL, RANDOM_EVENTS, xpForLevel } from './catalog/progression.ts'
export type { RandomEventDef } from './catalog/progression.ts'

/** price of one scanner use */
export const SCANNER_PRICE = 15
export const SCANNER_ITEM = 'scanner-credit'

export const STARTER = { coins: 100, strainId: 'first-light-auto', tentItem: 'tent-60', light: 'light-blurple-100', gear: ['exhaust-150'] as string[], seeds: 2, stock: { 'pot-soil-11': 2 } as Record<string, number> }

export const strainById = (id: string): StrainDef | undefined => STRAINS.find(s => s.id === id)
export const equipmentById = (id: string): EquipmentDef | undefined => EQUIPMENT.find(e => e.id === id)
export const productById = (id: string): ProductDef | undefined => PRODUCTS.find(p => p.id === id)
export const treatmentById = (id: string): TreatmentDef | undefined => TREATMENTS.find(t => t.id === id)

/** Pot item for a sow/transplant; null when that size/medium combination is not sold. */
export function potItemFor(medium: Medium, liters: number): EquipmentDef | null {
  return EQUIPMENT.find(e => e.slot === 'pot' && e.stats.medium === MEDIUM_CODE[medium] && e.stats.liters === liters) ?? null
}

export type ParsedItem
  = | { type: 'seed', strainId: string, strain?: StrainDef }
    | { type: 'scanner' }
    | { type: 'product', product: ProductDef, ml: number }
    | { type: 'equipment', equipment: EquipmentDef }
    | { type: 'treatment', treatment: TreatmentDef }

/** `customStrains` = bred strains from GameState (seeds of those are not sold). */
export function parseItemId(itemId: string, customStrains: StrainDef[] = []): ParsedItem | null {
  if (itemId === SCANNER_ITEM) return { type: 'scanner' }
  if (itemId.startsWith('seed:')) {
    const strainId = itemId.slice(5)
    const strain = strainById(strainId) ?? customStrains.find(s => s.id === strainId)
    return strain ? { type: 'seed', strainId, strain } : null
  }
  const at = itemId.indexOf('@')
  if (at > 0) {
    const product = productById(itemId.slice(0, at))
    const ml = Number(itemId.slice(at + 1))
    return product && bottlePrice(product, ml) !== null ? { type: 'product', product, ml } : null
  }
  const equipment = equipmentById(itemId)
  if (equipment) return { type: 'equipment', equipment }
  const treatment = treatmentById(itemId)
  if (treatment) return { type: 'treatment', treatment }
  return null
}

/** Shop price for one unit of an item id; null = not for sale. */
export function itemPrice(itemId: string): number | null {
  const p = parseItemId(itemId)
  if (!p) return null
  switch (p.type) {
    case 'seed': return strainById(p.strainId)?.price ?? null
    case 'scanner': return SCANNER_PRICE
    case 'product': return bottlePrice(p.product, p.ml)
    case 'equipment': return p.equipment.price
    case 'treatment': return p.treatment.price
  }
}

export function itemUnlockLevel(itemId: string): number {
  const p = parseItemId(itemId)
  if (!p) return Infinity
  switch (p.type) {
    case 'seed': return p.strain?.unlockLevel ?? 1
    case 'scanner': return 1
    case 'product': return p.product.unlockLevel
    case 'equipment': return p.equipment.unlockLevel
    case 'treatment': return p.treatment.unlockLevel
  }
}
