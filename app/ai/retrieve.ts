// Knowledge search for one question: the main search plus, for English, a Czech search for the curated cards.
import { toCzechQuery } from './glossary'
import type { KbHit } from './kb'
import { selectPassages } from './prompt'

export interface KbSearch {
  searchKb(query: string, k?: number): Promise<KbHit[]>
  queryLang(query: string): 'cs' | 'en'
}

// "Slovník: X = Y" glossary cards only translate a word
const isGlossaryCard = (h: KbHit) => /^Slovník:/i.test(h.title)

/** Curated hits of the Czech search first, then the main results. */
export function mergeHits(primary: readonly KbHit[], czech: readonly KbHit[], maxCzech = 4): KbHit[] {
  const ids = new Set<string>()
  const out: KbHit[] = []
  for (const h of [...czech.filter(h => h.kind !== 'corpus').slice(0, maxCzech), ...primary]) {
    if (ids.has(h.id) || isGlossaryCard(h)) continue
    ids.add(h.id)
    out.push(h)
  }
  return out
}

export async function retrievePassages(kb: KbSearch, query: string, k = 12): Promise<KbHit[]> {
  const czech = kb.queryLang(query) === 'en' ? toCzechQuery(query) : ''
  // one at a time: both share one onnxruntime session
  const primary = await kb.searchKb(query, k)
  const extra = czech ? await kb.searchKb(czech, k) : []
  return selectPassages(mergeHits(primary, extra))
}
