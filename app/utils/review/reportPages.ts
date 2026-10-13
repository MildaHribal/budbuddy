// Browser-only: draws the printable grow report as A4 canvas pages and packs them into a PDF.
import type { JournalEntry, Plant } from '../../types/grow'
import { daysBetween, formatDate, todayISO } from '../date'
import { entryInfo, entrySummary } from '../entries'
import { formatNumber } from '../locale'
import { cardKit } from '../shareCard'
import { stageInfo } from '../stages'
import { coverSize } from './align'
import type { RunSummary, SeriesPoint } from './compare'
import { buildPdf, type PdfPage } from './pdf'
import { loadFrameImage } from './timelapseVideo'
import type { TimelapseFrame } from './timelapse'

const { FONT, ensureFonts, fitText, roundRect } = cardKit

// A4 at 150 dpi
const W = 1240
const H = 1754
const M = 90

// paper palette: the app is dark, a printed report is not
const P = {
  bg: '#ffffff',
  text: '#121513',
  text2: '#4a524d',
  text3: '#7a827d',
  line: '#dfe3e0',
  well: '#f3f5f3',
  green: '#1c9a52',
  amber: '#b7791f'
}

type T = (key: string, params?: Record<string, string | number>) => string

export interface ReportInput {
  plant: Plant
  entries: JournalEntry[]
  summary: RunSummary
  frames: TimelapseFrame[]
  height: SeriesPoint[]
  ec: SeriesPoint[]
  ph: SeriesPoint[]
  includePhotos: boolean
  t: T
  onProgress?: (fraction: number) => void
}

export interface ReportResult {
  pdf: Blob
  previews: Blob[]
  pages: number
}

function newPage(): { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.fillStyle = P.bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = P.text, weight = 400, max?: number) {
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillStyle = color
  ctx.fillText(max ? fitText(ctx, s, max) : s, x, y)
}

/** Greedy word wrap; the last allowed line gets an ellipsis. */
function wrap(ctx: CanvasRenderingContext2D, s: string, max: number, lines: number): string[] {
  const out: string[] = []
  const words = s.replace(/\s+/g, ' ').trim().split(' ')
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= max) {
      line = next
      continue
    }
    if (line) out.push(line)
    line = w
    if (out.length === lines) break
  }
  if (line && out.length < lines) out.push(line)
  if (out.length > lines || (out.length === lines && words.join(' ').length > out.join(' ').length)) {
    out.length = lines
    out[lines - 1] = fitText(ctx, `${out[lines - 1]}…`, max)
  }
  return out
}

function hr(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = P.line
  ctx.fillRect(M, y, W - M * 2, 2)
}

function sectionTitle(ctx: CanvasRenderingContext2D, s: string, y: number) {
  text(ctx, s, M, y, 30, P.text, 600)
}

