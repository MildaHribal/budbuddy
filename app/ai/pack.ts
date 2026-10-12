// Where the offline AI files come from: bundled in the app, a Play asset pack, or a pack downloaded
// into the Cache API. Layout is always <base>{kb,classifier,ort}/…, the same as public/ai/.

export interface PackPart { sha256: string, size: number }
export interface PackFile { path: string, size: number, parts: PackPart[] }
export interface PackManifest { format: 1, version: string, totalBytes: number, files: PackFile[] }

/** Base URL of a downloadable pack (ai-pack.json + parts/<sha256>). Empty = download disabled. */
export const AI_PACK_URL: string = (import.meta.env?.VITE_AI_PACK_URL as string | undefined) ?? ''

const CACHE = 'budbuddy-ai-pack-v1'
const KEY = 'https://ai-pack.invalid/'
const partKey = (sha: string) => `${KEY}parts/${sha}`
const MANIFEST_KEY = `${KEY}ai-pack.json`
const withSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`)
const HEX64 = /^[0-9a-f]{64}$/

export function parseManifest(raw: unknown): PackManifest {
  const m = raw as PackManifest
  const ok = m && m.format === 1 && typeof m.version === 'string' && Array.isArray(m.files) && m.files.length > 0
    && m.files.every(f => typeof f.path === 'string' && /^(kb|classifier|ort)\/[\w./-]+$/.test(f.path) && !f.path.includes('..')
      && Array.isArray(f.parts) && f.parts.length > 0 && f.parts.every(p => HEX64.test(p.sha256) && Number.isInteger(p.size) && p.size > 0)
      && f.parts.reduce((n, p) => n + p.size, 0) === f.size)
  if (!ok) throw new Error('ai-pack: invalid manifest')
  return { ...m, totalBytes: m.files.reduce((n, f) => n + f.size, 0) }
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

const hasCaches = () => typeof caches !== 'undefined'

/** The verified manifest of the downloaded pack, or null when nothing (complete) is stored. */
export async function installedPack(): Promise<PackManifest | null> {
  if (!hasCaches()) return null
  try {
    const cache = await caches.open(CACHE)
    const res = await cache.match(MANIFEST_KEY)
    if (!res) return null
    const man = parseManifest(await res.json())
    // the browser may evict entries under storage pressure
    for (const f of man.files) {
      for (const p of f.parts) if (!(await cache.match(partKey(p.sha256)))) return null
    }
    return man
  } catch {
    return null
  }
}

/** fetch() for the downloaded pack: `${base}<path>` is rebuilt from its cached parts. */
export function packFetch(base: string, man: PackManifest): typeof fetch {
  const files = new Map(man.files.map(f => [f.path, f]))
  return async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const file = url.startsWith(base) ? files.get(url.slice(base.length)) : undefined
    if (!file) return new Response(null, { status: 404 })
    const cache = await caches.open(CACHE)
    const blobs: Blob[] = []
    for (const p of file.parts) {
      const res = await cache.match(partKey(p.sha256))
      if (!res) return new Response(null, { status: 404 })
      blobs.push(await res.blob())
    }
    return new Response(new Blob(blobs))
  }
}

export interface DownloadProgress { done: number, total: number }

async function readWithProgress(res: Response, size: number, signal: AbortSignal, onBytes: (n: number) => void): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array(await res.arrayBuffer())
  const out = new Uint8Array(size)
  const reader = res.body.getReader()
  let n = 0
  for (;;) {
    if (signal.aborted) {
      await reader.cancel().catch(() => {})
      throw new DOMException('aborted', 'AbortError')
    }
    const { done, value } = await reader.read()
    if (done) break
    if (n + value.length > size) throw new Error('ai-pack: part larger than expected')
    out.set(value, n)
    n += value.length
    onBytes(n)
  }
  if (n !== size) throw new Error('ai-pack: part truncated')
  return out
}

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const id = setTimeout(resolve, ms)
  signal.addEventListener('abort', () => {
    clearTimeout(id)
    reject(new DOMException('aborted', 'AbortError'))
  }, { once: true })
})

/**
 * Downloads the pack part by part. Parts already stored are skipped, so calling it again after a
 * cancel, crash or lost connection resumes. Every part is checked against its SHA-256.
 */
export async function downloadPack(baseUrl: string, { signal, onProgress, fetchImpl = (...a) => globalThis.fetch(...a), retryDelayMs = 1500 }: {
  signal: AbortSignal
  onProgress?: (p: DownloadProgress) => void
  fetchImpl?: typeof fetch
  retryDelayMs?: number
}): Promise<PackManifest> {
  const base = withSlash(baseUrl)
  const res = await fetchImpl(`${base}ai-pack.json`, { signal, cache: 'no-store' })
  if (!res.ok) throw new Error(`ai-pack: manifest HTTP ${res.status}`)
  const man = parseManifest(await res.json())
  const cache = await caches.open(CACHE)
  await navigator.storage?.persist?.().catch(() => false)
  let done = 0
  onProgress?.({ done, total: man.totalBytes })
  for (const p of man.files.flatMap(f => f.parts)) {
    if (await cache.match(partKey(p.sha256))) {
      done += p.size
      onProgress?.({ done, total: man.totalBytes })
      continue
    }
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetchImpl(`${base}parts/${p.sha256}`, { signal })
        if (!r.ok) throw new Error(`ai-pack: part HTTP ${r.status}`)
        const bytes = await readWithProgress(r, p.size, signal, n => onProgress?.({ done: done + n, total: man.totalBytes }))
        if (await sha256Hex(bytes) !== p.sha256) throw new Error('ai-pack: checksum mismatch')
        await cache.put(partKey(p.sha256), new Response(bytes as BlobPart))
        break
      } catch (e) {
        if (signal.aborted || attempt >= 2) throw e
        await sleep(retryDelayMs * 2 ** attempt, signal)
      }
    }
    done += p.size
    onProgress?.({ done, total: man.totalBytes })
  }
  await cache.put(MANIFEST_KEY, Response.json(man))
  // drop parts of an older pack version
  const keep = new Set(man.files.flatMap(f => f.parts.map(p => partKey(p.sha256))))
  for (const req of await cache.keys()) {
    if (req.url !== MANIFEST_KEY && !keep.has(req.url)) await cache.delete(req)
  }
  return man
}

export async function deletePack(): Promise<void> {
  if (hasCaches()) await caches.delete(CACHE)
}

/** Bytes already stored for a (possibly partial) download, for the resume label. */
export async function storedBytes(): Promise<number> {
  if (!hasCaches()) return 0
  try {
    const cache = await caches.open(CACHE)
    let n = 0
    for (const req of await cache.keys()) {
      if (req.url === MANIFEST_KEY) continue
      const res = await cache.match(req)
      n += Number(res?.headers.get('content-length') ?? 0) || (await res?.blob())?.size || 0
    }
    return n
  } catch {
    return 0
  }
}

export interface AiSource {
  kind: 'bundled' | 'asset-pack' | 'download'
  /** prefix of kb/, classifier/, ort/ */
  base: string
  /** set for the Cache API pack */
  fetch?: typeof fetch
}

/** Bundled files win; then a Play asset pack; then a downloaded pack. null = no offline AI. */
export async function resolveAiSource(appBase: string, padLocation: () => Promise<string | null>): Promise<AiSource | null> {
  const bundled = `${withSlash(appBase)}ai/`
  try {
    const res = await fetch(`${bundled}kb/manifest.json`, { method: 'HEAD', cache: 'no-store' })
    if (res.ok && !/text\/html/.test(res.headers.get('content-type') ?? '')) return { kind: 'bundled', base: bundled }
  } catch {
    // not bundled
  }
  const pad = await padLocation().catch(() => null)
  if (pad) return { kind: 'asset-pack', base: withSlash(pad) }
  const man = await installedPack()
  if (man) return { kind: 'download', base: KEY, fetch: packFetch(KEY, man) }
  return null
}
