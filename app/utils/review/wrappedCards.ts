// Browser-only: Grow Wrapped story cards (1080×1920 PNG), drawn like the plant share card.
import { formatDate } from '../date'
import { entryInfo } from '../entries'
import { formatNumber } from '../locale'
import { cardKit } from '../shareCard'
import { coverSize } from './align'
import { loadFrameImage } from './timelapseVideo'
import type { WrappedStats } from './wrapped'

const { C, FONT, ensureFonts, fitText, roundRect, drawGlyph, toPng } = cardKit

export const STORY_W = 1080
export const STORY_H = 1920
const PAD = 88

type T = (key: string, params?: Record<string, string | number>) => string

export type WrappedCardId = 'intro' | 'harvest' | 'actions' | 'photo' | 'streak' | 'summary'

export interface WrappedCard {
  id: WrappedCardId
  blob: Blob
}

export interface WrappedInput {
  stats: WrappedStats
  /** "2026" or "All time" */
  periodLabel: string
  /** photo for the photo card (null = skip the card) */
  photo: { photoId: string, caption: string } | null
  t: T
}

function setup() {
  const canvas = document.createElement('canvas')
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, STORY_W, STORY_H)
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 600, max = STORY_W - PAD * 2) {
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillStyle = color
  ctx.fillText(fitText(ctx, s, max), x, y)
}

/** Big number that shrinks until it fits. */
function hero(ctx: CanvasRenderingContext2D, s: string, y: number, color: string, start = 260) {
  let size = start
  ctx.font = `600 ${size}px ${FONT}`
  while (size > 96 && ctx.measureText(s).width > STORY_W - PAD * 2) {
    size -= 8
    ctx.font = `600 ${size}px ${FONT}`
  }
  ctx.fillStyle = color
  ctx.fillText(s, PAD - size * 0.04, y)
  return size
}

function chrome(ctx: CanvasRenderingContext2D, input: WrappedInput, index: number, total: number) {
  text(ctx, `${input.t('review.wrapped.brandTitle')} · ${input.periodLabel}`, PAD, PAD + 40, 34, C.green)
  // progress ticks like a story
  const gap = 10
  const w = (STORY_W - PAD * 2 - gap * (total - 1)) / total
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i <= index ? C.text : C.line
    roundRect(ctx, PAD + i * (w + gap), PAD - 34, w, 6, 3)
    ctx.fill()
  }
  ctx.font = `600 30px ${FONT}`
  ctx.fillStyle = C.green
  ctx.textAlign = 'right'
  ctx.fillText('BudBuddy', STORY_W - PAD, STORY_H - PAD)
  const bw = ctx.measureText('BudBuddy').width
  ctx.textAlign = 'left'
  drawGlyph(ctx, 'vegetative', C.green, STORY_W - PAD - bw - 32, STORY_H - PAD - 11, 36)
}

function statRow(ctx: CanvasRenderingContext2D, y: number, items: { value: string, label: string, warm?: boolean }[]) {
  ctx.fillStyle = C.line
  ctx.fillRect(PAD, y, STORY_W - PAD * 2, 2)
  const col = (STORY_W - PAD * 2) / items.length
  items.forEach((s, i) => {
    const x = PAD + i * col
    let size = 84
    ctx.font = `600 ${size}px ${FONT}`
    while (size > 48 && ctx.measureText(s.value).width > col - 24) {
      size -= 4
      ctx.font = `600 ${size}px ${FONT}`
    }
    ctx.fillStyle = s.warm ? C.amber : C.text
    ctx.fillText(fitText(ctx, s.value, col - 24), x, y + 120)
    text(ctx, s.label, x, y + 172, 30, C.text2, 500, col - 24)
  })
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = C.surface
  roundRect(ctx, x, y, w, h, 40)
  ctx.fill()
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 40)
  ctx.stroke()
}

const g = (v: number) => `${formatNumber(v, 1)} g`

function intro(ctx: CanvasRenderingContext2D, { stats: s, t }: WrappedInput) {
  text(ctx, t('review.wrapped.intro.title'), PAD, 520, 64, C.text)
  hero(ctx, String(s.seasonDays), 800, C.green)
  text(ctx, t('review.wrapped.intro.days', { n: s.seasonDays }), PAD, 900, 56, C.text)
  text(ctx, t('review.wrapped.intro.range', { from: formatDate(s.firstDate), to: formatDate(s.lastDate) }), PAD, 976, 36, C.text2, 400)
  statRow(ctx, 1180, [
    { value: String(s.plants), label: t('review.wrapped.plants', { n: s.plants }) },
    { value: String(s.entries), label: t('review.wrapped.entries', { n: s.entries }) },
    { value: String(s.activeDays), label: t('review.wrapped.activeDays', { n: s.activeDays }) }
  ])
}

