// Browser-only: draws timelapse frames and encodes them (MP4/WebM via WebCodecs, GIF as a fallback).
import type { PhotoAlign } from '../../types/grow'
import { photoUrl, type PhotoSize } from '../../composables/useUi'
import { cardKit } from '../shareCard'
import { drawAligned } from './align'
import { videoSteps, type TimelapseFrame } from './timelapse'

export interface FrameLabel {
  /** "Day 34" */
  day: string
  /** "Vegetative" */
  stage: string
  stageColor: string
  /** "3 May 2026" */
  date: string
  /** plant name, top left */
  title: string
}

export type LoadedImage = HTMLImageElement

const { C, FONT, fitText, loadImage, roundRect } = cardKit

export async function loadFrameImage(photoId: string, size: PhotoSize): Promise<LoadedImage | null> {
  const url = await photoUrl(photoId, size)
  if (!url) return null
  const img = await loadImage(url)
  if (img) await img.decode().catch(() => {})
  return img
}

export function drawLabel(ctx: CanvasRenderingContext2D, w: number, h: number, label: FrameLabel) {
  const u = w / 1080
  const pad = 40 * u
  ctx.save()
  ctx.textBaseline = 'middle'
  // title chip, top left
  if (label.title) {
    ctx.font = `600 ${30 * u}px ${FONT}`
    const text = fitText(ctx, label.title, w - pad * 4)
    const tw = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(14, 16, 15, 0.72)'
    roundRect(ctx, pad, pad, tw + 40 * u, 60 * u, 30 * u)
    ctx.fill()
    ctx.fillStyle = C.text
    ctx.fillText(text, pad + 20 * u, pad + 31 * u)
  }
  // day / stage / date card, bottom left
  const boxH = 148 * u
  const y = h - pad - boxH
  ctx.font = `600 ${64 * u}px ${FONT}`
  const dayW = ctx.measureText(label.day).width
  ctx.font = `600 ${32 * u}px ${FONT}`
  const stageW = ctx.measureText(label.stage).width
  ctx.font = `400 ${28 * u}px ${FONT}`
  const dateW = ctx.measureText(label.date).width
  const boxW = Math.min(w - pad * 2, Math.max(dayW, stageW + 40 * u + dateW) + 56 * u)
  ctx.fillStyle = 'rgba(14, 16, 15, 0.72)'
  roundRect(ctx, pad, y, boxW, boxH, 28 * u)
  ctx.fill()
  ctx.fillStyle = C.text
  ctx.font = `600 ${64 * u}px ${FONT}`
  ctx.fillText(label.day, pad + 28 * u, y + 52 * u)
  ctx.fillStyle = label.stageColor
  ctx.font = `600 ${32 * u}px ${FONT}`
  ctx.fillText(label.stage, pad + 28 * u, y + 112 * u)
  ctx.fillStyle = C.text2
  ctx.font = `400 ${28 * u}px ${FONT}`
  ctx.fillText(label.date, pad + 28 * u + stageW + 24 * u, y + 112 * u)
  // brand, bottom right
  ctx.textAlign = 'right'
  ctx.fillStyle = C.green
  ctx.font = `600 ${28 * u}px ${FONT}`
  ctx.fillText('BudBuddy', w - pad, h - pad - 20 * u)
  ctx.restore()
}

export interface DrawInput {
  img: LoadedImage | null
  align: PhotoAlign
}

/** One timelapse frame: photo A, optionally cross-faded into photo B. */
export function drawTimelapseFrame(ctx: CanvasRenderingContext2D, w: number, h: number, a: DrawInput, b: DrawInput | null, mix: number, label: FrameLabel | null) {
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, w, h)
  if (a.img) drawAligned(ctx, a.img, w, h, a.align)
  if (b?.img && mix > 0) {
    ctx.save()
    ctx.globalAlpha = mix
    drawAligned(ctx, b.img, w, h, b.align)
    ctx.restore()
  }
  if (label) drawLabel(ctx, w, h, label)
}

