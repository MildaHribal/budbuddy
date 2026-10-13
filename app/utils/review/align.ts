import type { PhotoAlign } from '../../types/grow'

export const IDENTITY: PhotoAlign = Object.freeze({ x: 0, y: 0, scale: 1, rotate: 0 })

/** Timelapse frames, the ghost editor and exports all use this aspect (4:5). */
export const FRAME_ASPECT = 4 / 5

export const ALIGN_LIMITS = { offset: 0.5, scaleMin: 0.5, scaleMax: 2.5, rotate: 30 } as const

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const finite = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const round = (v: number) => Math.round(v * 10000) / 10000

export function clampAlign(a: Partial<PhotoAlign>): PhotoAlign {
  const L = ALIGN_LIMITS
  return {
    x: round(clamp(finite(a.x, 0), -L.offset, L.offset)),
    y: round(clamp(finite(a.y, 0), -L.offset, L.offset)),
    scale: round(clamp(finite(a.scale, 1), L.scaleMin, L.scaleMax)),
    rotate: round(clamp(finite(a.rotate, 0), -L.rotate, L.rotate))
  }
}

export function isIdentity(a: PhotoAlign | null | undefined): boolean {
  return !a || (Math.abs(a.x) < 1e-4 && Math.abs(a.y) < 1e-4 && Math.abs(a.scale - 1) < 1e-4 && Math.abs(a.rotate) < 1e-4)
}

export function normalizeAlign(raw: unknown): PhotoAlign | null {
  if (!raw || typeof raw !== 'object') return null
  const a = clampAlign(raw as Partial<PhotoAlign>)
  return isIdentity(a) ? null : a
}

/** Keeps only valid, non-identity transforms of photos the entry still has. */
export function normalizeAlignMap(raw: unknown, photoIds: unknown): { align?: Record<string, PhotoAlign> } {
  if (!raw || typeof raw !== 'object') return {}
  const ids = new Set(Array.isArray(photoIds) ? photoIds.filter(p => typeof p === 'string') : [])
  const out: Record<string, PhotoAlign> = {}
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ids.has(id)) continue
    const a = normalizeAlign(v)
    if (a) out[id] = a
  }
  return Object.keys(out).length ? { align: out } : {}
}

/** Size the image is drawn at when it covers a w×h frame. */
export function coverSize(iw: number, ih: number, w: number, h: number): { w: number, h: number } {
  const s = Math.max(w / iw, h / ih)
  return { w: iw * s, h: ih * s }
}

type Drawable = CanvasImageSource & { width: number, height: number }

/** Draws `img` covering the frame, then moved / scaled / rotated around the frame centre. */
export function drawAligned(ctx: CanvasRenderingContext2D, img: Drawable, w: number, h: number, align: PhotoAlign = IDENTITY, x0 = 0, y0 = 0) {
  const iw = (img as HTMLVideoElement).videoWidth || img.width
  const ih = (img as HTMLVideoElement).videoHeight || img.height
  if (!iw || !ih) return
  const size = coverSize(iw, ih, w, h)
  ctx.save()
  ctx.translate(x0 + w / 2 + align.x * w, y0 + h / 2 + align.y * h)
  ctx.rotate((align.rotate * Math.PI) / 180)
  ctx.scale(align.scale, align.scale)
  ctx.drawImage(img, -size.w / 2, -size.h / 2, size.w, size.h)
  ctx.restore()
}

/** CSS transform equivalent of drawAligned for an element already covering the frame. */
export function alignCss(a: PhotoAlign, frameW: number, frameH: number): string {
  return `translate(${(a.x * frameW).toFixed(2)}px, ${(a.y * frameH).toFixed(2)}px) rotate(${a.rotate}deg) scale(${a.scale})`
}

export function withoutKey<T>(map: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(map).filter(([k]) => k !== key))
}