function harvest({ stats: s, t }: WrappedInput, ctx: CanvasRenderingContext2D) {
  text(ctx, t('review.wrapped.harvest.title'), PAD, 520, 64, C.text)
  if (s.dryGrams != null) {
    hero(ctx, g(s.dryGrams), 800, C.amber)
    text(ctx, t('review.wrapped.harvest.dry', { n: s.harvestedPlants }), PAD, 900, 48, C.text)
    if (s.wetGrams != null) text(ctx, t('review.wrapped.harvest.wet', { g: g(s.wetGrams) }), PAD, 970, 36, C.text2, 400)
  } else {
    hero(ctx, String(s.harvestedPlants), 800, C.amber)
    text(ctx, t('review.wrapped.harvest.count', { n: s.harvestedPlants }), PAD, 900, 48, C.text)
    text(ctx, t('review.wrapped.harvest.noWeight'), PAD, 970, 36, C.text2, 400)
  }
  if (s.bestPlant) {
    const y = 1140
    box(ctx, PAD, y, STORY_W - PAD * 2, 300)
    drawGlyph(ctx, 'harvest', C.amber, PAD + 110, y + 150, 110)
    text(ctx, t('review.wrapped.harvest.best'), PAD + 210, y + 100, 32, C.text2, 500, STORY_W - PAD * 2 - 260)
    text(ctx, s.bestPlant.name, PAD + 210, y + 170, 56, C.text, 600, STORY_W - PAD * 2 - 260)
    text(ctx, [g(s.bestPlant.dry), s.bestPlant.strain].filter(Boolean).join(' · '), PAD + 210, y + 232, 36, C.amber, 600, STORY_W - PAD * 2 - 260)
  }
}

function actions({ stats: s, t }: WrappedInput, ctx: CanvasRenderingContext2D) {
  const top = s.topAction!
  const info = entryInfo(top.type)
  text(ctx, t('review.wrapped.actions.title'), PAD, 440, 64, C.text)
  drawGlyph(ctx, info.glyph, info.color, PAD + 110, 620, 220)
  hero(ctx, `${top.count}×`, 920, info.color, 220)
  text(ctx, t(`review.wrapped.actions.top.${top.type}`), PAD, 1010, 52, C.text)
  const list = s.actions.slice(0, 5)
  const max = Math.max(1, ...list.map(a => a.count))
  let y = 1130
  for (const a of list) {
    const ai = entryInfo(a.type)
    text(ctx, ai.label, PAD, y, 34, C.text, 600, 300)
    const bx = PAD + 330
    const bw = STORY_W - PAD - bx - 110
    ctx.fillStyle = C.line
    roundRect(ctx, bx, y - 26, bw, 24, 12)
    ctx.fill()
    ctx.fillStyle = ai.color
    roundRect(ctx, bx, y - 26, Math.max(24, (a.count / max) * bw), 24, 12)
    ctx.fill()
    ctx.textAlign = 'right'
    text(ctx, String(a.count), STORY_W - PAD, y, 34, C.text2, 600, 100)
    ctx.textAlign = 'left'
    y += 86
  }
  if (s.waterLitres > 0) text(ctx, t('review.wrapped.actions.litres', { l: formatNumber(s.waterLitres, 1) }), PAD, y + 50, 38, '#5fb4ee', 600)
}

async function photo(input: WrappedInput, ctx: CanvasRenderingContext2D) {
  const { stats: s, t } = input
  const tile = { x: PAD, y: 220, w: STORY_W - PAD * 2, h: 1180 }
  ctx.save()
  roundRect(ctx, tile.x, tile.y, tile.w, tile.h, 44)
  ctx.clip()
  ctx.fillStyle = C.surface
  ctx.fillRect(tile.x, tile.y, tile.w, tile.h)
  const img = input.photo ? await loadFrameImage(input.photo.photoId, 'full') : null
  if (img) {
    const c = coverSize(img.width, img.height, tile.w, tile.h)
    ctx.drawImage(img, tile.x + (tile.w - c.w) / 2, tile.y + (tile.h - c.h) / 2, c.w, c.h)
  } else {
    drawGlyph(ctx, 'photo', C.text2, STORY_W / 2, tile.y + tile.h / 2, 300)
  }
  ctx.restore()
  text(ctx, t('review.wrapped.photo.title'), PAD, 1520, 60, C.text)
  if (input.photo) text(ctx, input.photo.caption, PAD, 1590, 36, C.text2, 400)
  text(ctx, t('review.wrapped.photo.count', { n: s.photos }), PAD, 1660, 36, '#8ea6f5', 600)
}

