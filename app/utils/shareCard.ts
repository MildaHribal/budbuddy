import { GLYPHS, isGlyphName, type GlyphPart } from './glyphs'

export const CARD_W = 1080
export const CARD_H = 1350

export interface ShareCardData {
  name: string
  strain: string
  stageLabel: string
  stageGlyph: string
  stageColor: string
  /** "Day 19 of flowering" */
  stageLine: string
  /** "Age 68 days" etc. */
  facts: string[]
  /** e.g. "96 g dry" */
  harvestLine: string | null
  photoUrl: string | null
}

const FONT = 'Onest, system-ui, sans-serif'

// app palette (main.css tokens), spelled out because canvas cannot read CSS variables
const C = {
  bg: '#0e100f',
  surface: '#1e2220',
  line: '#323835',
  text: '#f2f4f1',
  text2: '#a5ada8',
  green: '#3dd173',
  amber: '#f2b544'
}

async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all([
    document.fonts.load(`600 64px Onest`),
    document.fonts.load(`500 32px Onest`),
    document.fonts.load(`400 32px Onest`)
  ]).catch(() => {})
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Applies an SVG transform list (translate / scale / rotate) to the context.
function applyTransform(ctx: CanvasRenderingContext2D, t: string | undefined) {
  if (!t) return
  for (const [, fn, raw] of t.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = (raw ?? '').trim().split(/[\s,]+/).map(Number)
    if (fn === 'translate') ctx.translate(n[0] ?? 0, n[1] ?? 0)
    else if (fn === 'scale') ctx.scale(n[0] ?? 1, n[1] ?? n[0] ?? 1)
    else if (fn === 'rotate') {
      const [a = 0, cx = 0, cy = 0] = n
      ctx.translate(cx, cy)
      ctx.rotate((a * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }
  }
}

function drawParts(ctx: CanvasRenderingContext2D, parts: GlyphPart[], mode: 'fill' | 'stroke') {
  for (const p of parts) {
    ctx.save()
    applyTransform(ctx, p.t)
    const path = new Path2D(p.d)
    if (mode === 'fill') ctx.fill(path)
    else ctx.stroke(path)
    ctx.restore()
  }
}

function drawGlyph(ctx: CanvasRenderingContext2D, name: string, color: string, cx: number, cy: number, size: number) {
  if (!isGlyphName(name)) return
  const g = GLYPHS[name] as { fill?: GlyphPart[], line: GlyphPart[] }
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.2
  drawParts(ctx, g.fill ?? [], 'fill')
  ctx.globalAlpha = 1
  drawParts(ctx, g.line, 'stroke')
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
}

interface Box { x: number, y: number, w: number, h: number }

async function drawTile(ctx: CanvasRenderingContext2D, tile: Box, photoUrl: string | null, glyph: string, color: string) {
  ctx.save()
  roundRect(ctx, tile.x, tile.y, tile.w, tile.h, 44)
  ctx.clip()
  // drawn onto the canvas and re-encoded, so no EXIF / location survives
  const img = photoUrl ? await loadImage(photoUrl) : null
  if (img) {
    const s = Math.max(tile.w / img.width, tile.h / img.height)
    const w = img.width * s
    const h = img.height * s
    ctx.drawImage(img, tile.x + (tile.w - w) / 2, tile.y + (tile.h - h) / 2, w, h)
  } else {
    ctx.fillStyle = C.surface
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h)
    drawGlyph(ctx, glyph, color, CARD_W / 2, tile.y + tile.h / 2, Math.min(360, tile.h * 0.5))
  }
  ctx.restore()
  ctx.save()
  roundRect(ctx, tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2, 44)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

function drawBrand(ctx: CanvasRenderingContext2D, pad: number) {
  ctx.font = `600 28px ${FONT}`
  ctx.fillStyle = C.green
  ctx.textAlign = 'right'
  ctx.fillText('BudBuddy', CARD_W - pad, CARD_H - 56)
  drawGlyph(ctx, 'vegetative', C.green, CARD_W - pad - ctx.measureText('BudBuddy').width - 30, CARD_H - 66, 34)
  ctx.textAlign = 'left'
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('png encode failed'))), 'image/png')
  })
}

async function setup(): Promise<{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }> {
  await ensureFonts()
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  drawGround(ctx)
  return { canvas, ctx }
}

