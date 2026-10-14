// Pure helpers for the Shadow Grow screens. No sim import here, so tests and the home card stay light.
import type { JournalEntry, Plant } from '~/types/grow'
import { daysBetween } from '~/utils/date'
import { locale } from '~/utils/locale'
import type { EquipmentDef, Forecast, GameState, L10n, Medium, Observation, PlantSim, Stage, StrainDef } from '../../shared/game/types'
import { REAL_MS_PER_GAME_HOUR } from '../../shared/game/types'
import { JOURNAL_BONUS } from '../../shared/game/content/catalog'

export const GAME_KEY = 'budbuddy:game'
export const GAME_H_PER_REAL_H = 3_600_000 / REAL_MS_PER_GAME_HOUR
export const CHALLENGE_LEVEL = 3
export const BREED_LEVEL = 5
export const NOTIFY_BASE_ID = 7400
export const NOTIFY_SPAN = 100
export const NOTIFY_PER_DAY = 3

export const gameText = (x: L10n | string | undefined | null): string =>
  x == null ? '' : typeof x === 'string' ? x : (x[locale.value] || x.en)

export const STAGE_STYLE: Record<Stage, { key: string, color: string }> = {
  germination: { key: 'germination', color: '#d9c46b' },
  seedling: { key: 'seedling', color: '#8fd97a' },
  veg: { key: 'veg', color: '#3dd173' },
  flower: { key: 'flower', color: '#b58cf5' },
  ripening: { key: 'ripening', color: '#f2b544' },
  harvested: { key: 'harvested', color: '#d9a06a' },
  dead: { key: 'dead', color: '#f2626a' }
}

/** seeds are kept under `seed:<strainId>` */
export function seedCount(inv: Record<string, number>, strainId: string): number {
  return inv[`seed:${strainId}`] ?? 0
}

export function strainOf(state: Pick<GameState, 'customStrains'>, strains: readonly StrainDef[], id: string): StrainDef | undefined {
  return strains.find(s => s.id === id) ?? state.customStrains.find(s => s.id === id)
}

export type StatusTone = 'ok' | 'soon' | 'now' | 'info' | 'dead'
export interface PlantStatus {
  key: 'dead' | 'harvested' | 'ripe' | 'ripeSoon' | 'dry' | 'severe' | 'thirstySoon' | 'signs' | 'sprouting' | 'fine'
  tone: StatusTone
  n?: number
}

/** One short line for a plant card, most urgent first. */
export function plantStatus(plant: PlantSim, obs: Observation | null, forecasts: readonly Forecast[], nowH: number): PlantStatus {
  if (plant.dead || plant.stage === 'dead') return { key: 'dead', tone: 'dead' }
  if (plant.stage === 'harvested') return { key: 'harvested', tone: 'info' }
  const mine = forecasts.filter(f => f.plantId === plant.id)
  const soon = (kind: Forecast['kind'], realH: number) => mine.some(f => f.kind === kind && f.atH - nowH <= realH * GAME_H_PER_REAL_H)
  if (plant.stage === 'ripening' && (plant.ripeness >= 0.9 || soon('ripe', 0))) return { key: 'ripe', tone: 'now' }
  if (obs?.potFeel === 'dry') return { key: 'dry', tone: 'now' }
  const signs = obs?.signs ?? []
  if (signs.some(s => s.phase === 'severe')) return { key: 'severe', tone: 'now' }
  if (soon('thirsty', 2)) return { key: 'thirstySoon', tone: 'soon' }
  if (signs.length) return { key: 'signs', tone: 'soon', n: signs.length }
  if (soon('ripe', 3)) return { key: 'ripeSoon', tone: 'soon' }
  if (plant.stage === 'germination') return { key: 'sprouting', tone: 'info' }
  return { key: 'fine', tone: 'ok' }
}

/** Trichome look for a ripeness 0..1; drives the harvest hint. */
export function ripenessKey(ripeness: number): 'clear' | 'cloudy' | 'amber' | 'late' {
  if (ripeness < 0.6) return 'clear'
  if (ripeness < 0.85) return 'cloudy'
  if (ripeness < 0.97) return 'amber'
  return 'late'
}

/** Breakdown parts may come as 0..1 or 0..100. */
export const pct = (v: number) => Math.round(Math.max(0, Math.min(100, v <= 1 ? v * 100 : v)))

export interface XpProgress { level: number, into: number, span: number, ratio: number }
export function xpProgress(xp: number, level: number, xpForLevel: (l: number) => number): XpProgress {
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  const span = Math.max(0, to - from)
  const into = Math.max(0, xp - from)
  return { level, into, span, ratio: span > 0 ? Math.min(1, into / span) : 1 }
}

// ── Notifications ─────────────────────────────────────────────────

export interface PlannedNotice {
  id: number
  at: number
  kind: Forecast['kind']
  plantId?: string
  route: string
}

const PRIORITY: Record<Forecast['kind'], number> = { 'problem': 0, 'ripe': 1, 'thirsty': 2, 'dry-done': 3, 'burp': 4 }
const QUIET_FROM = 22
const QUIET_TO = 7
const MERGE_MS = 45 * 60_000

/** Moves night moments (22:00 to 07:00 local) to 07:00 the next morning. */
function outOfQuiet(ms: number): number {
  const d = new Date(ms)
  const h = d.getHours()
  if (h >= QUIET_FROM) {
    d.setDate(d.getDate() + 1)
    d.setHours(QUIET_TO, 0, 0, 0)
  } else if (h < QUIET_TO) {
    d.setHours(QUIET_TO, 0, 0, 0)
  }
  return d.getTime()
}

