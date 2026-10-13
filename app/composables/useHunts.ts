import type { PhenoCandidate, PhenoCriterion, PhenoHunt } from '~/types/grow'
import { growStore as state } from '~/composables/useGrow'
import { createId } from '~/utils/id'
import { normalizeHunt, nextTag } from '~/utils/pheno'

export interface HuntInput {
  name: string
  strain: string
  source: string
  plantIds: string[]
}

function list(): PhenoHunt[] {
  return (state.hunts ??= [])
}

function getHunt(id: string): PhenoHunt | undefined {
  return state.hunts?.find(h => h.id === id)
}

function touch(h: PhenoHunt) {
  h.updatedAt = new Date().toISOString()
}

function addHunt(input: HuntInput): PhenoHunt {
  const now = new Date().toISOString()
  const plants = new Set(state.plants.map(p => p.id))
  const hunt = normalizeHunt({
    id: createId(),
    name: input.name,
    strain: input.strain,
    source: input.source,
    candidates: input.plantIds.map((plantId, i) => ({ plantId, tag: `#${i + 1}` })),
    createdAt: now,
    updatedAt: now
  }, plants)
  list().unshift(hunt)
  return hunt
}

function updateHunt(id: string, patch: Partial<Pick<PhenoHunt, 'name' | 'strain' | 'source' | 'notes' | 'done' | 'weights' | 'keeper'>>) {
  const h = getHunt(id)
  if (!h) return
  Object.assign(h, patch)
  touch(h)
}

function deleteHunt(id: string): PhenoHunt | undefined {
  const h = getHunt(id)
  state.hunts = list().filter(x => x.id !== id)
  return h
}

function restoreHunt(h: PhenoHunt) {
  if (!getHunt(h.id)) list().unshift(h)
}

function setCandidates(id: string, plantIds: string[]) {
  const h = getHunt(id)
  if (!h) return
  const keep = h.candidates.filter(c => plantIds.includes(c.plantId))
  for (const plantId of plantIds) {
    if (keep.some(c => c.plantId === plantId)) continue
    keep.push({ plantId, tag: nextTag({ candidates: keep }), scores: {}, notes: '' })
  }
  h.candidates = keep
  if (h.keeper && !plantIds.includes(h.keeper.plantId)) h.keeper = null
  touch(h)
}

function updateCandidate(id: string, plantId: string, patch: Partial<Pick<PhenoCandidate, 'tag' | 'notes'>>) {
  const c = getHunt(id)?.candidates.find(x => x.plantId === plantId)
  if (!c) return
  Object.assign(c, patch)
  touch(getHunt(id)!)
}

/** null clears the score */
function setScore(id: string, plantId: string, criterion: PhenoCriterion, value: number | null) {
  const c = getHunt(id)?.candidates.find(x => x.plantId === plantId)
  if (!c) return
  const { [criterion]: _, ...rest } = c.scores
  c.scores = value === null ? rest : { ...rest, [criterion]: Math.max(1, Math.min(5, Math.round(value))) }
  touch(getHunt(id)!)
}

/** Hunts a plant takes part in. */
function huntsOf(plantId: string): PhenoHunt[] {
  return (state.hunts ?? []).filter(h => h.candidates.some(c => c.plantId === plantId))
}

export function useHunts() {
  return { hunts: computed(() => state.hunts ?? []), getHunt, addHunt, updateHunt, deleteHunt, restoreHunt, setCandidates, updateCandidate, setScore, huntsOf }
}
