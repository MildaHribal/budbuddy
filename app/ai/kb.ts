// Offline knowledge search for the grow-assistant app (WebView / browser / Node).
// Dense query embedding (onnxruntime-web, WASM) + precomputed BM25 keyword index, fused with RRF.
// Pack layout and rebuild instructions: README.md next to this file.
import * as ort from 'onnxruntime-web/wasm'
import { Tokenizer } from '@huggingface/tokenizers'

export interface KbHit { id: string, kind: 'knowledge' | 'feeding_chart' | 'corpus', title: string, text: string, url?: string, evidence?: string, verdict?: string, lang: string, score: number }

export interface KbOptions {
  /** Where ort-wasm-simd-threaded.{wasm,mjs} are served from (prefix or {wasm, mjs} URLs). App default '/ai/ort/'. */
  wasmPaths?: ort.Env.WasmPrefixOrFilePaths
  /** WASM threads. Android WebView is not cross-origin isolated, so keep 1 there. */
  numThreads?: number
  /** Custom fetch (tests); defaults to globalThis.fetch. */
  fetch?: typeof fetch
  /** How many decompressed text shards to keep in memory. */
  shardCache?: number
}

const opts: Required<KbOptions> = { wasmPaths: '/ai/ort/', numThreads: 1, fetch: (...a) => globalThis.fetch(...a), shardCache: 12 }

/** Optional; call before initKb() to override defaults. */
export function configureKb(o: KbOptions): void {
  Object.assign(opts, o)
}

interface Manifest {
  version: number
  n: number
  dim: number
  model: { file: string, tokenizer: string, tokenizerConfig: string, queryPrefix: string, maxLen: number, output: string }
  vectors: { file: string }
  meta: { file: string }
  bm25: { file: string, k1: number, nTerms: number }
  texts: { dir: string, perShard: number, shards: number }
  // boost per query language, indexed by kind code (knowledge, feeding_chart, corpus, forum)
  search: { mode: 'rrf' | 'weighted', rrfK: number, poolSize: number, bm25Weight: number, boost: { cs: number[], en: number[] }, perDoc: number }
}

type Row = [string, number, string, string, string, string, string, string] // id, kind, title, text, url, evidence, verdict, lang
const KINDS = ['knowledge', 'feeding_chart', 'corpus', 'corpus'] as const // 3 = forum (lower trust), exposed as corpus

let base = ''
let man: Manifest | null = null
let session: ort.InferenceSession | null = null
let tok: Tokenizer | null = null
let vecs: Int8Array | null = null
let kind: Uint8Array | null = null
let group: Uint32Array | null = null
let bm: { terms: Uint8Array, termOff: Uint32Array, idf: Float32Array, df: Uint32Array, postOff: Uint32Array, post: Uint8Array } | null = null
const shardCache = new Map<number, Promise<Row[]>>()
let initPromise: Promise<boolean> | null = null

async function get(path: string): Promise<Response> {
  const r = await opts.fetch(base + path)
  if (!r.ok) throw new Error(`kb: ${path} -> HTTP ${r.status}`)
  return r
}

async function bytes(path: string): Promise<Uint8Array> {
  const raw = new Uint8Array(await (await get(path)).arrayBuffer())
  // Check the gzip magic instead of trusting the extension: a dev server may already have decoded a .gz
  // (Content-Encoding: gzip), and then a second decompression would fail.
  if (raw.length < 2 || raw[0] !== 0x1f || raw[1] !== 0x8b) return raw
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function json<T>(path: string): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await bytes(path))) as T
}

function parseBm25(buf: Uint8Array) {
  // header: "KBM1" u32 nTerms u32 termBytes u32 postBytes, then
  // termOff u32[n+1] | idf f32[n] | df u32[n] | postOff u32[n+1] | terms (ascii) | postings
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (dv.getUint32(0, true) !== 0x314d424b) throw new Error('kb: bad bm25 magic')
  const n = dv.getUint32(4, true), termBytes = dv.getUint32(8, true), postBytes = dv.getUint32(12, true)
  let o = 16
  const u32 = (len: number) => {
    const a = new Uint32Array(buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + len * 4))
    o += len * 4
    return a
  }
  const termOff = u32(n + 1)
  const idf = new Float32Array(u32(n).buffer)
  const df = u32(n)
  const postOff = u32(n + 1)
  const terms = buf.slice(o, o + termBytes)
  o += termBytes
  const post = buf.slice(o, o + postBytes)
  return { terms, termOff, idf, df, postOff, post }
}