function streak({ stats: s, t }: WrappedInput, ctx: CanvasRenderingContext2D) {
  text(ctx, t('review.wrapped.streak.title'), PAD, 520, 64, C.text)
  hero(ctx, String(s.longestStreak), 800, C.green)
  text(ctx, t('review.wrapped.streak.days', { n: s.longestStreak }), PAD, 900, 56, C.text)
  if (s.streakEnd) text(ctx, t('review.wrapped.streak.ended', { date: formatDate(s.streakEnd) }), PAD, 970, 36, C.text2, 400)
  const rows: string[] = [t('review.wrapped.streak.active', { n: s.activeDays })]
  if (s.busiestWeekday != null) rows.push(t('review.wrapped.streak.weekday', { day: t(`review.wrapped.weekdays.d${s.busiestWeekday}`) }))
  if (s.mostLogged) rows.push(t('review.wrapped.streak.mostLogged', { name: s.mostLogged.name, n: s.mostLogged.entries }))
  let y = 1160
  for (const r of rows) {
    box(ctx, PAD, y, STORY_W - PAD * 2, 128)
    text(ctx, r, PAD + 44, y + 80, 38, C.text, 500, STORY_W - PAD * 2 - 88)
    y += 152
  }
}

function summary({ stats: s, t, periodLabel }: WrappedInput, ctx: CanvasRenderingContext2D) {
  text(ctx, t('review.wrapped.summary.title', { period: periodLabel }), PAD, 440, 64, C.text)
  const tiles: { value: string, label: string, color: string }[] = [
    { value: String(s.seasonDays), label: t('review.wrapped.summary.days'), color: C.text },
    { value: String(s.plants), label: t('review.wrapped.summary.plants'), color: C.text },
    { value: s.dryGrams != null ? g(s.dryGrams) : '–', label: t('review.wrapped.summary.dry'), color: C.amber },
    { value: String(s.entries), label: t('review.wrapped.summary.entries'), color: C.text },
    { value: String(s.photos), label: t('review.wrapped.summary.photos'), color: C.text },
    { value: String(s.longestStreak), label: t('review.wrapped.summary.streak'), color: C.green }
  ]
  const gap = 32
  const w = (STORY_W - PAD * 2 - gap) / 2
  const h = 280
  tiles.forEach((tile, i) => {
    const x = PAD + (i % 2) * (w + gap)
    const y = 540 + Math.floor(i / 2) * (h + gap)
    box(ctx, x, y, w, h)
    let size = 104
    ctx.font = `600 ${size}px ${FONT}`
    while (size > 56 && ctx.measureText(tile.value).width > w - 80) {
      size -= 4
      ctx.font = `600 ${size}px ${FONT}`
    }
    ctx.fillStyle = tile.color
    ctx.fillText(tile.value, x + 40, y + 150)
    text(ctx, tile.label, x + 40, y + 216, 32, C.text2, 500, w - 80)
  })
  text(ctx, t('review.wrapped.summary.made'), PAD, 1560, 36, C.text2, 400)
}

export function wrappedCardIds(input: Pick<WrappedInput, 'stats' | 'photo'>): WrappedCardId[] {
  const ids: WrappedCardId[] = ['intro']
  if (input.stats.harvestedPlants > 0) ids.push('harvest')
  if (input.stats.topAction) ids.push('actions')
  if (input.photo) ids.push('photo')
  if (input.stats.longestStreak > 1) ids.push('streak')
  ids.push('summary')
  return ids
}

export async function renderWrappedCard(input: WrappedInput, id: WrappedCardId, index: number, total: number): Promise<Blob> {
  await ensureFonts()
  const { canvas, ctx } = setup()
  chrome(ctx, input, index, total)
  if (id === 'intro') intro(ctx, input)
  else if (id === 'harvest') harvest(input, ctx)
  else if (id === 'actions') actions(input, ctx)
  else if (id === 'photo') await photo(input, ctx)
  else if (id === 'streak') streak(input, ctx)
  else summary(input, ctx)
  return toPng(canvas)
}
