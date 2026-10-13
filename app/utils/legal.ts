// Home-grow limits for private persons. Informational only, checked against the law texts on CHECKED.
import type { Plant } from '../types/grow'
import type { LegalCountry, LegalData } from '../types/kit'
import { isGrowing } from './stages'

export const LEGAL_CHECKED = '2026-10-13'

export interface LegalRule {
  country: LegalCountry
  /** YYYY-MM-DD the rules took effect */
  since: string
  minAge: number
  plants: number
  /** plants and storage are counted per adult (DE); CZ wording is unclear, so the app does not multiply */
  perAdult: boolean
  homeGrams: number
  publicGrams: number
  /** above this it is no longer a minor offence but a crime */
  crimePlants: number
  crimeHomeGrams: number
  sources: { label: string, url: string }[]
}

export const LEGAL_RULES: Record<LegalCountry, LegalRule> = {
  cz: {
    country: 'cz',
    since: '2026-01-01',
    minAge: 21,
    plants: 3,
    perAdult: false,
    homeGrams: 100,
    publicGrams: 25,
    crimePlants: 5,
    crimeHomeGrams: 200,
    sources: [
      { label: 'Zákon č. 270/2025 Sb.', url: 'https://www.zakonyprolidi.cz/cs/2025-270' },
      { label: 'Zákon č. 167/1998 Sb., § 5 odst. 12–13, § 39', url: 'https://www.zakonyprolidi.cz/cs/1998-167' }
    ]
  },
  de: {
    country: 'de',
    since: '2024-04-01',
    minAge: 18,
    plants: 3,
    perAdult: true,
    homeGrams: 50,
    publicGrams: 25,
    crimePlants: 3,
    crimeHomeGrams: 60,
    sources: [
      { label: 'Konsumcannabisgesetz (KCanG)', url: 'https://www.gesetze-im-internet.de/kcang/BJNR06D0B0024.html' },
      { label: 'KCanG § 3', url: 'https://www.gesetze-im-internet.de/kcang/__3.html' },
      { label: 'BMG FAQ Cannabisgesetz', url: 'https://www.bundesgesundheitsministerium.de/themen/cannabis/faq-cannabisgesetz' }
    ]
  }
}

/** Typical dry / wet ratio, used only while a harvest has no dry weight yet. */
export const DRY_RATIO = 0.22

export interface StoredHarvest {
  plant: Plant
  /** grams the grower says are left, or the full (estimated) dry weight */
  grams: number
  estimated: boolean
  edited: boolean
}

/** Harvested weight the household may still have at home. Archived plants count only when the grower set an amount. */
export function storedHarvests(plants: Plant[], legal: Pick<LegalData, 'stored'>): StoredHarvest[] {
  const out: StoredHarvest[] = []
  for (const p of plants) {
    const h = p.harvest
    if (!h) continue
    const edited = p.id in legal.stored
    if (p.archived && !edited) continue
    const dry = h.dryWeight ?? (h.wetWeight != null ? Math.round(h.wetWeight * DRY_RATIO) : null)
    if (dry == null && !edited) continue
    out.push({ plant: p, grams: edited ? legal.stored[p.id]! : dry!, estimated: !edited && h.dryWeight == null, edited })
  }
  return out
}

export type Level = 'ok' | 'near' | 'over'

export interface LegalStatus {
  rule: LegalRule
  plantLimit: number
  gramLimit: number
  plants: number
  grams: number
  plantLevel: Level
  gramLevel: Level
  level: Level
}

const levelOf = (v: number, limit: number, nearAt: number): Level => (v > limit ? 'over' : v >= nearAt ? 'near' : 'ok')

export function legalStatus(plants: Plant[], legal: LegalData): LegalStatus | null {
  if (!legal.country) return null
  const rule = LEGAL_RULES[legal.country]
  const k = rule.perAdult ? Math.max(1, legal.adults) : 1
  const plantLimit = rule.plants * k
  const gramLimit = rule.homeGrams * k
  const growing = plants.filter(isGrowing).length
  const grams = Math.round(storedHarvests(plants, legal).reduce((s, h) => s + h.grams, 0))
  const plantLevel = levelOf(growing, plantLimit, plantLimit)
  const gramLevel = levelOf(grams, gramLimit, gramLimit * 0.8)
  const rank = { ok: 0, near: 1, over: 2 } as const
  return {
    rule,
    plantLimit,
    gramLimit,
    plants: growing,
    grams,
    plantLevel,
    gramLevel,
    level: rank[plantLevel] >= rank[gramLevel] ? plantLevel : gramLevel
  }
}