export async function initKb(baseUrl: string): Promise<boolean> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
      man = await json<Manifest>('manifest.json')
      ort.env.wasm.wasmPaths = opts.wasmPaths
      ort.env.wasm.numThreads = opts.numThreads
      const [model, tj, tc, v, meta, b] = await Promise.all([
        bytes(man.model.file), json<object>(man.model.tokenizer), json<object>(man.model.tokenizerConfig),
        bytes(man.vectors.file), bytes(man.meta.file), bytes(man.bm25.file)
      ])
      // Do NOT set use_ort_model_bytes_directly: ort-web frees its copy of the model bytes after session
      // creation, so initializers referenced in place get overwritten (garbage embeddings after a few queries).
      session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all', enableMemPattern: false })
      tok = new Tokenizer(tj, tc)
      vecs = new Int8Array(v.buffer, v.byteOffset, man.n * man.dim)
      kind = meta.slice(0, man.n)
      group = new Uint32Array(meta.buffer.slice(meta.byteOffset + man.n, meta.byteOffset + man.n * 5))
      bm = parseBm25(b)
      return true
    } catch (e) {
      console.warn('initKb failed', e)
      initPromise = null
      return false
    }
  })()
  return initPromise
}

// ---- keyword side: must mirror scripts/mobile/kbtext.py exactly ----
const STOP = new Set(`a i o u v k s z ze ve ke se si je jsou to ta ten ty ti na do od po pro pri pod nad za
ze by bych bys byl byla bylo jak jaky jaka jake kdy kde co ci nebo ale aby ktery ktera ktere
mam mas ma mit muj moje mi me mne jsem jsi jste jsme uz jen tak take tez jeste lze muze muzu
the and or of to in on for is are be it its this that with as at by an from`.split(/\s+/))
const S5 = ['atech'], S4 = ['etem', 'atum']
const S3 = ['ech', 'ich', 'eho', 'emi', 'emu', 'ete', 'eti', 'iho', 'imi', 'imu', 'ach', 'ata', 'aty', 'ych', 'ama', 'ami', 'ove', 'ovi', 'ymi']
const S2 = ['em', 'es', 'im', 'um', 'at', 'am', 'os', 'us', 'ym', 'mi', 'ou']
const ends = (w: string, l: string[]) => l.some(s => w.endsWith(s))

function stem(w: string): string {
  if (/^[0-9]+$/.test(w) || w.length <= 3) return w
  const n = w.length
  if (n > 7 && ends(w, S5)) w = w.slice(0, -5)
  else if (n > 6 && ends(w, S4)) w = w.slice(0, -4)
  else if (n > 5 && ends(w, S3)) w = w.slice(0, -3)
  else if (n > 4 && ends(w, S2)) w = w.slice(0, -2)
  else if ('aeiouy'.includes(w[w.length - 1]!)) w = w.slice(0, -1)
  if (w.length > 5 && ends(w, ['ov', 'in', 'uv'])) w = w.slice(0, -2)
  return w
}

const CS_WORDS = /\b(jak|jaky|jaka|jake|jsou|kolik|proc|kdy|mam|muzu|nebo|listy|rostlin\w*|hlin\w*|kvet\w*|zalev\w*|pestov\w*|sklizen\w*)\b/

/** 'cs' when the query has Czech diacritics or common Czech words (users often type without diacritics). */
export function queryLang(q: string): 'cs' | 'en' {
  if (/[áčďéěíňóřšťúůýž]/i.test(q)) return 'cs'
  return CS_WORDS.test(q.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')) ? 'cs' : 'en'
}

export function keywordTerms(s: string): string[] {
  const folded = s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const out: string[] = []
  for (const w of folded.match(/[a-z0-9]+/g) ?? []) {
    if (w.length < 2 || STOP.has(w)) continue
    out.push(stem(w))
  }
  return out
}

function findTerm(t: string): number {
  const { terms, termOff } = bm!
  let lo = 0, hi = termOff.length - 2
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    let c = 0
    const a = termOff[mid]!, e = termOff[mid + 1]!
    for (let i = 0; ; i++) {
      const ca = a + i < e ? terms[a + i]! : -1, cb = i < t.length ? t.charCodeAt(i) : -1
      if (ca !== cb) {
        c = ca < cb ? -1 : 1
        break
      }
      if (ca === -1) break
    }
    if (c === 0) return mid
    if (c < 0) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

function bm25Scores(query: string): Float32Array {
  const s = new Float32Array(man!.n)
  const scale = (man!.bm25.k1 + 1) / 255
  for (const t of new Set(keywordTerms(query))) {
    const ti = findTerm(t)
    if (ti < 0) continue
    const { post, postOff, df, idf } = bm!
    let p = postOff[ti]!
    const cnt = df[ti]!
    // segment layout: cnt varint doc-id deltas, then cnt impact bytes
    let doc = 0
    const ids = new Uint32Array(cnt)
    for (let k = 0; k < cnt; k++) {
      let v = 0, shift = 0, byte
      do {
        byte = post[p++]!
        v |= (byte & 0x7f) << shift
        shift += 7
      } while (byte & 0x80)
      doc += v
      ids[k] = doc
    }
    const w = idf[ti]! * scale
    for (let k = 0; k < cnt; k++) s[ids[k]!]! += w * post[p + k]!
  }
  return s
}

// ---- dense side ----
async function embed(query: string): Promise<Float32Array> {
  const enc = tok!.encode(man!.model.queryPrefix + query)
  let ids = enc.ids as number[]
  const max = man!.model.maxLen
  if (ids.length > max) ids = [...ids.slice(0, max - 1), ids[ids.length - 1]!]
  const L = ids.length
  const feeds: Record<string, ort.Tensor> = {
    input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, L]),
    attention_mask: new ort.Tensor('int64', new BigInt64Array(L).fill(1n), [1, L])
  }
  if (session!.inputNames.includes('token_type_ids')) feeds.token_type_ids = new ort.Tensor('int64', new BigInt64Array(L), [1, L])
  const out = await session!.run(feeds)
  const e = out[man!.model.output]!.data as Float32Array
  for (const k in feeds) feeds[k]?.dispose?.()
  return Float32Array.from(e)
}

