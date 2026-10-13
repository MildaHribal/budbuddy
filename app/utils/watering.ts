// Smart watering interval: learns from the dates the grower actually watered,
// falls back to an estimate from pot size, medium and stage while the log is short.
import type { Medium, StageId } from '../types/grow'
import { daysBetween } from './date'

export interface WateringInput {
  /** dates (YYYY-MM-DD) of water / feed entries, any order, duplicates allowed */
  dates: readonly string[]
  potSize: string
  medium: Medium
  stage: StageId
  /** date the current stage started; intervals before it count less */
  stageSince?: string | null
}

export interface WateringSuggestion {
  /** suggested days between waterings, 1–14 */
  days: number
  source: 'history' | 'blend' | 'estimate'
  /** intervals used from the journal */
  samples: number
  /** learned average before rounding, null without history */
  learned: number | null
  /** pot / medium / stage estimate */
  estimate: number
  potLitres: number | null
  /** waterings have been irregular (spread over half the average) */
  irregular: boolean
}

const MAX_SAMPLES = 8
/** longer gaps are treated as forgotten waterings or a break, not as the rhythm */
const MAX_GAP = 21
const DECAY = 0.75
const FULL_CONFIDENCE = 3

/** "11 l", "11L", "3 gal", "3.5 gallon", "500 ml", "11" → litres. */
export function parsePotLitres(potSize: string): number | null {
  const m = potSize.trim().toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(ml|l|lt|litr\w*|gal\w*)?/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  const unit = m[2] ?? ''
  if (unit === 'ml') return n / 1000
  if (unit.startsWith('gal')) return n * 3.785
  return n
}

/** Rough starting interval for a pot that has no history yet. */
export function estimateInterval(potSize: string, medium: Medium, stage: StageId): number {
  const litres = parsePotLitres(potSize)
  let days = litres === null ? 3 : litres <= 1 ? 1 : litres <= 4 ? 2 : litres <= 8 ? 3 : litres <= 15 ? 4 : 5
  // coco and hydro are fed little and often
  if (medium === 'coco' || medium === 'hydro') days = Math.max(1, Math.round(days / 2))
  // small roots in a big pot: the medium stays wet longer
  if (stage === 'germination' || stage === 'seedling') days += 1
  // flowering plants drink the most
  if (stage === 'flowering' && days > 2) days -= 1
  return Math.min(14, Math.max(1, days))
}

/** Gaps in days between consecutive distinct watering dates, oldest first, with the start date of each gap. */
export function wateringGaps(dates: readonly string[]): { from: string, days: number }[] {
  const sorted = [...new Set(dates)].sort()
  const gaps: { from: string, days: number }[] = []
  for (let i = 1; i < sorted.length; i++) gaps.push({ from: sorted[i - 1]!, days: daysBetween(sorted[i - 1]!, sorted[i]!) })
  return gaps
}

export function suggestWatering(input: WateringInput): WateringSuggestion {
  const estimate = estimateInterval(input.potSize, input.medium, input.stage)
  const gaps = wateringGaps(input.dates).filter(g => g.days >= 1 && g.days <= MAX_GAP).slice(-MAX_SAMPLES)

  let learned: number | null = null
  let irregular = false
  if (gaps.length) {
    let sum = 0
    let total = 0
    gaps.forEach((g, i) => {
      // newest gap weighs 1, older ones decay; gaps from an earlier stage count half
      let w = DECAY ** (gaps.length - 1 - i)
      if (input.stageSince && g.from < input.stageSince) w *= 0.5
      sum += g.days * w
      total += w
    })
    learned = sum / total
    const mean = gaps.reduce((s, g) => s + g.days, 0) / gaps.length
    const sd = Math.sqrt(gaps.reduce((s, g) => s + (g.days - mean) ** 2, 0) / gaps.length)
    irregular = gaps.length >= 3 && sd > mean / 2
  }

  const n = gaps.length
  const raw = learned === null
    ? estimate
    : n >= FULL_CONFIDENCE ? learned : (learned * n + estimate * (FULL_CONFIDENCE - n)) / FULL_CONFIDENCE
  return {
    days: Math.min(14, Math.max(1, Math.round(raw))),
    source: learned === null ? 'estimate' : n >= FULL_CONFIDENCE ? 'history' : 'blend',
    samples: n,
    learned: learned === null ? null : Math.round(learned * 10) / 10,
    estimate,
    potLitres: parsePotLitres(input.potSize),
    irregular
  }
}
