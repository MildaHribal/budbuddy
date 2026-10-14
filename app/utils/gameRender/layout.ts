// PlantVisual -> scene graph in SVG units (viewBox 0 0 SCENE_W SCENE_H).
// Everything is generated in cm (y up) from the seed, then fitted into the frame.
import type { Medium, PlantVisual, Stage } from '../../../shared/game/types'
import { lerp } from './color'
import { maxFingers } from './leafGeometry'
import { hashSeed, makeRng } from './prng'
import { plantMods, type LeafCtx } from './symptoms'

export const SCENE_W = 240
export const SCENE_H = 300
const PAD = 8
const MAX_SCALE = 9
/** closer camera for small plants; the pot may crop at the frame edge */
const MAX_ZOOM = 15

export type Detail = 'full' | 'thumb'

export interface LeafNode {
  /** attachment point on the stem */
  nx: number
  ny: number
  /** tip direction in degrees, 0 = up, positive = clockwise */
  rot: number
  side: 1 | -1
  len: number
  /** across-fan squash for perspective */
  fy: number
  fingers: number
  petLen: number
  ctx: LeafCtx
  back: boolean
  prio: number
  seed: number
}

export interface StemSeg {
  d: string
  w: number
  order: 0 | 1
  /** scene points along the segment, for things that sit on the stem */
  pts: { x: number, y: number }[]
}

export interface BudNode {
  x: number
  y: number
  rot: number
  len: number
  width: number
  isCola: boolean
  order: number
  seed: number
  jitter: number
}

export interface PotGeom {
  medium: Medium
  cx: number
  soilY: number
  w: number
  h: number
}

export interface Scene {
  w: number
  h: number
  s: number
  stage: Stage
  pot: PotGeom
  stems: StemSeg[]
  leaves: LeafNode[]
  buds: BudNode[]
  cotyledons?: { x: number, y: number, len: number }
  germ?: { x: number, y: number, size: number, progress: number }
  stump?: { x: number, y: number, w: number, h: number }
  /** scene y of the highest point of the canopy */
  canopyTop: number
}

type Pt = { x: number, y: number }

interface CmNode {
  p: Pt
  phi: number
  i: number
  order: 0 | 1
  axisId: number
}

interface CmLeaf {
  n: Pt
  rot: number
  side: 1 | -1
  len: number
  fy: number
  fingers: number
  age: number
  back: boolean
  prio: number
  seed: number
}

interface CmBud {
  p: Pt
  rot: number
  len: number
  width: number
  isCola: boolean
  order: number
  seed: number
  jitter: number
}

const toRad = (d: number) => d * Math.PI / 180
const dirOf = (phiDeg: number): Pt => ({ x: Math.sin(toRad(phiDeg)), y: Math.cos(toRad(phiDeg)) })

function potCm(medium: Medium, potL: number): { d: number, h: number } {
  const L = Math.max(0.3, potL || 11)
  if (medium === 'hydro') {
    const d = 9 * Math.cbrt(L) + 7
    return { d, h: d * 1.1 }
  }
  const d = 11 * Math.cbrt(L)
  return { d, h: d * 0.92 }
}

function fingersAt(i: number, cap: number, stage: Stage): number {
  if (i === 0) return stage === 'seedling' ? 1 : 3
  if (i === 1) return 3
  if (i === 2) return 5
  return Math.min(cap, 7 + 2 * Math.floor((i - 3) / 2))
}

