// Draws A4 sheets of plant labels (QR + text) on canvas and packs them into a PDF.
import QRCode from 'qrcode'
import { buildJpegPdf, type PdfPage } from './jpegPdf'
import { paginateLabels, plantLink, type LabelLayout } from './qr'

export interface LabelItem {
  id: string
  name: string
  /** second line, e.g. the strain */
  sub: string
  /** small third line, e.g. start date and tent */
  meta: string
}

const PX_PER_MM = 200 / 25.4
const PAGE = { w: 210, h: 297 }
const MARGIN = 10
const GAP = 2

export function cellSize(layout: LabelLayout) {
  return {
    w: (PAGE.w - 2 * MARGIN - (layout.cols - 1) * GAP) / layout.cols,
    h: (PAGE.h - 2 * MARGIN - (layout.rows - 1) * GAP) / layout.rows
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

/** Word-wraps into at most `lines` lines, the last one ellipsized. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number): string[] {
  const out: string[] = []
  let rest = text.trim()
  while (rest && out.length < lines - 1) {
    const words = rest.split(/\s+/)
    let line = ''
    while (words.length && ctx.measureText(line ? `${line} ${words[0]}` : words[0]!).width <= max) line = line ? `${line} ${words.shift()}` : words.shift()!
    if (!line) break
    out.push(line)
    rest = words.join(' ')
  }
  if (rest) out.push(ellipsize(ctx, rest, max))
  return out
}

function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  // whole-pixel modules keep every module the same size, which scanners need
  const cell = Math.max(1, Math.floor(size / n))
  const x0 = Math.round(x + (size - cell * n) / 2)
  const y0 = Math.round(y + (size - cell * n) / 2)
  ctx.fillStyle = '#000'
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctx.fillRect(x0 + c * cell, y0 + r * cell, cell, cell)
    }
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, item: LabelItem, x: number, y: number, w: number, h: number) {
  const mm = (v: number) => v * PX_PER_MM
  ctx.strokeStyle = '#c8c8c8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(mm(x), mm(y), mm(w), mm(h), mm(2.5))
  ctx.stroke()

  const pad = 4
  const qr = Math.min(h - 2 * pad, w * 0.48)
  drawQr(ctx, plantLink(item.id), mm(x + pad), mm(y + (h - qr) / 2), mm(qr))

  const tx = x + pad + qr + 3
  const tw = w - (tx - x) - pad
  const big = Math.min(5.2, h / 8)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'top'
  let ty = y + pad
  ctx.font = `600 ${mm(big)}px Onest, system-ui, sans-serif`
  for (const line of wrap(ctx, item.name, mm(tw), 2)) {
    ctx.fillText(line, mm(tx), mm(ty))
    ty += big * 1.2
  }
  ty += big * 0.15
  ctx.font = `400 ${mm(big * 0.72)}px Onest, system-ui, sans-serif`
  ctx.fillStyle = '#333'
  if (item.sub) {
    ctx.fillText(ellipsize(ctx, item.sub, mm(tw)), mm(tx), mm(ty))
    ty += big * 1.05
  }
  ctx.fillStyle = '#666'
  ctx.font = `400 ${mm(big * 0.6)}px Onest, system-ui, sans-serif`
  for (const line of item.meta.split('\n').filter(Boolean)) {
    if (ty + big * 0.6 > y + h - pad) break
    ctx.fillText(ellipsize(ctx, line, mm(tw)), mm(tx), mm(ty))
    ty += big * 0.85
  }
  ctx.fillStyle = '#999'
  ctx.font = `600 ${mm(big * 0.5)}px Onest, system-ui, sans-serif`
  ctx.textBaseline = 'bottom'
  ctx.fillText('BudBuddy', mm(tx), mm(y + h - pad))
}

async function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) throw new Error('canvas export failed')
  return new Uint8Array(await blob.arrayBuffer())
}

export async function buildLabelPdf(items: LabelItem[], layout: LabelLayout): Promise<Blob> {
  await document.fonts?.load(`600 40px Onest`).catch(() => {})
  const { w, h } = cellSize(layout)
  const per = layout.cols * layout.rows
  const pages: PdfPage[] = []
  for (const group of paginateLabels(items, per)) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(PAGE.w * PX_PER_MM)
    canvas.height = Math.round(PAGE.h * PX_PER_MM)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    group.forEach((item, i) => {
      const col = i % layout.cols
      const row = Math.floor(i / layout.cols)
      drawLabel(ctx, item, MARGIN + col * (w + GAP), MARGIN + row * (h + GAP), w, h)
    })
    pages.push({ jpeg: await canvasJpeg(canvas), width: canvas.width, height: canvas.height })
    canvas.width = 0
  }
  return buildJpegPdf(pages)
}

/** SVG markup of a label QR for on-screen previews. */
export function qrSvg(id: string): Promise<string> {
  return QRCode.toString(plantLink(id), { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#000000', light: '#ffffff' } })
}
