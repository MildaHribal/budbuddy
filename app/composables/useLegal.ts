import type { LegalData } from '~/types/kit'
import { emptyLegal } from '~/utils/kitSchema'
import { legalStatus, storedHarvests } from '~/utils/legal'
import { growStateForKit } from './useGrow'

export function useLegal() {
  const state = growStateForKit()
  const empty = emptyLegal()
  const legal = computed<LegalData>(() => state.legal ?? empty)
  const data = () => (state.legal ??= emptyLegal())

  function update(patch: Partial<Omit<LegalData, 'stored'>>) {
    Object.assign(data(), patch)
  }

  /** grams = null resets to the full harvest weight */
  function setStored(plantId: string, grams: number | null) {
    const d = data()
    const rest = Object.fromEntries(Object.entries(d.stored).filter(([k]) => k !== plantId))
    d.stored = grams === null ? rest : { ...rest, [plantId]: Math.max(0, Math.round(grams)) }
  }

  const status = computed(() => legalStatus(state.plants, legal.value))
  const stored = computed(() => storedHarvests(state.plants, legal.value))

  return { legal, update, setStored, status, stored }
}
