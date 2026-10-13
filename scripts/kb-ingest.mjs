// Loads JSONL corpus files into public.kb_chunks: chunk -> embed locally (gte-small, same as the kb-search edge function) -> upsert.
// Usage: node scripts/kb-ingest.mjs [file.jsonl|dir ...] [--all] [--prune] [--sql-only] [--dry-run]
//   default input: ~/.cache/budbuddy-kb/corpus (top-level *.jsonl only)
//   SUPABASE_SERVICE_ROLE_KEY set -> REST upsert; otherwise SQL batches applied with `npx supabase db query --linked`
//   KB_TOOLS: dir with node_modules/@huggingface/transformers (default ~/.cache/budbuddy-kb/tools)
//   KB_DEVICE: cpu (default) | cuda, KB_THREADS: onnx threads (default 4)
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, setPriority } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

export const MODEL = 'Xenova/gte-small'
const PROJECT = 'mlvpmiwvuxgwjssrtxsq'
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${PROJECT}.supabase.co`
const HOME = join(homedir(), '.cache/budbuddy-kb')

const words = s => s.split(/\s+/).filter(Boolean)

/** Splits text into ~min..max word chunks on sentence boundaries, each starting with ~overlap words of the previous one. */
export function chunkText(text, { min = 250, max = 350, overlap = 50 } = {}) {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (words(clean).length <= max) return clean ? [clean] : []
  // sentences (or list lines); a single over-long sentence is cut by words
  const units = clean.split(/(?<=[.!?])\s+|\n+/).flatMap((s) => {
    const w = words(s)
    if (w.length <= max) return w.length ? [w] : []
    const parts = []
    for (let i = 0; i < w.length; i += max - overlap) parts.push(w.slice(i, i + max))
    return parts
  })
  const chunks = []
  let cur = []
  let fresh = 0
  for (const u of units) {
    if (cur.length + u.length > max && fresh > 0 && cur.length >= min - overlap) {
      chunks.push(cur.join(' '))
      cur = cur.slice(-overlap)
      fresh = 0
    }
    cur = cur.concat(u)
    fresh += u.length
  }
  if (fresh > 0) {
    // a short tail goes into the previous chunk instead of standing alone
    if (chunks.length && fresh < 80) chunks[chunks.length - 1] += ' ' + cur.slice(-fresh).join(' ')
    else chunks.push(cur.join(' '))
  }
  return chunks
}

const detectLang = text => (/[ěščřžůťďň]/i.test(text) ? 'cs' : 'en')

/** Corpus record -> rows with stable ids (doc id, or doc id#n when chunked). */
export function toChunks(doc) {
  if (!doc || typeof doc.id !== 'string' || typeof doc.text !== 'string' || !doc.id.trim() || !doc.text.trim()) return []
  const title = String(doc.title ?? '').trim() || doc.id
  const parts = chunkText(doc.text)
  const base = { title, topic: doc.topic ?? null, source: doc.source ?? null, license: doc.license ?? null, url: doc.url ?? null, lang: doc.lang ?? detectLang(doc.text) }
  return parts.map((text, i) => ({ id: parts.length === 1 ? doc.id : `${doc.id}#${i}`, ...base, text }))
}

export const chunkHash = c => createHash('sha1').update(`${MODEL}\n${c.title}\n${c.text}`).digest('hex')

export const vectorLiteral = v => `[${Array.from(v, x => Math.round(x * 1e6) / 1e6).join(',')}]`

const q = v => (v == null ? 'null' : `'${String(v).replace(/'/g, '\'\'')}'`)

export function upsertSql(rows) {
  const values = rows.map(r => `(${[r.id, r.title, r.text, r.topic, r.source, r.license, r.url, r.lang].map(q).join(', ')}, ${q(vectorLiteral(r.embedding))}::extensions.vector)`)
  return `insert into public.kb_chunks (id, title, text, topic, source, license, url, lang, embedding) values\n${values.join(',\n')}\n`
    + 'on conflict (id) do update set title = excluded.title, text = excluded.text, topic = excluded.topic, source = excluded.source, '
    + 'license = excluded.license, url = excluded.url, lang = excluded.lang, embedding = excluded.embedding, updated_at = now();\n'
}

/** Top-level *.jsonl of each directory (subdirectories hold intermediate copies). */
function listJsonl(paths) {
  return paths.map(p => resolve(p)).flatMap(p => (statSync(p).isDirectory()
    ? readdirSync(p).filter(f => f.endsWith('.jsonl')).sort().map(f => join(p, f))
    : [p]))
}

function readCorpus(files) {
  const docs = new Map()
  for (const f of files) {
    for (const [n, line] of readFileSync(f, 'utf8').split('\n').entries()) {
      if (!line.trim()) continue
      try {
        const d = JSON.parse(line)
        if (typeof d.id === 'string') docs.set(d.id, d)
      } catch {
        console.warn(`skip ${f}:${n + 1} (bad JSON)`)
      }
    }
  }
  return docs
}

