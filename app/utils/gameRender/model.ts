// Composes scene + symptom looks + shared defs into a flat render model for the SFCs.
import type { PlantVisual } from '../../../shared/game/types'
import { buildBud, type BudPart } from './buds'
import { mix, shade } from './color'
import { buildScene, type Detail, type Scene } from './layout'
import { buildLeaf, insetPath, type LeafGeometry, type Pose } from './leafGeometry'
import { buildOverlay, type Bucket, type OverlayKind, type OverlayPart } from './overlays'
import { hashSeed } from './prng'
import { budLook, leafLook, poseKey, stemLook, type LeafCtx, type PlantBase } from './symptoms'

export interface RenderLeaf {
  transform: string
  symbol: string
  fill: string
  vein: string
  veinW: number
  outer?: string
  insetId?: string
  overlays: { id: string, opacity: number }[]
  petiole: { d: string, w: number }
}

export interface RenderBud {
  transform: string
  parts: BudPart[]
  sugar: RenderLeaf[]
}

export interface RenderModel {
  w: number
  h: number
  scene: Scene
  symbols: { id: string, silhouette: string, veins: string }[]
  insets: { id: string, d: string }[]
  overlays: { id: string, parts: OverlayPart[] }[]
  stemColor: string
  petioleColor: string
  stems: Scene['stems']
  back: RenderLeaf[]
  front: RenderLeaf[]
  buds: RenderBud[]
  stemDots: { d: string, fill: string, opacity: number } | null
  elementCount: number
}

const HEALTHY_GREEN = '#3f8f2e'

// shared across instances: geometry only depends on these keys
const geomCache = new Map<string, LeafGeometry>()
const overlayCache = new Map<string, OverlayPart[]>()
const MAX_CACHE = 400

function geomFor(fingers: number, shape: number, pose: Pose): { key: string, g: LeafGeometry } {
  const shapeQ = Math.round(shape * 4) / 4
  const key = `${fingers}-${shapeQ}-${poseKey(pose)}`
  let g = geomCache.get(key)
  if (!g) {
    if (geomCache.size > MAX_CACHE) geomCache.clear()
    g = buildLeaf(fingers, shapeQ, pose)
    geomCache.set(key, g)
  }
  return { key, g }
}

function overlayFor(kind: OverlayKind, g: LeafGeometry, key: string, b: Bucket): { id: string, parts: OverlayPart[] } {
  const id = `ov-${kind}-${key}-${b}`
  let parts = overlayCache.get(id)
  if (!parts) {
    if (overlayCache.size > MAX_CACHE) overlayCache.clear()
    parts = buildOverlay(kind, g, b, hashSeed(7, id))
    overlayCache.set(id, parts)
  }
  return { id, parts }
}

const r2 = (n: number) => Math.round(n * 100) / 100
const dir = (deg: number) => ({ x: Math.sin(deg * Math.PI / 180), y: -Math.cos(deg * Math.PI / 180) })

