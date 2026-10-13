import type { JournalEntry } from '../types/grow'
import type { InventoryData, NutrientStock, SeedStock, SupplyStock } from '../types/kit'

/**
 * ml left in a bottle: the last count minus what feed entries poured since.
 * Usage of a deleted entry no longer counts, unless its whole plant was deleted (the nutrient was still used).
 */
export function nutrientLeft(stock: NutrientStock, inv: Pick<InventoryData, 'usage'>, entries: Pick<JournalEntry, 'id'>[], plantIds: Set<string>): number {
  const entryIds = new Set(entries.map(e => e.id))
  let used = 0
  for (const u of inv.usage) {
    if (u.stockId !== stock.id || u.at < stock.countedAt) continue
    if (entryIds.has(u.entryId) || !plantIds.has(u.plantId)) used += u.ml
  }
  return Math.max(0, Math.round((stock.startMl - used) * 10) / 10)
}

/** Below 20 % of the bottle, or under 50 ml. */
export function nutrientLow(left: number, stock: Pick<NutrientStock, 'volumeMl'>): boolean {
  return left <= Math.max(50, stock.volumeMl * 0.2)
}

export const seedLow = (s: Pick<SeedStock, 'count'>) => s.count <= 1
export const supplyLow = (s: Pick<SupplyStock, 'quantity' | 'lowAt'>) => s.lowAt !== null && s.quantity <= s.lowAt

/** Replaces the usage rows of one entry (create or edit). */
export function setEntryUsage(inv: InventoryData, entryId: string, plantId: string, rows: { stockId: string, ml: number }[], at = new Date().toISOString()) {
  // keep the original timestamp so an edit does not escape a recount
  const prev = inv.usage.find(u => u.entryId === entryId)?.at ?? at
  inv.usage = inv.usage.filter(u => u.entryId !== entryId)
  for (const r of rows) if (r.ml > 0) inv.usage.push({ entryId, plantId, stockId: r.stockId, ml: r.ml, at: prev })
}