const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function noticeRoute(f: Pick<Forecast, 'kind' | 'plantId'>): string {
  if (f.kind === 'dry-done' || f.kind === 'burp') return '/game/dry'
  return f.plantId ? `/game/plant/${f.plantId}` : '/game'
}

/** Picks at most NOTIFY_PER_DAY moments per real day from a forecast, most important first. */
export function planNotices(forecasts: readonly Forecast[], toMs: (h: number) => number, nowMs: number): PlannedNotice[] {
  const seen = new Set<string>()
  const items = forecasts
    .map(f => ({ f, at: outOfQuiet(toMs(f.atH)) }))
    .filter(x => x.at > nowMs + 60_000)
    .sort((a, b) => PRIORITY[a.f.kind] - PRIORITY[b.f.kind] || a.at - b.at)
    .filter(({ f }) => {
      const k = `${f.kind}|${f.plantId ?? f.jarId ?? f.batchId ?? ''}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  const picked: { f: Forecast, at: number }[] = []
  const perDay = new Map<string, number>()
  for (const x of items) {
    const day = dayKey(x.at)
    if ((perDay.get(day) ?? 0) >= NOTIFY_PER_DAY) continue
    if (picked.some(p => Math.abs(p.at - x.at) < MERGE_MS)) continue
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
    picked.push(x)
  }
  return picked
    .sort((a, b) => a.at - b.at)
    .slice(0, NOTIFY_SPAN)
    .map((x, i) => ({ id: NOTIFY_BASE_ID + i, at: x.at, kind: x.f.kind, plantId: x.f.plantId, route: noticeRoute(x.f) }))
}

// ── Real journal bonus ────────────────────────────────────────────

export const REAL_MIN_DAYS = JOURNAL_BONUS.minDays
export const REAL_MIN_PHOTOS = JOURNAL_BONUS.minPhotos
export const REAL_GAP_DAYS = JOURNAL_BONUS.cooldownDays

/**
 * Journal plants that earn the real-grow bonus: harvested, entries spanning >= 28 days, >= 5 own photos,
 * at most one per 30 days per space (counting plants already rewarded).
 */
export function journalBonusCandidates(plants: readonly Plant[], entries: readonly JournalEntry[], rewarded: readonly string[]): string[] {
  const byPlant = new Map<string, JournalEntry[]>()
  for (const e of entries) {
    const list = byPlant.get(e.plantId)
    if (list) list.push(e)
    else byPlant.set(e.plantId, [e])
  }
  const space = (p: Plant) => p.spaceId || 'none'
  const taken = new Map<string, string[]>()
  for (const p of plants) {
    if (!rewarded.includes(p.id) || !p.harvest?.date) continue
    taken.set(space(p), [...(taken.get(space(p)) ?? []), p.harvest.date])
  }
  const eligible = plants
    .filter(p => !p.demo && !rewarded.includes(p.id) && !!p.harvest?.date)
    .filter((p) => {
      const list = byPlant.get(p.id) ?? []
      if (!list.length) return false
      const dates = list.map(e => e.date).sort()
      const photos = list.reduce((n, e) => n + e.photoIds.filter(id => !id.startsWith('demo-')).length, 0)
      return daysBetween(dates[0]!, dates[dates.length - 1]!) >= REAL_MIN_DAYS && photos >= REAL_MIN_PHOTOS
    })
    .sort((a, b) => a.harvest!.date.localeCompare(b.harvest!.date))
  const out: string[] = []
  for (const p of eligible) {
    const dates = taken.get(space(p)) ?? []
    if (dates.some(d => Math.abs(daysBetween(d, p.harvest!.date)) < REAL_GAP_DAYS)) continue
    taken.set(space(p), [...dates, p.harvest!.date])
    out.push(p.id)
  }
  return out
}

/** Light-weight peek at a saved game for the home card (no sim needed). */
export interface GamePeek { level: number, coins: number, growing: number, unread: number }
export function peekGame(json: string | null): GamePeek | null {
  if (!json) return null
  try {
    const s = JSON.parse(json) as Partial<GameState>
    if (!s || typeof s !== 'object' || !s.plants) return null
    const growing = Object.values(s.plants).filter(p => p && !p.dead && p.stage !== 'harvested' && p.stage !== 'dead').length
    return { level: s.level ?? 1, coins: s.coins ?? 0, growing, unread: (s.events ?? []).filter(e => !e.read).length }
  } catch {
    return null
  }
}

// ── Pots ──────────────────────────────────────────────────────────

const MEDIUM_NUM: Record<Medium, number> = { soil: 0, coco: 1, hydro: 2 }

export interface PotOption { id: string | null, liters: number, price: number, unlock: number, free: number }

/**
 * Pot sizes for a medium. When the catalog sells pots, each size is a stock item used up by sowing and
 * transplanting (`free` = pots in stock). Without pots in the catalog any size works (id null).
 */
export function potOptions(state: Pick<GameState, 'inventory'>, equipment: readonly EquipmentDef[], medium: Medium): PotOption[] {
  const pots = equipment.filter(e => e.slot === 'pot')
  if (!pots.length) return [3, 7, 11, 15, 20].map(liters => ({ id: null, liters, price: 0, unlock: 1, free: Infinity }))
  return pots
    .filter(e => (e.stats.medium ?? 0) === MEDIUM_NUM[medium])
    .map(e => ({ id: e.id, liters: e.stats.liters ?? 0, price: e.price, unlock: e.unlockLevel, free: state.inventory[e.id] ?? 0 }))
    .sort((a, b) => a.liters - b.liters)
}