export function buildModel(v: PlantVisual, uid: string, detail: Detail = 'full'): RenderModel {
  const scene = buildScene(v, detail)
  const dead = v.stage === 'dead'
  const base: PlantBase = { green: HEALTHY_GREEN, purple: v.purple, vigor: v.vigor, dead }
  const sl = stemLook(v.symptoms, base)
  const symbols = new Map<string, { id: string, silhouette: string, veins: string }>()
  const insets = new Map<string, { id: string, d: string }>()
  const overlays = new Map<string, { id: string, parts: OverlayPart[] }>()
  let elementCount = scene.stems.length + 6

  const makeLeaf = (
    nx: number, ny: number, rot: number, side: 1 | -1, len: number, fy: number, fingers: number,
    petLen: number, ctx: LeafCtx, back: boolean
  ): RenderLeaf => {
    const look = leafLook(v.symptoms, ctx, base)
    const { key, g } = geomFor(fingers, v.leafShape, look.pose)
    const symId = `${uid}-lf-${key}`
    if (!symbols.has(symId)) symbols.set(symId, { id: symId, silhouette: g.silhouette, veins: g.veins })
    const rotF = rot + side * look.angleDelta
    const d = dir(rotF)
    const d0 = dir(rot)
    const ox = nx + d.x * petLen
    const oy = ny + d.y * petLen
    const L = len * look.sizeMul
    const leaf: RenderLeaf = {
      transform: `translate(${r2(ox)} ${r2(oy)}) rotate(${r2(rotF)}) scale(${r2(side * L * fy)} ${r2(L)})`,
      symbol: symId,
      fill: back ? shade(look.fill, 0.72) : look.fill,
      vein: back ? shade(look.vein, 0.78) : look.vein,
      veinW: look.veinW,
      overlays: [],
      petiole: {
        d: `M${r2(nx)} ${r2(ny)}Q${r2(nx + d0.x * petLen * 0.5)} ${r2(ny + d0.y * petLen * 0.5)} ${r2(ox)} ${r2(oy)}`,
        w: Math.max(0.6, L * 0.035)
      }
    }
    elementCount += 3
    if (look.outer && look.inset > 0) {
      const inId = `${uid}-in-${key}-${look.inset}`
      if (!insets.has(inId)) insets.set(inId, { id: inId, d: insetPath(g, look.inset) })
      leaf.outer = back ? shade(look.outer, 0.72) : look.outer
      leaf.insetId = inId
      elementCount += 1
    }
    for (const o of look.overlays) {
      if (detail === 'thumb' && o.kind !== 'tip-burn') continue
      const ov = overlayFor(o.kind, g, key, o.bucket)
      const id = `${uid}-${ov.id}`
      if (!overlays.has(id)) overlays.set(id, { id, parts: ov.parts })
      leaf.overlays.push({ id, opacity: o.opacity })
      elementCount += 1
    }
    return leaf
  }

  const back: RenderLeaf[] = []
  const front: RenderLeaf[] = []
  for (const l of scene.leaves) {
    const leaf = makeLeaf(l.nx, l.ny, l.rot, l.side, l.len, l.fy, l.fingers, l.petLen, l.ctx, l.back)
    ;(l.back ? back : front).push(leaf)
  }

  const buds: RenderBud[] = []
  for (const b of scene.buds) {
    const look = budLook(v.symptoms, { purple: v.purple, pistils: v.pistils, frost: v.frost, vigor: v.vigor, dead }, b.jitter)
    const g = buildBud(b.len, b.width, v.budDensity, v.pistils, look, b.seed, detail)
    const rot = b.rot + (b.rot >= 0 ? 1 : -1) * 30 * look.droop
    const sugar = g.sugar.map(sg => makeLeaf(sg.x, sg.y, sg.rot, sg.side, sg.len, sg.fy, sg.fingers, sg.len * 0.12, { age: 1, isTop: true, sugar: true, jitter: sg.jitter }, false))
    elementCount += g.parts.length
    buds.push({ transform: `translate(${r2(b.x)} ${r2(b.y)}) rotate(${r2(rot)})`, parts: g.parts, sugar })
  }

  let stemDots: RenderModel['stemDots'] = null
  if ((sl.bugs > 0.05 || sl.powder > 0.05) && detail === 'full') {
    let d = ''
    const main = scene.stems.filter(s => s.order === 0)
    const cnt = Math.round(4 + 14 * Math.max(sl.bugs, sl.powder))
    for (let i = 0; i < cnt; i++) {
      const seg = main[(i * 7) % main.length]
      if (!seg || seg.pts.length < 2) continue
      const t = ((i * 0.618) % 1) * (seg.pts.length - 1)
      const a = seg.pts[Math.floor(t)]!
      const bb = seg.pts[Math.min(seg.pts.length - 1, Math.floor(t) + 1)]!
      const k = t - Math.floor(t)
      const x = a.x + (bb.x - a.x) * k + ((i % 2) ? 1 : -1) * seg.w * 0.4
      const y = a.y + (bb.y - a.y) * k
      const r = sl.bugs > sl.powder ? seg.w * 0.35 : seg.w * 0.5
      d += `M${r2(x - r)} ${r2(y)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0`
    }
    stemDots = { d, fill: sl.bugs > sl.powder ? '#efe9d8' : '#f3f3ec', opacity: 0.9 }
    elementCount += 1
  }

  return {
    w: scene.w,
    h: scene.h,
    scene,
    symbols: [...symbols.values()],
    insets: [...insets.values()],
    overlays: [...overlays.values()],
    stemColor: sl.stem,
    petioleColor: sl.petiole,
    stems: scene.stems,
    back,
    front,
    buds,
    stemDots,
    elementCount
  }
}

export const potPalette = {
  clay: '#6e4a38',
  clayDark: '#52372a',
  clayRim: '#805b47',
  soil: '#2d2217',
  soilDot: '#4b3a26',
  soilDark: '#1c150d',
  coco: '#6a4a2f',
  cocoDot: '#8f6845',
  bucket: '#1f2423',
  bucketLid: '#2b312e',
  bucketEdge: '#3a423e',
  pebble: '#b8805a',
  pebbleDark: '#7d5238',
  seed: '#5a3b22',
  seedStripe: '#2d1c0e',
  shoot: '#d7e6a8',
  cotyledon: '#79b254',
  cut: '#d4d8ad'
} as const

export function cotyledonColor(life: number): string {
  return mix(potPalette.cotyledon, '#b9b65a', Math.max(0, Math.min(1, (life - 0.08) * 6)))
}
