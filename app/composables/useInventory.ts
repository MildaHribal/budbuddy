import type { JournalEntry, Plant } from '~/types/grow'
import type { InventoryData, NutrientStock, SeedStock, SupplyStock } from '~/types/kit'
import { stockUsage } from '~/utils/feeding'
import { createId } from '~/utils/id'
import { nutrientLeft, nutrientLow, seedLow, setEntryUsage, supplyLow } from '~/utils/inventory'
import { emptyInventory, normalizeNutrientStock, normalizeSeed, normalizeSupply } from '~/utils/kitSchema'
import { growStateForKit, useGrow, type PlantInput } from './useGrow'

type Kind = 'seeds' | 'nutrients' | 'supplies'
type ItemOf<K extends Kind> = InventoryData[K][number]

const NORMALIZE = { seeds: normalizeSeed, nutrients: normalizeNutrientStock, supplies: normalizeSupply } as const

export function useInventory() {
  const state = growStateForKit()
  const grow = useGrow()
  const empty = emptyInventory()
  const data = () => (state.inventory ??= emptyInventory())
  const inv = computed<InventoryData>(() => state.inventory ?? empty)

  function save<K extends Kind>(kind: K, item: Partial<ItemOf<K>> & { id?: string }): ItemOf<K> {
    const list = data()[kind] as ItemOf<K>[]
    const existing = item.id ? list.find(x => x.id === item.id) : undefined
    const merged = NORMALIZE[kind]({ ...(existing ?? {}), ...item, id: existing?.id ?? createId() } as Record<string, unknown>) as ItemOf<K>
    if (existing) Object.assign(existing, merged)
    else list.unshift(merged)
    return existing ?? merged
  }

  function remove(kind: Kind, id: string) {
    const d = data()
    if (kind === 'seeds') d.seeds = d.seeds.filter(x => x.id !== id)
    else if (kind === 'supplies') d.supplies = d.supplies.filter(x => x.id !== id)
    else {
      d.nutrients = d.nutrients.filter(x => x.id !== id)
      d.usage = d.usage.filter(u => u.stockId !== id)
    }
  }

  const plantIds = computed(() => new Set(state.plants.map(p => p.id)))
  const left = (n: NutrientStock) => nutrientLeft(n, inv.value, state.entries, plantIds.value)

  /** Sets the counted amount of a bottle to `ml` from now on. */
  function recount(id: string, ml: number) {
    const n = data().nutrients.find(x => x.id === id)
    if (!n) return
    n.startMl = Math.max(0, Math.min(n.volumeMl, ml))
    n.countedAt = new Date().toISOString()
  }

  /** Called after a feed entry is saved: subtracts the poured nutrients from linked bottles. */
  function recordUsage(entry: JournalEntry) {
    if (!state.inventory?.nutrients.length && !state.inventory?.usage.some(u => u.entryId === entry.id)) return
    const rows = entry.type === 'feed' ? stockUsage(entry.feedLines, entry.amountMl) : []
    const known = new Set(data().nutrients.map(n => n.id))
    setEntryUsage(data(), entry.id, entry.plantId, rows.filter(r => known.has(r.stockId)))
  }

  /** Creates a plant from a seed in stock and takes one seed out. */
  function plantSeed(seedId: string, input: PlantInput): Plant | null {
    const seed = data().seeds.find(s => s.id === seedId)
    if (!seed || seed.count < 1) return null
    const plant = grow.addPlant(input)
    seed.count -= 1
    return plant
  }

  const lowSeeds = computed<SeedStock[]>(() => inv.value.seeds.filter(seedLow))
  const lowNutrients = computed<NutrientStock[]>(() => inv.value.nutrients.filter(n => nutrientLow(left(n), n)))
  const lowSupplies = computed<SupplyStock[]>(() => inv.value.supplies.filter(supplyLow))
  const lowCount = computed(() => lowSeeds.value.filter(s => s.count === 0).length + lowNutrients.value.length + lowSupplies.value.length)

  return { inv, save, remove, left, recount, recordUsage, plantSeed, lowSeeds, lowNutrients, lowSupplies, lowCount }
}
