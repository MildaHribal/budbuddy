// Harvest judge: the AI scores dried buds from photos; points are added locally (utils/harvestScore).
import type { HarvestRating, HarvestScoreKey, JournalEntry, Plant } from '../types/grow'
import { daysBetween } from '../utils/date'
import { SCORE_KEYS } from '../utils/harvestScore'
import { locale, type Locale } from '../utils/locale'
import type { LlmImage, LlmRequest } from './llm'

export const MAX_RATING_PHOTOS = 3

const SYSTEM: Record<Locale, string> = {
  en: `You judge home-grown cannabis harvests for BudBuddy, a grow journal. You see photos of the grower's dried or curing buds and a few facts. Be honest and specific but kind: this is a hobby grower.

Score only what the photos show, each 1–10 (5 = average home harvest, 8 = very good, 10 = exceptional):
- structure: bud density and shape, calyx stacking, no airy or foxtailed buds
- frost: trichome coverage visible on buds and sugar leaves
- trimCure: trim neatness, colour, signs of a good dry/cure (no hay-green, no over-dry crumble)
- health: no mould, pests, burnt tips or deficiency damage on the buds
If a photo is blurry, scores of what you cannot see stay near 5 and say so in improve.

Return ONLY one JSON object, no code fence, no other text:
{"valid":true,"structure":n,"frost":n,"trimCure":n,"health":n,"summary":"one or two sentences","good":["up to 3 short points"],"improve":["up to 3 short tips for the next run"]}
If the photos do not show harvested cannabis buds (living plant, other things, unreadable), return {"valid":false,"reason":"short explanation"}.
Mould (white fuzz, grey rot) must be named in improve and gives health 1–3. Write in English, no em dashes.`,
  cs: `Hodnotíš domácí sklizně konopí v pěstitelském deníku BudBuddy. Vidíš fotky usušených nebo zrajících palic a pár údajů. Buď upřímný a konkrétní, ale laskavý: jde o hobby pěstitele.

Hodnoť jen to, co je na fotkách, každé 1–10 (5 = průměrná domácí sklizeň, 8 = velmi dobrá, 10 = výjimečná):
- structure: hustota a tvar palic, bez vzdušných palic a foxtailingu
- frost: pokrytí trichomy na palicích a cukrových listech
- trimCure: úhlednost trimu, barva, známky dobrého sušení a zrání
- health: bez plísně, škůdců, spálených špiček či poškození z nedostatku
U rozmazané fotky drž neviditelné hodnoty kolem 5 a zmiň to v improve.

Vrať JEN jeden JSON objekt, bez bloku kódu a bez dalšího textu:
{"valid":true,"structure":n,"frost":n,"trimCure":n,"health":n,"summary":"jedna dvě věty","good":["až 3 krátké body"],"improve":["až 3 krátké tipy na příště"]}
Když fotky neukazují sklizené palice konopí, vrať {"valid":false,"reason":"krátké vysvětlení"}.
Plíseň musí být v improve a dává health 1–3. Piš česky, tykej, bez dlouhých pomlček.`
}

const AROMA = ['', 'faint', 'noticeable', 'loud'] as const

export interface RatingInput {
  plant: Plant
  entries: readonly JournalEntry[]
  images: LlmImage[]
  aroma: 1 | 2 | 3 | null
  today: string
}

export function buildRatingRequest(i: RatingInput, lang: Locale = locale.value): LlmRequest {
  const p = i.plant
  const h = p.harvest
  const facts: string[] = [`Strain: ${p.strain || 'unknown'} (${p.type})`, `Medium: ${p.medium}, pot ${p.potSize || 'unknown'}, ${p.location}`]
  if (h) {
    facts.push(`Seed to harvest: ${daysBetween(p.startDate, h.date)} days`)
    if (h.wetWeight != null) facts.push(`Wet weight: ${h.wetWeight} g`)
    if (h.dryWeight != null) facts.push(`Dry weight: ${h.dryWeight} g`)
    const cure = p.stageHistory.findLast(s => s.stage === 'curing')?.date
    const dry = p.stageHistory.findLast(s => s.stage === 'drying')?.date
    if (dry) facts.push(`Dried ${daysBetween(dry, cure ?? i.today)} days`)
    if (cure) facts.push(`Curing for ${daysBetween(cure, i.today)} days`)
    if (h.notes.trim()) facts.push(`Grower's harvest notes: ${h.notes.trim().slice(0, 300)}`)
  }
  if (i.aroma) facts.push(`Aroma (grower's nose): ${AROMA[i.aroma]}`)
  const pests = i.entries.filter(e => e.type === 'pest').length
  if (pests) facts.push(`Pest or problem entries during the grow: ${pests}`)
  return {
    system: SYSTEM[lang],
    history: [],
    userText: `${facts.join('\n')}\n\nRate this harvest from the ${i.images.length} photo(s).`,
    images: i.images.slice(0, MAX_RATING_PHOTOS),
    maxOutputTokens: 900
  }
}

export type ParsedRating
  = | { valid: true, scores: Record<HarvestScoreKey, number>, summary: string, good: string[], improve: string[] }
    | { valid: false, reason: string }

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[—–]/g, ',').replace(/\s+/g, ' ').trim().slice(0, max) : '')
const list = (v: unknown) => (Array.isArray(v) ? v.map(x => clean(x, 160)).filter(Boolean).slice(0, 3) : [])

/** Reads the model's JSON; null when it is unusable. */
export function parseRatingReply(text: string): ParsedRating | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  if (raw.valid === false) return { valid: false, reason: clean(raw.reason, 240) }
  const scores = {} as Record<HarvestScoreKey, number>
  for (const k of SCORE_KEYS) {
    const n = Number(raw[k])
    if (!Number.isFinite(n)) return null
    scores[k] = Math.min(10, Math.max(1, Math.round(n)))
  }
  return { valid: true, scores, summary: clean(raw.summary, 400), good: list(raw.good), improve: list(raw.improve) }
}

export type { HarvestRating }