function denseScores(q: Float32Array): Float32Array {
  const { n, dim } = man!
  const v = vecs!
  const s = new Float32Array(n)
  for (let i = 0, o = 0; i < n; i++, o += dim) {
    let acc = 0
    for (let d = 0; d < dim; d++) acc += q[d]! * v[o + d]!
    s[i] = acc / 127
  }
  return s
}

function topIdx(s: Float32Array, k: number): number[] {
  const idx: number[] = []
  let min = -Infinity
  for (let i = 0; i < s.length; i++) {
    const x = s[i]!
    if (idx.length === k && x <= min) continue
    let j = idx.length === k ? k - 1 : idx.length
    while (j > 0 && s[idx[j - 1]!]! < x) {
      if (j < k) idx[j] = idx[j - 1]!
      j--
    }
    if (idx.length < k) idx.push(0)
    idx[j] = i
    if (idx.length === k) min = s[idx[k - 1]!]!
  }
  return idx
}

function shard(i: number): Promise<Row[]> {
  let p = shardCache.get(i)
  if (!p) {
    p = json<Row[]>(`${man!.texts.dir}${String(i).padStart(3, '0')}.json.gz`)
    shardCache.set(i, p)
    p.catch(() => shardCache.delete(i))
    while (shardCache.size > opts.shardCache) shardCache.delete(shardCache.keys().next().value!)
  } else {
    shardCache.delete(i)
    shardCache.set(i, p)
  }
  return p
}

export async function searchKb(query: string, k = 12): Promise<KbHit[]> {
  if (!man && !(initPromise && (await initPromise))) throw new Error('kb: call initKb() first')
  const m = man!, cfg = m.search
  const dense = denseScores(await embed(query))
  const kw = bm25Scores(query)
  const fused = new Float32Array(m.n)
  const boost = cfg.boost[queryLang(query)]
  if (cfg.mode === 'rrf') {
    const add = (s: Float32Array, w: number) => {
      topIdx(s, cfg.poolSize).forEach((i, r) => {
        if (s[i]! > 0) fused[i]! += w / (cfg.rrfK + r + 1)
      })
    }
    add(dense, 1)
    add(kw, cfg.bm25Weight)
    for (let i = 0; i < m.n; i++) if (fused[i]! > 0) fused[i]! += boost[kind![i]!]! / cfg.rrfK
  } else {
    let mx = 1e-6
    for (let i = 0; i < m.n; i++) if (kw[i]! > mx) mx = kw[i]!
    for (let i = 0; i < m.n; i++) fused[i] = dense[i]! + cfg.bm25Weight * kw[i]! / mx + boost[kind![i]!]!
  }
  const cand = topIdx(fused, Math.max(k * 4, 50))
  const perDoc = new Map<number, number>()
  const pick: number[] = []
  for (const i of cand) {
    const g = group![i]!, c = perDoc.get(g) ?? 0
    if (c >= cfg.perDoc) continue
    perDoc.set(g, c + 1)
    pick.push(i)
    if (pick.length === k) break
  }
  const per = m.texts.perShard
  const shards = await Promise.all([...new Set(pick.map(i => Math.floor(i / per)))].map(async s => [s, await shard(s)] as const))
  const sm = new Map(shards)
  return pick.map((i) => {
    const r = sm.get(Math.floor(i / per))![i % per]!
    const hit: KbHit = { id: r[0], kind: KINDS[r[1]]!, title: r[2], text: r[3], lang: r[7], score: +fused[i]!.toFixed(5) }
    if (r[4]) hit.url = r[4]
    if (r[5]) hit.evidence = r[5]
    if (r[6]) hit.verdict = r[6]
    return hit
  })
}
