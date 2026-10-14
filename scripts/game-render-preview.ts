// Renders GamePlant variants to SVG (and PNG when rsvg-convert exists) for visual review.
// Usage: nice -n 10 node_modules/.bin/vite-node scripts/game-render-preview.ts [outDir] [filter]
//   outDir defaults to <tmp>/budbuddy-game-render; filter is a substring of the sheet name.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import type { PlantVisual } from '../shared/game/types'
import { SAMPLE_FLOWER, SAMPLE_STAGES, SAMPLE_VARIANTS, SAMPLE_VEG, SYMPTOM_KINDS, sampleVisual, symptom } from '../app/utils/gameRender/fixtures'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = resolve(process.argv[2] || join(tmpdir(), 'budbuddy-game-render'))
const filter = process.argv[3] || ''
mkdirSync(outDir, { recursive: true })

const KINDS = SYMPTOM_KINDS
const VEG = SAMPLE_VEG
const FLOWER = SAMPLE_FLOWER
const visual = sampleVisual
const sym = symptom

type Cell = { title: string, v: PlantVisual }
type Sheet = { name: string, cols: number, cells: Cell[], size?: number, thumb?: boolean }

const sheets: Sheet[] = []
sheets.push({ name: 'healthy-reference', cols: 4, cells: SAMPLE_STAGES })
sheets.push({ name: 'training-media', cols: 4, cells: SAMPLE_VARIANTS })
for (const stage of ['veg', 'flower'] as const) {
  const cells: Cell[] = []
  for (const k of KINDS) {
    for (const i of [0.3, 0.7, 1]) {
      const base = stage === 'veg' ? VEG : FLOWER
      cells.push({ title: `${k} ${i}`, v: { ...base, symptoms: [sym(k, i)] } })
    }
  }
  sheets.push({ name: `symptoms-${stage}`, cols: 6, cells, size: 200 })
}
sheets.push({
  name: 'closeup', cols: 4, size: 400, cells: [
    { title: 'veg hybrid', v: VEG },
    { title: 'veg indica', v: visual({ leafShape: 1, heightCm: 40, nodes: 8 }) },
    { title: 'flower', v: FLOWER },
    { title: 'ripening purple', v: visual({ stage: 'ripening', life: 0.95, heightCm: 85, nodes: 12, budSize: 1, budDensity: 0.8, pistils: 0.85, frost: 0.9, purple: 0.6 }) },
    { title: 'foxtails 1', v: { ...FLOWER, symptoms: [sym('foxtails', 1)] } },
    { title: 'nanners 1', v: { ...FLOWER, symptoms: [sym('nanners', 1)] } },
    { title: 'gray-mold 0.7', v: { ...FLOWER, symptoms: [sym('gray-mold', 0.7)] } },
    { title: 'claw 1 + dark-green', v: { ...VEG, symptoms: [sym('claw', 1), sym('dark-green', 0.8)] } },
    { title: 'interveinal 1', v: { ...VEG, symptoms: [sym('chlorosis-interveinal', 1)] } },
    { title: 'tip-burn 0.7', v: { ...VEG, symptoms: [sym('tip-burn', 0.7)] } },
    { title: 'spider mites', v: { ...VEG, symptoms: [sym('stipple', 0.8), sym('webbing', 0.6)] } },
    { title: 'wilt 0.8', v: { ...VEG, symptoms: [sym('wilt', 0.8)] } }
  ]
})
sheets.push({
  name: 'thumbs', cols: 8, size: 72, thumb: true, cells: [
    { title: 'veg', v: VEG }, { title: 'flower', v: FLOWER }, { title: 'seedling', v: visual({ stage: 'seedling', heightCm: 6, nodes: 2 }) },
    { title: 'n def', v: { ...VEG, symptoms: [sym('chlorosis-uniform', 0.8)] } },
    { title: 'burn', v: { ...VEG, symptoms: [sym('tip-burn', 0.8)] } },
    { title: 'wilt', v: { ...VEG, symptoms: [sym('wilt', 0.8)] } },
    { title: 'dead', v: visual({ stage: 'dead', heightCm: 40, nodes: 8 }) },
    { title: 'harvested', v: visual({ stage: 'harvested' }) }
  ]
})

async function main() {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'error',
    plugins: [vue()],
    resolve: { alias: { '~': join(root, 'app') } },
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom'
  })
  try {
    const mod = await server.ssrLoadModule('/app/components/game/render/GamePlant.vue')
    const GamePlant = mod.default
    let hasRsvg = true
    try {
      execFileSync('rsvg-convert', ['--version'], { stdio: 'ignore' })
    } catch {
      hasRsvg = false
    }

    for (const sheet of sheets) {
      if (filter && !sheet.name.includes(filter)) continue
      const size = sheet.size ?? 240
      const cellH = Math.round(size * 1.25) + 22
      const rows = Math.ceil(sheet.cells.length / sheet.cols)
      const W = sheet.cols * (size + 12) + 12
      const H = rows * (cellH + 12) + 12
      const parts: string[] = []
      let maxEl = 0
      for (let i = 0; i < sheet.cells.length; i++) {
        const c = sheet.cells[i]!
        const app = createSSRApp({ render: () => h(GamePlant, { visual: c.v, size, label: c.title, detail: sheet.thumb ? 'thumb' : 'full' }) })
        const html = await renderToString(app)
        // server-renderer lowercases root attrs; browsers get the camelCase key from the client compiler
        const inner = html.replace(/ data-v-[a-z0-9]+(="")?/g, '').replace(' viewbox=', ' viewBox=')
        maxEl = Math.max(maxEl, (inner.match(/<(path|use|ellipse|circle|rect)\b/g) || []).length)
        const x = 12 + (i % sheet.cols) * (size + 12)
        const y = 12 + Math.floor(i / sheet.cols) * (cellH + 12)
        parts.push(`<g transform="translate(${x} ${y})"><rect width="${size}" height="${cellH}" rx="10" fill="#171a18" stroke="#252a27"/><text x="8" y="16" font-family="sans-serif" font-size="11" fill="#a5ada8">${esc(c.title)}</text><g transform="translate(0 20)">${inner}</g></g>`)
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0e100f"/>${parts.join('')}</svg>`
      const file = join(outDir, `${sheet.name}.svg`)
      writeFileSync(file, svg)
      if (hasRsvg) execFileSync('rsvg-convert', [file, '-o', join(outDir, `${sheet.name}.png`)])
      console.log(`${sheet.name}: ${sheet.cells.length} plants, max ${maxEl} elements, ${W}x${H}`)
    }
  } finally {
    await server.close()
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
