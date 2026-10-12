#!/usr/bin/env node
// Builds the downloadable offline AI pack: <out>/ai-pack.json + <out>/parts/<sha256> (16 MiB parts).
// Upload <out> as static files to the host set in VITE_AI_PACK_URL. Never into the repo.
//   node scripts/build-ai-pack.mjs <out-dir> [src-dir=public/ai] [version]
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const [out, src = 'public/ai', version = new Date().toISOString().slice(0, 10)] = process.argv.slice(2)
if (!out) {
  console.error('usage: build-ai-pack.mjs <out-dir> [src-dir] [version]')
  process.exit(1)
}
const PART = 16 * 1024 * 1024
const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
mkdirSync(join(out, 'parts'), { recursive: true })

const files = []
for (const file of walk(src).sort()) {
  const path = relative(src, file).split('\\').join('/')
  if (!/^(kb|classifier|ort)\//.test(path) || /\.(ts|md)$/.test(path)) continue
  const data = readFileSync(file)
  if (!data.length) continue
  const parts = []
  for (let o = 0; o < data.length; o += PART) {
    const chunk = data.subarray(o, o + PART)
    const sha256 = createHash('sha256').update(chunk).digest('hex')
    writeFileSync(join(out, 'parts', sha256), chunk)
    parts.push({ sha256, size: chunk.length })
  }
  files.push({ path, size: data.length, parts })
}
const totalBytes = files.reduce((n, f) => n + f.size, 0)
writeFileSync(join(out, 'ai-pack.json'), JSON.stringify({ format: 1, version, totalBytes, files }, null, 1))
console.log(`${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MiB -> ${out}`)