async function loadExtractor() {
  let mod
  try {
    mod = await import('@huggingface/transformers')
  } catch {
    const tools = process.env.KB_TOOLS || join(HOME, 'tools')
    mod = await import(pathToFileURL(join(tools, 'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href)
  }
  const threads = Number(process.env.KB_THREADS) || 4
  return mod.pipeline('feature-extraction', MODEL, {
    dtype: 'fp32',
    device: process.env.KB_DEVICE || 'cpu',
    session_options: { intraOpNumThreads: threads, interOpNumThreads: 1 }
  })
}

function loadCache(file) {
  const cache = new Map()
  if (!existsSync(file)) return cache
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const i = line.indexOf(' ')
    if (i < 0) continue
    const b = Buffer.from(line.slice(i + 1), 'base64')
    if (b.length === 384 * 4) cache.set(line.slice(0, i), new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)))
  }
  return cache
}

async function restUpsert(rows, key) {
  const body = rows.map(r => ({ id: r.id, title: r.title, text: r.text, topic: r.topic, source: r.source, license: r.license, url: r.url, lang: r.lang, embedding: vectorLiteral(r.embedding), updated_at: new Date().toISOString() }))
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kb_chunks?on_conflict=id`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`upsert HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

function runSql(file) {
  const r = spawnSync('npx', ['supabase', 'db', 'query', '--linked', '--project-ref', PROJECT, '-f', file], { encoding: 'utf8', cwd: resolve(import.meta.dirname, '..') })
  if (r.status !== 0 || /"_tag":\s*"Error"/.test(r.stdout)) throw new Error(`db query failed for ${file}: ${(r.stdout + r.stderr).slice(-500)}`)
}

async function main() {
  const args = process.argv.slice(2)
  const flags = new Set(args.filter(a => a.startsWith('--')))
  const inputs = args.filter(a => !a.startsWith('--'))
  try {
    setPriority(10)
  } catch { /* not allowed: keep default */ }

  const files = listJsonl(inputs.length ? inputs : [join(HOME, 'corpus')])
  const docs = readCorpus(files)
  const chunks = [...docs.values()].flatMap(toChunks)
  console.log(`${files.length} files, ${docs.size} docs, ${chunks.length} chunks`)

  const statePath = join(HOME, 'ingested.json')
  const state = existsSync(statePath) && !flags.has('--all') ? JSON.parse(readFileSync(statePath, 'utf8')) : {}
  for (const c of chunks) c.hash = chunkHash(c)
  const todo = chunks.filter(c => state[c.id] !== c.hash)
  console.log(`${todo.length} new or changed`)
  if (flags.has('--dry-run')) return

  const cachePath = join(HOME, 'embed-cache.txt')
  const cache = loadCache(cachePath)
  const missing = todo.filter(c => !cache.has(c.hash))
  if (missing.length) {
    const extract = await loadExtractor()
    const started = Date.now()
    for (let i = 0; i < missing.length; i += 32) {
      const batch = missing.slice(i, i + 32)
      const out = await extract(batch.map(c => `${c.title}\n${c.text}`), { pooling: 'mean', normalize: true })
      const dim = out.dims[1]
      batch.forEach((c, j) => {
        const v = Float32Array.from(out.data.subarray(j * dim, (j + 1) * dim))
        cache.set(c.hash, v)
        appendFileSync(cachePath, `${c.hash} ${Buffer.from(v.buffer).toString('base64')}\n`)
      })
      if ((i / 32) % 20 === 0) console.log(`embedded ${Math.min(i + 32, missing.length)}/${missing.length} (${((Date.now() - started) / 1000).toFixed(0)} s)`)
      await sleep(30)
    }
  }
  for (const c of todo) c.embedding = cache.get(c.hash)

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const useRest = key && !flags.has('--sql-only')
  const sqlDir = join(HOME, 'sql')
  if (!useRest) {
    rmSync(sqlDir, { recursive: true, force: true })
    mkdirSync(sqlDir, { recursive: true })
  }
  const step = useRest ? 200 : 150
  for (let i = 0; i < todo.length; i += step) {
    const batch = todo.slice(i, i + step)
    if (useRest) {
      await restUpsert(batch, key)
    } else {
      const file = join(sqlDir, `upsert-${String(i / step).padStart(4, '0')}.sql`)
      writeFileSync(file, upsertSql(batch))
      runSql(file)
    }
    for (const c of batch) state[c.id] = c.hash
    writeFileSync(statePath, JSON.stringify(state))
    console.log(`upserted ${Math.min(i + step, todo.length)}/${todo.length}`)
  }

  if (flags.has('--prune')) {
    const keep = new Set(chunks.map(c => c.id))
    const gone = Object.keys(state).filter(id => !keep.has(id))
    if (gone.length) {
      const file = join(sqlDir, 'prune.sql')
      mkdirSync(sqlDir, { recursive: true })
      writeFileSync(file, `delete from public.kb_chunks where id in (${gone.map(q).join(', ')});\n`)
      runSql(file)
      for (const id of gone) delete state[id]
      writeFileSync(statePath, JSON.stringify(state))
    }
    console.log(`pruned ${gone.length}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
