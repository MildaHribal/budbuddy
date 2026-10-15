// On-device cannabis photo classifier (onnxruntime-web, WASM). Files: diag.onnx + meta.json under baseUrl.
import * as ort from 'onnxruntime-web/wasm'

/** `atlas`: problem atlas ids the class stands for (a group class lists several); `checkArea`: symptom checker area. */
export interface DiagHit { cls: string, label: string, p: number, evidence: 'tested' | 'weak' | 'transfer-only', atlas?: string[], checkArea?: string }
export interface DiagResult {
  diag: DiagHit[]
  stage: { cls: string, label: string, p: number }[]
  unsupported: string[]
  modelVersion: string
}

export type Lang = 'cs' | 'en'
export interface I18nLabel { cs: string, en: string }

export interface ClassifierMeta {
  modelVersion: string
  input: { name: string, shape: number[], layout: string, range: [number, number], preprocessing: string }
  outputs: { diag: string, stage: string }
  diag: { cls: string, label: I18nLabel, evidence: 'tested' | 'weak' | 'transfer-only', atlas?: string[], checkArea?: string }[]
  stage: { cls: string, label: I18nLabel }[]
  unsupported: { cls: string, label: I18nLabel }[]
  [k: string]: unknown
}

export const INPUT_SIZE = 224

let session: ort.InferenceSession | null = null
let meta: ClassifierMeta | null = null
let loading: Promise<boolean> | null = null

const withSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`)

/**
 * Resolves false if a file is missing or the model fails to load. ORT's wasm path is global,
 * so pass the same `ortPath` as the knowledge search uses.
 */
export function initClassifier(baseUrl: string, ortPath?: ort.Env.WasmPrefixOrFilePaths, fetchImpl: typeof fetch = (...a) => globalThis.fetch(...a)): Promise<boolean> {
  if (session && meta) return Promise.resolve(true)
  if (loading) return loading
  const base = withSlash(baseUrl)
  loading = (async () => {
    try {
      ort.env.wasm.wasmPaths = ortPath ?? `${base}../ort/`
      ort.env.wasm.numThreads = wasmThreads()
      const metaRes = await fetchImpl(`${base}meta.json`)
      if (!metaRes.ok) return false
      const m = (await metaRes.json()) as ClassifierMeta
      const modelRes = await fetchImpl(`${base}diag.onnx`)
      if (!modelRes.ok) return false
      await initFromBytes(new Uint8Array(await modelRes.arrayBuffer()), m)
      return true
    } catch (e) {
      console.warn('[classifier] init failed', e)
      return false
    } finally {
      loading = null
    }
  })()
  return loading
}

/**
 * Threads need SharedArrayBuffer (cross-origin isolation). Without it ORT falls back to 1 thread itself,
 * so asking for more is safe. 4 threads ≈ 3.5× faster than 1 in Chrome.
 */
export function wasmThreads(g: { SharedArrayBuffer?: unknown, navigator?: { hardwareConcurrency?: number } } = globalThis): number {
  if (typeof g.SharedArrayBuffer === 'undefined') return 1
  return Math.max(1, Math.min(4, Math.floor((g.navigator?.hardwareConcurrency ?? 2) / 2)))
}

export async function initFromBytes(model: Uint8Array, m: ClassifierMeta): Promise<void> {
  session = await ort.InferenceSession.create(model, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all'
  })
  meta = m
}

/** RGBA (or RGB) 224×224 pixels → float32 [1,3,224,224], RGB, 0–255. */
export function pixelsToTensorData(px: ArrayLike<number>, channels = 4, size = INPUT_SIZE): Float32Array {
  const n = size * size
  const out = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) {
    const j = i * channels
    out[i] = px[j]!
    out[n + i] = px[j + 1]!
    out[2 * n + i] = px[j + 2]!
  }
  return out
}

function topk<T>(p: Float32Array, k: number, f: (i: number, p: number) => T): T[] {
  return Array.from(p, (v, i) => [v, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map(([v, i]) => f(i, v))
}

export function buildResult(diagP: Float32Array, stageP: Float32Array, m: ClassifierMeta, k = 3, lang: Lang = 'cs'): DiagResult {
  const label = (l: I18nLabel) => l[lang] ?? l.cs
  return {
    diag: topk(diagP, k, (i, p) => {
      const d = m.diag[i]!
      // models before v2 have no atlas field: the class id is the atlas id
      return { cls: d.cls, label: label(d.label), p, evidence: d.evidence, atlas: d.atlas ?? [d.cls], ...(d.checkArea ? { checkArea: d.checkArea } : {}) }
    }),
    stage: topk(stageP, stageP.length, (i, p) => ({ cls: m.stage[i]!.cls, label: label(m.stage[i]!.label), p })),
    unsupported: m.unsupported.map(u => label(u.label)),
    modelVersion: m.modelVersion
  }
}

export async function runTensor(data: Float32Array): Promise<{ diag: Float32Array, stage: Float32Array }> {
  if (!session) throw new Error('classifier not initialised')
  const t = new ort.Tensor('float32', data, [1, 3, INPUT_SIZE, INPUT_SIZE])
  const out = await session.run({ image: t })
  const diag = Float32Array.from(out.diag!.data as Float32Array)
  const stage = Float32Array.from(out.stage!.data as Float32Array)
  t.dispose()
  return { diag, stage }
}

export async function diagnoseTensor(data: Float32Array, k = 3, lang: Lang = 'cs'): Promise<DiagResult> {
  if (!meta) throw new Error('classifier not initialised')
  const p = await runTensor(data)
  return buildResult(p.diag, p.stage, meta, k, lang)
}

type Img = Blob | HTMLImageElement | ImageBitmap

/** Centre square crop, resized to 224×224 → RGBA pixels. */
export async function imageToPixels(img: Img, size = INPUT_SIZE): Promise<Uint8ClampedArray> {
  let src: CanvasImageSource
  let w: number
  let h: number
  let owned: ImageBitmap | null = null
  if (img instanceof Blob) {
    owned = await createImageBitmap(img, { imageOrientation: 'from-image' })
    src = owned
    w = owned.width
    h = owned.height
  } else if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    if (!img.complete) await img.decode()
    src = img
    w = img.naturalWidth
    h = img.naturalHeight
  } else {
    src = img
    w = img.width
    h = img.height
  }
  const s = Math.min(w, h)
  const sx = Math.floor((w - s) / 2)
  const sy = Math.floor((h - s) / 2)
  const canvas: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(size, size)
    : Object.assign(document.createElement('canvas'), { width: size, height: size })
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, sx, sy, s, s, 0, 0, size, size)
  owned?.close()
  return ctx.getImageData(0, 0, size, size).data
}

/** `lang` selects the language of the labels. Call initClassifier() first. */
export async function diagnosePhoto(img: Img, k = 3, lang: Lang = 'cs'): Promise<DiagResult> {
  if (!session || !meta) throw new Error('classifier not initialised')
  return diagnoseTensor(pixelsToTensorData(await imageToPixels(img), 4), k, lang)
}