export function buildScene(v: PlantVisual, detail: Detail = 'full'): Scene {
  const rng = makeRng(v.seed)
  const mods = plantMods(v.symptoms)
  const stage = v.stage
  const pot = potCm(v.medium, v.potL)
  const dead = stage === 'dead'
  const flowering = stage === 'flower' || stage === 'ripening' || dead
  const shape = Math.max(0, Math.min(1, v.leafShape))
  const cap = maxFingers(shape)

  const nodes: CmNode[] = []
  const segs: { pts: Pt[], w: number, order: 0 | 1 }[] = []
  const leaves: CmLeaf[] = []
  const buds: CmBud[] = []
  const apexes: { p: Pt, phi: number }[] = []

  let H = Math.max(1, v.heightCm) * mods.internode * mods.scale
  let n = Math.max(1, Math.min(22, Math.round(v.nodes)))
  if (stage === 'seedling') {
    n = Math.min(n, 3)
    H = Math.min(H, 9)
  }
  const stemW = Math.max(0.22, Math.min(1.7, 0.22 + H * 0.0085)) * mods.stemW * (0.9 + 0.3 * shape)
  const topped = stage === 'germination' || stage === 'seedling' ? 0 : Math.min(2, Math.max(0, Math.round(v.topped)))
  const lst = v.lst && stage !== 'germination' && stage !== 'seedling'
  const lstDir: 1 | -1 = rng() < 0.5 ? -1 : 1
  const internode = H / (n + 0.4)
  const leafMax = Math.max(3, Math.min(20, 3 + H * 0.17)) * lerp(1.05, 0.85, shape) * mods.leaf * (0.9 + 0.1 * v.leafiness)
  const Lb0 = internode
  let axisCounter = 0

  const growAxis = (start: Pt, phi0: number, count: number, iStart: number, splits: number, depth: number) => {
    const axisId = axisCounter++
    let phi = phi0
    let p = start
    const pts: Pt[] = [start]
    const own = splits > 0 && count >= 3 ? Math.max(1, Math.round(count * 0.45)) : count
    for (let j = 0; j < own; j++) {
      const i = iStart + j
      if (lst && depth === 0) phi = lstDir * Math.min(78, 24 * i)
      else if (dead) phi = phi * 0.6 + lstDir * Math.min(55, 9 * (i + depth * 3)) * 0.5
      else phi = phi * (depth > 0 ? 0.72 : 0.6) + rng.range(-5, 5)
      const d = dirOf(phi)
      const step = internode * (depth > 0 ? 0.85 : 1)
      p = { x: p.x + d.x * step, y: p.y + d.y * step }
      pts.push(p)
      nodes.push({ p, phi, i, order: 0, axisId })
    }
    if (own < count) {
      segs.push({ pts, w: stemW * (depth > 0 ? 0.75 : 1), order: 0 })
      const rest = count - own
      growAxis(p, phi + 24, rest, iStart + own, splits - 1, depth + 1)
      growAxis(p, phi - 24, rest, iStart + own, splits - 1, depth + 1)
      return
    }
    const d = dirOf(phi)
    const apex = { x: p.x + d.x * internode * 0.4, y: p.y + d.y * internode * 0.4 }
    pts.push(apex)
    segs.push({ pts, w: stemW * (depth > 0 ? 0.75 : 1), order: 0 })
    apexes.push({ p: apex, phi })
  }

  const leafSeed = () => Math.floor(rng() * 1e9)

  if (stage === 'germination' || stage === 'harvested') {
    // handled by sprites below
  } else {
    growAxis({ x: 0, y: 0 }, 0, n, 0, topped, 0)

    const maxMainY = Math.max(...nodes.map(q => q.p.y), 0)
    for (const node of nodes) {
      const ageNorm = n <= 1 ? 1 : node.i / (n - 1)
      const f = 0.5 + 0.5 * Math.pow(Math.sin(Math.PI * (node.i + 0.8) / (n + 0.6)), 0.6)
      const len = leafMax * f
      const fingers = fingersAt(node.i, cap, stage)
      const backSide: 1 | -1 = rng() < 0.5 ? -1 : 1
      const frontPair = node.i % 2 === 1 && stage !== 'seedling'
      for (const side of [-1, 1] as const) {
        if (frontPair) {
          // leaf pair turned toward the viewer: full fan, foreshortened along its length, hanging low
          const tilt = lerp(142, 118, ageNorm) + rng.range(-8, 8)
          leaves.push({
            n: node.p, rot: side * tilt, side, len: len * rng.range(0.55, 0.68), fy: rng.range(1.25, 1.5), fingers,
            age: ageNorm, back: side === backSide, prio: 2 + ageNorm, seed: leafSeed()
          })
          continue
        }
        const tilt = lerp(100, 62, ageNorm) + rng.range(-9, 9)
        leaves.push({
          n: node.p, rot: side * tilt, side, len: len * rng.range(0.8, 1), fy: rng.range(0.62, 0.95), fingers,
          age: ageNorm, back: side === backSide, prio: 2 + ageNorm, seed: leafSeed()
        })
      }
      // side branch: alternate sides, skip the top two nodes
      const isTopNode = node.i >= n - 2
      if (!isTopNode && detail === 'full' && n >= 3) {
        const side: 1 | -1 = node.i % 2 === 0 ? -1 : 1
        let Lb: number
        let a0: number
        if (lst) {
          Lb = Math.max(internode * 1.3, Math.min(internode * 3.4, maxMainY + internode * 2.4 - node.p.y))
          a0 = (node.i % 2 ? 1 : -1) * 9 - lstDir * 6
        } else {
          Lb = Math.min(H * 0.55, Lb0 * (1 + 2.6 * (1 - node.i / n)) * lerp(0.75, 1.1, shape))
          a0 = side * lerp(74, 44, ageNorm)
        }
        if (dead) a0 = side * 85
        const a1 = a0 * 0.3
        const d0 = dirOf(a0)
        const d1 = dirOf(a1)
        const p0 = node.p
        const p1 = { x: p0.x + d0.x * Lb * 0.55, y: p0.y + d0.y * Lb * 0.55 }
        const p2 = { x: p1.x + d1.x * Lb * 0.5, y: p1.y + d1.y * Lb * 0.5 }
        segs.push({ pts: [p0, p1, p2], w: stemW * 0.55, order: 1 })
        const nb = Lb > internode * 2.2 ? 2 : 1
        for (let j = 0; j < nb; j++) {
          const t = (j + 1) / (nb + (flowering ? 0.6 : 0.2))
          const bp = {
            x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
            y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y
          }
          const bAge = Math.max(0, Math.min(1, (node.i + 0.6 + 0.6 * j) / Math.max(1, n - 1)))
          const bl = len * 0.68 * (0.8 + 0.2 * j / nb)
          const bf = Math.max(3, fingers - 2)
          leaves.push({ n: bp, rot: side * (68 + rng.range(-10, 10)), side, len: bl, fy: rng.range(0.5, 0.85), fingers: bf, age: bAge, back: false, prio: 1 + bAge * 0.5, seed: leafSeed() })
          if (j === nb - 1 && !flowering && nb === 2) {
            leaves.push({ n: bp, rot: -side * (30 + rng.range(-10, 10)), side: (-side) as 1 | -1, len: bl * 0.6, fy: rng.range(0.65, 0.9), fingers: Math.max(3, bf - 2), age: bAge, back: true, prio: 0.5 + bAge * 0.5, seed: leafSeed() })
          }
        }
        if (flowering) {
          const sz = 0.28 + 0.45 * ageNorm
          buds.push({ p: p2, rot: a1, len: sz, width: sz, isCola: false, order: 1, seed: leafSeed(), jitter: rng() })
        }
      }
      // small axil buds on the upper main nodes
      if (flowering && detail === 'full' && ageNorm >= 0.7 && node.i < n - 1) {
        buds.push({ p: node.p, rot: node.phi + (node.i % 2 ? 26 : -26), len: 0.16, width: 0.22, isCola: false, order: 2, seed: leafSeed(), jitter: rng() })
      }
    }

    // apex: cola in flower, a tuft of young leaves otherwise
    const colaLen = (3 + 13 * v.budSize) * (stage === 'ripening' ? 1.08 : 1) / Math.pow(apexes.length, 0.25)
    for (const a of apexes) {
      if (flowering) {
        buds.push({ p: a.p, rot: a.phi, len: 1, width: 1, isCola: true, order: 0, seed: leafSeed(), jitter: rng() })
      } else {
        const tuft = detail === 'full' ? 3 : 2
        for (let t = 0; t < tuft; t++) {
          const rot = tuft === 3 ? (t - 1) * 28 : (t === 0 ? -24 : 24)
          const side: 1 | -1 = rot < 0 ? -1 : 1
          leaves.push({ n: a.p, rot: a.phi + rot + rng.range(-6, 6), side, len: leafMax * 0.42, fy: rng.range(0.7, 0.95), fingers: Math.min(cap, 5, fingersAt(n, cap, stage)), age: 1, back: t === 1, prio: 3, seed: leafSeed() })
        }
      }
    }
    for (const b of buds) {
      const base = b.isCola ? colaLen : colaLen * b.len
      b.len = Math.max(1.4, base)
      b.width = b.len * lerp(0.36, 0.55, v.budDensity) * (b.isCola ? 1 : 0.95)
    }
  }

  // --- leaf budget, leafiness and defoliation ---
  const budget = detail === 'thumb' ? 30 : 120
  let kept = leaves
  if (stage !== 'seedling') {
    const branchLeaves = kept.filter(l => l.prio < 2)
    const dropBranch = Math.round(branchLeaves.length * (1 - Math.max(0.25, v.leafiness)))
    const dropSet = new Set<CmLeaf>()
    const shuffled = [...branchLeaves].sort((a, b) => (hashSeed(a.seed) % 1000) - (hashSeed(b.seed) % 1000))
    for (let i = 0; i < dropBranch; i++) dropSet.add(shuffled[i]!)
    if (v.defoliated) {
      for (const l of kept) {
        if (l.prio < 2 && l.age < 0.75) dropSet.add(l)
        else if (l.prio < 3 && l.age < 0.6 && (hashSeed(l.seed, 'def') % 100) < 55) dropSet.add(l)
      }
    }
    kept = kept.filter(l => !dropSet.has(l))
  }
  if (kept.length > budget) {
    kept = [...kept].sort((a, b) => b.prio - a.prio || a.seed - b.seed).slice(0, budget)
  }

  // --- fit to frame ---
  let minX = -pot.d / 2
  let maxX = pot.d / 2
  let maxY = 0
  let plantMinX = 0
  let plantMaxX = 0
  for (const l of kept) {
    // petiole + blade reach about 1.5 leaf lengths from the node
    const reach = l.len * 1.5
    minX = Math.min(minX, l.n.x - reach)
    maxX = Math.max(maxX, l.n.x + reach)
    plantMinX = Math.min(plantMinX, l.n.x - reach)
    plantMaxX = Math.max(plantMaxX, l.n.x + reach)
    maxY = Math.max(maxY, l.n.y + l.len * 1.2)
  }
  for (const b of buds) {
    const dx = Math.abs(Math.sin(toRad(b.rot))) * b.len * 1.1 + b.width
    minX = Math.min(minX, b.p.x - dx)
    maxX = Math.max(maxX, b.p.x + dx)
    plantMinX = Math.min(plantMinX, b.p.x - dx)
    plantMaxX = Math.max(plantMaxX, b.p.x + dx)
    maxY = Math.max(maxY, b.p.y + Math.cos(toRad(b.rot)) * b.len * 1.15)
  }
  for (const sg of segs) for (const p of sg.pts) maxY = Math.max(maxY, p.y)
  if (stage === 'germination') maxY = Math.max(maxY, 2.5)
  if (stage === 'harvested') maxY = Math.max(maxY, 6)
  if (stage === 'seedling') maxY = Math.max(maxY, 4)
  const totalH = maxY + pot.h + 1
  const totalW = Math.max(pot.d * 1.1, maxX - minX + 1)
  let s = Math.min(MAX_SCALE, (SCENE_H - 2 * PAD) / totalH, (SCENE_W - 2 * PAD) / totalW)
  // small plant: move the camera in and let the pot crop at the frame
  if (maxY * s < SCENE_H * 0.42 && (plantMaxX - plantMinX) * s < SCENE_W * 0.6) {
    s = Math.min(stage === 'germination' ? 40 : MAX_ZOOM, (SCENE_H * 0.5) / Math.max(maxY, 2.5), (SCENE_W - 2 * PAD) / Math.max(plantMaxX - plantMinX + 1, 4))
  }
  const soilY = SCENE_H - PAD - Math.min(pot.h * s, SCENE_H * 0.4)
  const cx = SCENE_W / 2 - s * (minX + maxX) / 2
  const X = (x: number) => cx + s * x
  const Y = (y: number) => soilY - s * y

  const stems: StemSeg[] = segs.map((sg) => {
    const pts = sg.pts.map(p => ({ x: X(p.x), y: Y(p.y) }))
    let d: string
    if (sg.order === 1 && pts.length === 3) {
      d = `M${f(pts[0]!)}Q${f(pts[1]!)} ${f(pts[2]!)}`
    } else {
      d = `M${f(pts[0]!)}`
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!
        const b = pts[i]!
        d += `C${f({ x: a.x, y: a.y - (b.y - a.y) * -0.35 })} ${f({ x: b.x, y: b.y + (b.y - a.y) * -0.35 })} ${f(b)}`
      }
    }
    return { d, w: Math.max(0.9, sg.w * s), order: sg.order, pts }
  })

  let canopyTop = soilY
  for (const l of kept) canopyTop = Math.min(canopyTop, Y(l.n.y))
  for (const b of buds) canopyTop = Math.min(canopyTop, Y(b.p.y))
  const canopyH = Math.max(1, soilY - canopyTop)

  const outLeaves: LeafNode[] = kept.map((l) => {
    const ny = Y(l.n.y)
    const isTop = (ny - canopyTop) / canopyH < 0.25
    return {
      nx: X(l.n.x), ny, rot: l.rot, side: l.side, len: l.len * s, fy: l.fy, fingers: l.fingers,
      petLen: l.len * s * 0.45,
      ctx: { age: l.age, isTop, sugar: false, jitter: (hashSeed(l.seed, 'j') % 1000) / 1000 },
      back: l.back, prio: l.prio, seed: l.seed
    }
  })

  const outBuds: BudNode[] = buds.map(b => ({
    x: X(b.p.x), y: Y(b.p.y), rot: b.rot, len: b.len * s, width: b.width * s, isCola: b.isCola, order: b.order, seed: b.seed, jitter: b.jitter
  }))

  const scene: Scene = {
    w: SCENE_W, h: SCENE_H, s, stage,
    pot: { medium: v.medium, cx: X(0), soilY, w: pot.d * s, h: pot.h * s },
    stems, leaves: outLeaves, buds: outBuds, canopyTop
  }
  if (stage === 'germination') {
    scene.germ = { x: X(0), y: soilY, size: Math.max(6, 0.55 * s), progress: Math.max(0, Math.min(1, v.life / 0.04)) }
  }
  if (stage === 'seedling') {
    scene.cotyledons = { x: X(0), y: Y(Math.min(1.2, internode * 0.5)), len: Math.max(3, 1.1 * s) }
  }
  if (stage === 'harvested') {
    scene.stump = { x: X(0), y: soilY, w: Math.max(1.5, stemW * s * 1.2), h: 5 * s }
  }
  return scene
}

const f = (p: Pt) => `${r2(p.x)} ${r2(p.y)}`
const r2 = (n: number) => Math.round(n * 100) / 100