/** Renders the plant card; resolves with a PNG blob. */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const { canvas, ctx } = await setup()
  const pad = 72
  const tile = { x: pad, y: 120, w: CARD_W - pad * 2, h: 700 }
  await drawTile(ctx, tile, data.photoUrl, data.stageGlyph, data.stageColor)

  // text block
  let y = tile.y + tile.h + 108
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.text
  ctx.font = `600 72px ${FONT}`
  ctx.fillText(fitText(ctx, data.name, CARD_W - pad * 2), pad, y)
  if (data.strain) {
    y += 56
    ctx.font = `400 36px ${FONT}`
    ctx.fillStyle = C.text2
    ctx.fillText(fitText(ctx, data.strain, CARD_W - pad * 2), pad, y)
  }

  y += 84
  ctx.font = `600 38px ${FONT}`
  ctx.fillStyle = data.stageColor
  ctx.fillText(fitText(ctx, data.stageLine, CARD_W - pad * 2), pad, y)

  y += 60
  ctx.font = `400 32px ${FONT}`
  ctx.fillStyle = C.text2
  ctx.fillText(fitText(ctx, data.facts.join('  ·  '), CARD_W - pad * 2), pad, y)

  if (data.harvestLine) {
    y += 72
    ctx.font = `600 48px ${FONT}`
    ctx.fillStyle = C.amber
    ctx.fillText(fitText(ctx, data.harvestLine, CARD_W - pad * 2), pad, y)
  }

  drawBrand(ctx, pad)
  return toPng(canvas)
}

export interface RecapStat {
  value: string
  label: string
  /** lamp-coloured (yield) instead of text colour */
  warm?: boolean
}

export interface RecapCardData {
  /** "Harvest recap" */
  title: string
  name: string
  strain: string
  photoUrl: string | null
  /** 2–4 numbers, e.g. days · trainings · waterings · dry g */
  stats: RecapStat[]
}

/** Harvest recap card: photo, name and a row of big numbers. No dates or location. */
export async function renderRecapCard(data: RecapCardData): Promise<Blob> {
  const { canvas, ctx } = await setup()
  const pad = 72
  const tile = { x: pad, y: 120, w: CARD_W - pad * 2, h: 620 }
  await drawTile(ctx, tile, data.photoUrl, 'harvest', C.amber)

  let y = tile.y + tile.h + 96
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 34px ${FONT}`
  ctx.fillStyle = C.amber
  ctx.fillText(fitText(ctx, data.title, CARD_W - pad * 2), pad, y)

  y += 80
  ctx.fillStyle = C.text
  ctx.font = `600 68px ${FONT}`
  ctx.fillText(fitText(ctx, data.name, CARD_W - pad * 2), pad, y)
  if (data.strain) {
    y += 52
    ctx.font = `400 34px ${FONT}`
    ctx.fillStyle = C.text2
    ctx.fillText(fitText(ctx, data.strain, CARD_W - pad * 2), pad, y)
  }

  // stat row: hairline above, equal columns
  const stats = data.stats.slice(0, 4)
  y += 64
  ctx.fillStyle = C.line
  ctx.fillRect(pad, y, CARD_W - pad * 2, 2)
  const col = (CARD_W - pad * 2) / Math.max(1, stats.length)
  stats.forEach((s, i) => {
    const x = pad + i * col
    // shrink long numbers (e.g. 112.5) before resorting to an ellipsis
    let size = 80
    ctx.font = `600 ${size}px ${FONT}`
    while (size > 48 && ctx.measureText(s.value).width > col - 24) {
      size -= 4
      ctx.font = `600 ${size}px ${FONT}`
    }
    ctx.fillStyle = s.warm ? C.amber : C.text
    ctx.fillText(fitText(ctx, s.value, col - 24), x, y + 112)
    ctx.font = `500 28px ${FONT}`
    ctx.fillStyle = C.text2
    ctx.fillText(fitText(ctx, s.label, col - 24), x, y + 160)
  })

  drawBrand(ctx, pad)
  return toPng(canvas)
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** Canvas helpers shared with the other share images (timelapse, Grow Wrapped, report). */
export const cardKit = { C, FONT, ensureFonts, loadImage, drawGlyph, roundRect, fitText, toPng }