export interface ExportOptions {
  width: number
  height: number
  photosPerSecond: number
  smooth: boolean
  labels: boolean
  labelFor: (frame: TimelapseFrame) => FrameLabel
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface ExportResult {
  blob: Blob
  ext: 'mp4' | 'webm' | 'gif'
}

const FPS = 30

export class ExportAborted extends Error {
  constructor() {
    super('aborted')
    this.name = 'ExportAborted'
  }
}

/** Keeps the current and the next decoded photo; decodes sequentially. */
function imageQueue(frames: TimelapseFrame[], size: PhotoSize) {
  const cache = new Map<number, Promise<LoadedImage | null>>()
  return (i: number) => {
    for (const k of cache.keys()) if (k < i - 1) cache.delete(k)
    for (const k of [i, i + 1]) {
      if (k < frames.length && !cache.has(k)) cache.set(k, loadFrameImage(frames[k]!.photoId, size))
    }
    return cache.get(i) ?? Promise.resolve(null)
  }
}

export function webCodecsAvailable(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window
}

export async function exportTimelapse(frames: TimelapseFrame[], opts: ExportOptions): Promise<ExportResult> {
  if (webCodecsAvailable()) {
    try {
      const res = await encodeVideo(frames, opts)
      if (res) return res
    } catch (e) {
      if (e instanceof ExportAborted) throw e
      console.warn('[BudBuddy] video encode failed, falling back to GIF', e)
    }
  }
  return encodeGif(frames, opts)
}

async function encodeVideo(frames: TimelapseFrame[], opts: ExportOptions): Promise<ExportResult | null> {
  const mb = await import('mediabunny')
  const { width, height } = opts
  const codec = await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1', 'vp8'], { width, height })
  if (!codec) return null
  const webm = codec === 'vp8' || codec === 'vp9'
  const output = new mb.Output({
    format: webm ? new mb.WebMOutputFormat() : new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new mb.BufferTarget()
  })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  const source = new mb.CanvasSource(canvas, { codec, quality: mb.QUALITY_HIGH, keyFrameInterval: 2 })
  output.addVideoTrack(source, { frameRate: FPS })
  await output.start()

  const image = imageQueue(frames, 'full')
  const label = (f: TimelapseFrame) => (opts.labels ? opts.labelFor(f) : null)
  try {
    if (opts.smooth) {
      const steps = videoSteps(frames.length, opts.photosPerSecond, FPS, true)
      for (const [i, s] of steps.entries()) {
        if (opts.signal?.aborted) throw new ExportAborted()
        const fa = frames[s.from]!
        const a = { img: await image(s.from), align: fa.align }
        const b = s.to !== s.from ? { img: await image(s.to), align: frames[s.to]!.align } : null
        // the label switches halfway through the fade
        drawTimelapseFrame(ctx, width, height, a, b, s.mix, label(s.mix > 0.5 ? frames[s.to]! : fa))
        await source.add(i / FPS, 1 / FPS)
        if (i % 6 === 0) opts.onProgress?.(i / steps.length)
      }
    } else {
      const per = 1 / Math.max(0.25, opts.photosPerSecond)
      let t = 0
      for (const [i, f] of frames.entries()) {
        if (opts.signal?.aborted) throw new ExportAborted()
        drawTimelapseFrame(ctx, width, height, { img: await image(i), align: f.align }, null, 0, label(f))
        const d = i === frames.length - 1 ? per + 1 : per
        await source.add(t, d)
        t += d
        opts.onProgress?.((i + 1) / frames.length)
      }
    }
    source.close()
    await output.finalize()
  } catch (e) {
    await output.cancel().catch(() => {})
    throw e
  }
  const buffer = output.target.buffer
  if (!buffer) return null
  opts.onProgress?.(1)
  return { blob: new Blob([buffer], { type: webm ? 'video/webm' : 'video/mp4' }), ext: webm ? 'webm' : 'mp4' }
}

async function encodeGif(frames: TimelapseFrame[], opts: ExportOptions): Promise<ExportResult> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  // GIFs get big quickly: 480 px wide is plenty for a chat preview
  const width = 480
  const height = Math.round(width * (opts.height / opts.width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas unavailable')
  const gif = GIFEncoder()
  const image = imageQueue(frames, 'thumb')
  const delay = Math.round(1000 / Math.max(0.25, opts.photosPerSecond))
  for (const [i, f] of frames.entries()) {
    if (opts.signal?.aborted) throw new ExportAborted()
    drawTimelapseFrame(ctx, width, height, { img: await image(i), align: f.align }, null, 0, opts.labels ? opts.labelFor(f) : null)
    const { data } = ctx.getImageData(0, 0, width, height)
    const palette = quantize(data, 256)
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay: i === frames.length - 1 ? delay + 1000 : delay })
    opts.onProgress?.((i + 1) / frames.length)
    // let the progress bar paint
    await new Promise(r => setTimeout(r, 0))
  }
  gif.finish()
  return { blob: new Blob([gif.bytes()], { type: 'image/gif' }), ext: 'gif' }
}
