import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deletePack, downloadPack, installedPack, packFetch, parseManifest, resolveAiSource, type PackManifest } from '../app/ai/pack'

// minimal Cache API
class FakeCache {
  store = new Map<string, Response>()
  async match(req: string | Request) {
    return this.store.get(typeof req === 'string' ? req : req.url)?.clone()
  }

  async put(req: string, res: Response) {
    this.store.set(req, new Response(await res.arrayBuffer(), { headers: res.headers }))
  }

  async keys() {
    return [...this.store.keys()].map(url => new Request(url))
  }

  async delete(req: Request | string) {
    return this.store.delete(typeof req === 'string' ? req : req.url)
  }
}
let cache: FakeCache

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const a = new Uint8Array([1, 2, 3, 4]), b = new Uint8Array([5, 6]), c = new Uint8Array([7, 8, 9])
const manifest = {
  format: 1,
  version: 't1',
  files: [
    { path: 'kb/manifest.json', size: 6, parts: [{ sha256: sha(a), size: 4 }, { sha256: sha(b), size: 2 }] },
    { path: 'ort/x.wasm', size: 3, parts: [{ sha256: sha(c), size: 3 }] }
  ]
}
const parts = new Map([[sha(a), a], [sha(b), b], [sha(c), c]])

function host(fail = new Set<string>()) {
  return vi.fn(async (url: string) => {
    if (url.endsWith('ai-pack.json')) return Response.json(manifest)
    const key = url.split('/').pop()!
    if (fail.has(key)) return new Response(null, { status: 500 })
    const body = parts.get(key)
    return body ? new Response(body.slice()) : new Response(null, { status: 404 })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  cache = new FakeCache()
  vi.stubGlobal('caches', { open: async () => cache, delete: async () => (cache = new FakeCache(), true) })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseManifest', () => {
  it('accepts a valid manifest and sums the size', () => {
    expect(parseManifest(manifest).totalBytes).toBe(9)
  })

  it('rejects paths outside the pack, bad hashes and wrong sizes', () => {
    expect(() => parseManifest({ ...manifest, files: [{ ...manifest.files[0], path: '../x' }] })).toThrow()
    expect(() => parseManifest({ ...manifest, files: [{ ...manifest.files[0], size: 7 }] })).toThrow()
    expect(() => parseManifest({ ...manifest, files: [{ ...manifest.files[1], parts: [{ sha256: 'zz', size: 3 }] }] })).toThrow()
  })
})

describe('downloadPack', () => {
  it('downloads, verifies and serves files rebuilt from parts', async () => {
    const progress: number[] = []
    const man = await downloadPack('https://pack.example/v1', { signal: new AbortController().signal, fetchImpl: host(), onProgress: p => progress.push(p.done) })
    expect(progress.at(-1)).toBe(9)
    expect(await installedPack()).toEqual(man)
    const f = packFetch('base/', man as PackManifest)
    expect(new Uint8Array(await (await f('base/kb/manifest.json')).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
    expect((await f('base/kb/missing')).status).toBe(404)
  })

  it('resumes: parts already stored are not fetched again', async () => {
    const fail = new Set([sha(c)])
    const caught = await downloadPack('https://pack.example/v1/', { signal: new AbortController().signal, fetchImpl: host(fail), retryDelayMs: 0 }).catch(e => e)
    expect(caught).toBeInstanceOf(Error)
    expect(await installedPack()).toBeNull()
    const again = host()
    await downloadPack('https://pack.example/v1/', { signal: new AbortController().signal, fetchImpl: again })
    const fetched = (again as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([u]) => String(u).split('/').pop())
    expect(fetched).toEqual(['ai-pack.json', sha(c)])
  })

  it('rejects a part with the wrong checksum', async () => {
    const bad = vi.fn(async (url: string) => (url.endsWith('ai-pack.json') ? Response.json(manifest) : new Response(new Uint8Array([0, 0, 0, 0])))) as unknown as typeof fetch
    const run = await downloadPack('https://p/', { signal: new AbortController().signal, fetchImpl: bad, retryDelayMs: 0 }).catch(e => e)
    expect(String(run)).toMatch(/checksum|truncated|larger/)
  })

  it('stops on cancel and can be deleted', async () => {
    const ctl = new AbortController()
    ctl.abort()
    await expect(downloadPack('https://p/', { signal: ctl.signal, fetchImpl: host() })).rejects.toThrow()
    await deletePack()
    expect(await installedPack()).toBeNull()
  })
})

describe('resolveAiSource', () => {
  it('prefers bundled files, then a Play pack, then the download', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } })))
    expect((await resolveAiSource('/', async () => null))?.kind).toBe('bundled')
    // SPA fallback returns index.html for missing files
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })))
    expect(await resolveAiSource('/', async () => 'https://localhost/_capacitor_file_/pack/ai/')).toMatchObject({ kind: 'asset-pack', base: 'https://localhost/_capacitor_file_/pack/ai/' })
    expect(await resolveAiSource('/', async () => null)).toBeNull()
    await downloadPack('https://p/', { signal: new AbortController().signal, fetchImpl: host() })
    expect((await resolveAiSource('/', async () => null))?.kind).toBe('download')
  })
})
