import type { GrowSpace, Plant } from '~/types/grow'
import { growStore as state } from '~/composables/useGrow'
import { createId } from '~/utils/id'
import { normalizeSpace } from '~/utils/spaces'

export type SpaceInput = Partial<Omit<GrowSpace, 'id' | 'createdAt' | 'updatedAt'>> & { name: string }

function list(): GrowSpace[] {
  return (state.spaces ??= [])
}

function getSpace(id: string | null | undefined): GrowSpace | undefined {
  return id ? state.spaces?.find(s => s.id === id) : undefined
}

function addSpace(input: SpaceInput): GrowSpace {
  const now = new Date().toISOString()
  // a new tent starts from the global light schedule
  const space = normalizeSpace({ lightsOn: state.settings.lightsOn, lightHours: state.settings.lightHours, ...input, id: createId(), createdAt: now, updatedAt: now }, state.settings)
  list().push(space)
  return space
}

function updateSpace(id: string, patch: Partial<GrowSpace>) {
  const space = getSpace(id)
  if (!space) return
  Object.assign(space, patch, { id: space.id, updatedAt: new Date().toISOString() })
}

/** Removes the space; its plants stay, just without a space. */
function deleteSpace(id: string) {
  state.spaces = list().filter(s => s.id !== id)
  for (const p of state.plants) if (p.spaceId === id) delete p.spaceId
}

function setPlantSpace(plantIds: readonly string[], spaceId: string | null) {
  const ids = new Set(plantIds)
  const now = new Date().toISOString()
  for (const p of state.plants) {
    if (!ids.has(p.id)) continue
    if (spaceId) p.spaceId = spaceId
    else delete p.spaceId
    p.updatedAt = now
  }
}

export function useSpaces() {
  return { spaces: computed(() => state.spaces ?? []), getSpace, addSpace, updateSpace, deleteSpace, setPlantSpace }
}

/** "Indoor · 80 × 80 cm · 18/6" */
export function spaceSubline(space: GrowSpace): string {
  const light = space.lightHours === null ? translate('organize.space.natural') : `${space.lightHours}/${24 - space.lightHours}`
  return [translate(`plantForm.locations.${space.location}`), space.size, light].filter(Boolean).join(' · ')
}

/** Extra rows for the plant info grid: its tent and pheno hunts. */
export function plantGroupDetails(plant: Plant): { icon: string, label: string, value: string }[] {
  const space = getSpace(plant.spaceId)
  const rows = [{ icon: 'i-tabler-tent', label: translate('organize.plant.space'), value: space?.name ?? translate('organize.plant.noSpace') }]
  for (const h of state.hunts ?? []) {
    const c = h.candidates.find(x => x.plantId === plant.id)
    if (!c) continue
    const keeper = h.keeper?.plantId === plant.id ? ` · ${translate(`organize.plant.keeper.${h.keeper.role}`)}` : ''
    rows.push({ icon: 'i-tabler-dna-2', label: translate('organize.plant.hunt'), value: `${h.name} ${c.tag}${keeper}` })
  }
  return rows
}