function drawChart(ctx: CanvasRenderingContext2D, box: { x: number, y: number, w: number, h: number }, points: SeriesPoint[], maxDay: number, color: string, title: string, unit: string, empty: string) {
  text(ctx, title, box.x, box.y + 26, 24, P.text, 600)
  const top = box.y + 50
  const h = box.h - 50 - 34
  const left = box.x + 56
  const w = box.w - 56
  ctx.fillStyle = P.well
  roundRect(ctx, box.x, top - 10, box.w, h + 20, 16)
  ctx.fill()
  if (!points.length) {
    text(ctx, empty, box.x + 24, top + h / 2 + 8, 22, P.text3)
    return
  }
  const values = points.map(p => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (max - min < 0.5) {
    min -= 0.5
    max += 0.5
  }
  const pad = (max - min) * 0.1
  min = Math.max(0, min - pad)
  max += pad
  const x = (d: number) => left + (maxDay <= 0 ? w / 2 : (d / maxDay) * (w - 16))
  const y = (v: number) => top + h - ((v - min) / (max - min)) * h
  ctx.font = `400 18px ${FONT}`
  ctx.fillStyle = P.text3
  ctx.textAlign = 'right'
  for (const v of [min, (min + max) / 2, max]) {
    ctx.fillText(formatNumber(v, 1), left - 10, y(v) + 6)
    ctx.fillStyle = P.line
    ctx.fillRect(left, Math.round(y(v)), w - 16, 1)
    ctx.fillStyle = P.text3
  }
  ctx.textAlign = 'left'
  ctx.fillText(`0`, left, top + h + 30)
  ctx.textAlign = 'right'
  ctx.fillText(`${maxDay} ${unit}`, left + w - 16, top + h + 30)
  ctx.textAlign = 'left'
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((p, i) => (i ? ctx.lineTo(x(p.day), y(p.value)) : ctx.moveTo(x(p.day), y(p.value))))
  ctx.stroke()
  ctx.fillStyle = color
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(x(p.day), y(p.value), 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function footer(ctx: CanvasRenderingContext2D, page: number, total: number, t: T, generated: string) {
  hr(ctx, H - 92)
  text(ctx, `BudBuddy · ${t('review.report.generated', { date: generated })}`, M, H - 52, 20, P.text3)
  ctx.textAlign = 'right'
  text(ctx, t('review.report.pageOf', { a: page, b: total }), W - M, H - 52, 20, P.text3)
  ctx.textAlign = 'left'
}

function summaryPage(input: ReportInput) {
  const { plant: p, summary: s, t } = input
  const { canvas, ctx } = newPage()
  let y = M + 10
  text(ctx, t('review.report.kicker'), M, y, 24, P.green, 600)
  y += 76
  text(ctx, p.name, M, y, 64, P.text, 600, W - M * 2)
  y += 50
  text(ctx, p.strain || t('review.common.unknownStrain'), M, y, 30, P.text2, 400, W - M * 2)

  // facts: 4 columns × 2 rows
  y += 60
  hr(ctx, y)
  const facts: [string, string][] = [
    [t('review.report.facts.type'), t(`review.report.types.${p.type}`)],
    [t('review.report.facts.medium'), t(`review.report.media.${p.medium}`)],
    [t('review.report.facts.location'), t(`review.report.locations.${p.location}`)],
    [t('review.report.facts.pot'), p.potSize || '–'],
    [t('review.report.facts.started'), formatDate(p.startDate)],
    [t('review.report.facts.length'), t('review.common.days', { n: s.length + 1 })],
    [t('review.report.facts.stage'), stageInfo(p.stage).label],
    [t('review.report.facts.harvested'), p.harvest ? formatDate(p.harvest.date) : '–']
  ]
  const colW = (W - M * 2) / 4
  facts.forEach(([label, value], i) => {
    const cx = M + (i % 4) * colW
    const cy = y + 54 + Math.floor(i / 4) * 96
    text(ctx, label, cx, cy, 20, P.text3)
    text(ctx, value, cx, cy + 38, 28, P.text, 600, colW - 20)
  })
  y += 54 + 96 * 2 - 20
  hr(ctx, y)

  // stage timeline
  y += 70
  sectionTitle(ctx, t('review.report.stages'), y)
  y += 30
  const total = Math.max(1, s.length + 1)
  const barW = W - M * 2
  for (const seg of s.segments) {
    const x0 = M + (seg.from / total) * barW
    const x1 = M + (Math.min(total, seg.to) / total) * barW
    ctx.fillStyle = stageInfo(seg.stage).color
    roundRect(ctx, x0 + 1, y, Math.max(4, x1 - x0 - 2), 40, 8)
    ctx.fill()
  }
  y += 40
  let labelX = -Infinity
  for (const seg of s.segments) {
    const x0 = M + (seg.from / total) * barW
    if (x0 < labelX + 10) continue
    const info = stageInfo(seg.stage)
    ctx.font = `600 20px ${FONT}`
    const label = `${info.short} · ${seg.to - seg.from}`
    text(ctx, label, x0, y + 34, 20, P.text2, 600)
    text(ctx, `${t('review.report.dayShort')} ${seg.from}`, x0, y + 60, 18, P.text3)
    labelX = x0 + Math.max(ctx.measureText(label).width, 80)
  }

  // numbers
  y += 130
  sectionTitle(ctx, t('review.report.numbers'), y)
  y += 26
  const nums: [string, string][] = [
    [t('review.report.n.waterings'), String(s.waterings)],
    [t('review.report.n.feeds'), String(s.feeds)],
    [t('review.report.n.trainings'), String(s.trainings)],
    [t('review.report.n.water'), `${formatNumber(s.waterLitres, 1)} L`],
    [t('review.report.n.ec'), s.avgEc != null ? formatNumber(s.avgEc, 2) : '–'],
    [t('review.report.n.ph'), s.avgPh != null ? formatNumber(s.avgPh, 2) : '–'],
    [t('review.report.n.height'), s.maxHeight != null ? `${formatNumber(s.maxHeight, 1)} cm` : '–'],
    [t('review.report.n.photos'), String(s.photos)]
  ]
  const tileW = (W - M * 2 - 3 * 20) / 4
  nums.forEach(([label, value], i) => {
    const tx = M + (i % 4) * (tileW + 20)
    const ty = y + Math.floor(i / 4) * 128
    ctx.fillStyle = P.well
    roundRect(ctx, tx, ty, tileW, 108, 16)
    ctx.fill()
    text(ctx, value, tx + 22, ty + 52, 36, P.text, 600, tileW - 40)
    text(ctx, label, tx + 22, ty + 86, 20, P.text2, 400, tileW - 40)
  })
  y += 128 * 2 + 30

  // harvest
  if (p.harvest) {
    sectionTitle(ctx, t('review.report.harvest'), y)
    y += 54
    const h = p.harvest
    const ratio = h.wetWeight && h.dryWeight ? Math.round((h.dryWeight / h.wetWeight) * 100) : null
    const items = [
      `${t('review.report.wet')}: ${h.wetWeight != null ? `${formatNumber(h.wetWeight, 1)} g` : '–'}`,
      `${t('review.report.dry')}: ${h.dryWeight != null ? `${formatNumber(h.dryWeight, 1)} g` : '–'}`,
      ratio != null ? t('review.report.ratio', { p: ratio }) : null
    ].filter(Boolean).join('   ·   ')
    text(ctx, items, M, y, 30, P.amber, 600, W - M * 2)
    y += 40
    if (h.notes) {
      ctx.font = `400 22px ${FONT}`
      for (const line of wrap(ctx, h.notes, W - M * 2, 2)) {
        y += 32
        text(ctx, line, M, y, 22, P.text2)
      }
    }
    y += 50
  }

  // charts
  const remaining = H - 120 - y
  const chartH = Math.min(300, Math.floor((remaining - 40) / 2))
  if (chartH >= 220) {
    drawChart(ctx, { x: M, y, w: W - M * 2, h: chartH }, input.height, total - 1, P.green, t('review.report.heightChart'), t('review.report.dayUnit'), t('review.report.noData'))
    y += chartH + 30
    const half = (W - M * 2 - 30) / 2
    drawChart(ctx, { x: M, y, w: half, h: chartH }, input.ec, total - 1, '#7c4fd6', t('review.report.ecChart'), t('review.report.dayUnit'), t('review.report.noData'))
    drawChart(ctx, { x: M + half + 30, y, w: half, h: chartH }, input.ph, total - 1, '#2b86c5', t('review.report.phChart'), t('review.report.dayUnit'), t('review.report.noData'))
  } else {
    const half = (W - M * 2 - 30) / 2
    const h = Math.max(220, Math.min(chartH, remaining - 20))
    drawChart(ctx, { x: M, y, w: half, h }, input.height, total - 1, P.green, t('review.report.heightChart'), t('review.report.dayUnit'), t('review.report.noData'))
    drawChart(ctx, { x: M + half + 30, y, w: half, h }, input.ec, total - 1, '#7c4fd6', t('review.report.ecChart'), t('review.report.dayUnit'), t('review.report.noData'))
  }
  return { canvas, ctx }
}

async function photoPages(input: ReportInput) {
  const { frames, t } = input
  const pages: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }[] = []
  const cols = 3
  const rows = 4
  const gap = 24
  const cellW = (W - M * 2 - gap * (cols - 1)) / cols
  const cellH = cellW * 1.25
  const per = cols * rows
  for (let start = 0; start < frames.length; start += per) {
    const page = newPage()
    const { ctx } = page
    sectionTitle(ctx, start ? t('review.report.photosMore') : t('review.report.photos'), M + 30)
    for (let i = 0; i < per && start + i < frames.length; i++) {
      const f = frames[start + i]!
      const x = M + (i % cols) * (cellW + gap)
      const y = M + 70 + Math.floor(i / cols) * (cellH + 70)
      ctx.save()
      roundRect(ctx, x, y, cellW, cellH, 14)
      ctx.clip()
      ctx.fillStyle = P.well
      ctx.fillRect(x, y, cellW, cellH)
      const img = await loadFrameImage(f.photoId, 'thumb')
      if (img) {
        const s = coverSize(img.width, img.height, cellW, cellH)
        ctx.drawImage(img, x + (cellW - s.w) / 2, y + (cellH - s.h) / 2, s.w, s.h)
      }
      ctx.restore()
      text(ctx, `${t('review.report.dayShort')} ${f.day} · ${stageInfo(f.stage).label}`, x, y + cellH + 32, 20, P.text, 600, cellW)
      text(ctx, formatDate(f.date), x, y + cellH + 58, 18, P.text3, 400, cellW)
      input.onProgress?.(0.2 + 0.6 * ((start + i + 1) / frames.length))
    }
    pages.push(page)
  }
  return pages
}

function journalPages(input: ReportInput) {
  const { entries, plant, t } = input
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  const pages: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }[] = []
  const cols = { date: M, day: M + 200, type: M + 290, details: M + 500 }
  const detailsW = W - M - cols.details
  let page = newPage()
  let y = 0
  const head = (first: boolean) => {
    sectionTitle(page.ctx, first ? t('review.report.journal') : t('review.report.journalMore'), M + 30)
    y = M + 90
    for (const [k, x] of Object.entries(cols)) text(page.ctx, t(`review.report.cols.${k}`), x, y, 20, P.text3, 600)
    y += 18
    hr(page.ctx, y)
  }
  head(true)
  if (!sorted.length) text(page.ctx, t('review.report.noEntries'), M, y + 50, 24, P.text3)
  for (const e of sorted) {
    const info = entryInfo(e.type)
    const details = [e.type === 'stage' && e.stage ? stageInfo(e.stage).label : '', entrySummary(e), e.note].filter(Boolean).join(' · ')
    page.ctx.font = `400 22px ${FONT}`
    const lines = details ? wrap(page.ctx, details, detailsW, 3) : ['–']
    const rowH = 22 + lines.length * 32
    if (y + rowH > H - 130) {
      pages.push(page)
      page = newPage()
      head(false)
    }
    const base = y + 40
    text(page.ctx, formatDate(e.date, { day: 'numeric', month: 'short', year: '2-digit' }), cols.date, base, 22, P.text)
    text(page.ctx, String(Math.max(0, daysBetween(plant.startDate, e.date))), cols.day, base, 22, P.text2)
    page.ctx.fillStyle = info.color
    page.ctx.beginPath()
    page.ctx.arc(cols.type + 7, base - 7, 7, 0, Math.PI * 2)
    page.ctx.fill()
    text(page.ctx, info.label, cols.type + 24, base, 22, P.text, 600, cols.details - cols.type - 40)
    lines.forEach((l, i) => text(page.ctx, l, cols.details, base + i * 32, 22, P.text2))
    y += rowH
    page.ctx.fillStyle = P.line
    page.ctx.fillRect(M, y + 8, W - M * 2, 1)
    y += 8
  }
  pages.push(page)
  return pages
}

function jpeg(canvas: HTMLCanvasElement, quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('jpeg encode failed'))), 'image/jpeg', quality))
}

export async function renderReport(input: ReportInput): Promise<ReportResult> {
  await ensureFonts()
  const generated = formatDate(todayISO())
  const pages = [summaryPage(input)]
  input.onProgress?.(0.2)
  if (input.includePhotos && input.frames.length) pages.push(...await photoPages(input))
  pages.push(...journalPages(input))
  input.onProgress?.(0.85)
  pages.forEach((p, i) => footer(p.ctx, i + 1, pages.length, input.t, generated))
  const pdfPages: PdfPage[] = []
  const previews: Blob[] = []
  for (const p of pages) {
    const blob = await jpeg(p.canvas)
    pdfPages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: W, height: H })
    previews.push(blob)
  }
  const pdf = buildPdf(pdfPages, { title: `${input.plant.name} – ${input.t('review.report.kicker')}` })
  input.onProgress?.(1)
  return { pdf: new Blob([pdf], { type: 'application/pdf' }), previews, pages: pages.length }
}
