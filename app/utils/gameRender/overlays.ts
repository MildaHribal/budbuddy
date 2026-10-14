// Symptom overlays in leaf-local unit coords. Each is a few paths with fixed colours,
// placed by (s,u) sampling inside the leaflets so nothing needs a clip path.
import { dot, ellipse, fmt, tipsPath, type LeafGeometry, type Pt } from './leafGeometry'
import { makeRng, type Rng } from './prng'

export type OverlayKind
  = | 'tip-burn' | 'rust-spots' | 'necrotic-spots' | 'bronze-patches' | 'stipple' | 'silver-streaks'
    | 'insects' | 'powder' | 'leaf-trails' | 'chewed' | 'sticky' | 'webbing'

export type Bucket = 1 | 2 | 3

export interface OverlayPart {
  d: string
  fill?: string
  stroke?: string
  sw?: number
  opacity?: number
}

/** Background of the app; chewed holes are painted with it. */
export const GROUND = '#0e100f'

const per = (b: Bucket, a: number, c: number, d: number) => (b === 1 ? a : b === 2 ? c : d)

function pickLeaflet(g: LeafGeometry, rng: Rng): number {
  const total = g.leaflets.reduce((acc, l) => acc + l.len, 0)
  let r = rng() * total
  for (let i = 0; i < g.leaflets.length; i++) {
    r -= g.leaflets[i]!.len
    if (r <= 0) return i
  }
  return g.leaflets.length - 1
}

function inside(g: LeafGeometry, rng: Rng, sLo = 0.12, sHi = 0.9, uMax = 0.75): { p: Pt, k: number, s: number } {
  const k = pickLeaflet(g, rng)
  const s = rng.range(sLo, sHi)
  return { p: g.sample(k, s, rng.range(-uMax, uMax)), k, s }
}

const leafletDeg = (g: LeafGeometry, k: number) => g.leaflets[k]!.angle * 180 / Math.PI - 90

export function buildOverlay(kind: OverlayKind, g: LeafGeometry, b: Bucket, seed: number): OverlayPart[] {
  const rng = makeRng(seed)
  const sum = g.leaflets.reduce((acc, l) => acc + l.len, 0)
  const n = (a: number, c: number, d: number) => Math.max(1, Math.round(per(b, a, c, d) * sum))
  const parts: OverlayPart[] = []

  switch (kind) {
    case 'tip-burn': {
      parts.push({ d: tipsPath(g, per(b, 0.09, 0.18, 0.3)), fill: '#8f5a26' })
      if (b >= 2) parts.push({ d: tipsPath(g, per(b, 0, 0.07, 0.14)), fill: '#4a2c15' })
      break
    }
    case 'rust-spots': {
      let d = ''
      let core = ''
      for (let i = 0; i < n(4, 9, 16); i++) {
        const q = inside(g, rng)
        const r = rng.range(0.015, 0.03)
        d += dot(q.p, r)
        if (b >= 2) core += dot(q.p, r * 0.45)
      }
      parts.push({ d, fill: '#a3521c' })
      if (core) parts.push({ d: core, fill: '#5a2a0e' })
      break
    }
    case 'necrotic-spots': {
      let halo = ''
      let d = ''
      for (let i = 0; i < n(2, 4, 7); i++) {
        const q = inside(g, rng)
        const rx = rng.range(0.022, 0.042)
        const rot = rng.range(0, 180)
        halo += ellipse(q.p, rx * 1.5, rx * 1.05, rot)
        d += ellipse(q.p, rx, rx * 0.7, rot)
      }
      parts.push({ d: halo, fill: '#c8b448', opacity: 0.8 })
      parts.push({ d, fill: '#3d2a19' })
      break
    }
    case 'bronze-patches': {
      let d = ''
      for (let i = 0; i < n(1.2, 2.4, 4); i++) {
        const q = inside(g, rng, 0.2, 0.85, 0.85)
        const rx = rng.range(0.05, 0.1)
        d += ellipse(q.p, rx, rx * rng.range(0.45, 0.75), leafletDeg(g, q.k) + rng.range(-25, 25))
      }
      parts.push({ d, fill: '#a86a2c', opacity: 0.85 })
      break
    }
    case 'stipple': {
      let d = ''
      for (let i = 0; i < n(22, 50, 90); i++) {
        const q = inside(g, rng, 0.08, 0.95, 0.85)
        d += dot(q.p, rng.range(0.007, 0.011))
      }
      parts.push({ d, fill: '#e8f0cc' })
      break
    }
    case 'silver-streaks': {
      let d = ''
      let frass = ''
      for (let i = 0; i < n(2, 4, 7); i++) {
        const q = inside(g, rng, 0.15, 0.85, 0.7)
        d += ellipse(q.p, rng.range(0.03, 0.065), rng.range(0.008, 0.014), leafletDeg(g, q.k) + rng.range(-18, 18))
        if (b >= 2) frass += dot(g.sample(q.k, q.s + rng.range(-0.05, 0.05), rng.range(-0.6, 0.6)), 0.004)
      }
      parts.push({ d, fill: '#e2e6da', opacity: 0.9 })
      if (frass) parts.push({ d: frass, fill: '#26251a' })
      break
    }
    case 'insects': {
      let body = ''
      let hi = ''
      for (let i = 0; i < n(3, 6, 11); i++) {
        const q = inside(g, rng, 0.08, 0.65, 0.5)
        const rot = rng.range(0, 180)
        body += ellipse(q.p, 0.016, 0.01, rot)
        hi += dot({ x: q.p.x + Math.cos(rot * Math.PI / 180) * 0.012, y: q.p.y + Math.sin(rot * Math.PI / 180) * 0.012 }, 0.005)
      }
      parts.push({ d: body, fill: '#e6e2c0' })
      parts.push({ d: hi, fill: '#2a2d1c' })
      break
    }
    case 'powder': {
      let d = ''
      for (let i = 0; i < n(1.5, 3, 5); i++) {
        const q = inside(g, rng, 0.18, 0.8, 0.55)
        const m = rng.int(5, 9)
        for (let j = 0; j < m; j++) {
          d += dot({ x: q.p.x + rng.range(-0.045, 0.045), y: q.p.y + rng.range(-0.045, 0.045) }, rng.range(0.014, 0.03))
        }
      }
      parts.push({ d, fill: '#f3f3ec', opacity: 0.82 })
      break
    }
    case 'leaf-trails': {
      let d = ''
      for (let i = 0; i < n(0.8, 1.6, 3); i++) {
        const k = pickLeaflet(g, rng)
        let s = rng.range(0.15, 0.5)
        let u = rng.range(-0.6, 0.6)
        d += `M${fmt(g.sample(k, s, u))}`
        for (let j = 0; j < rng.int(4, 6); j++) {
          const s2 = Math.min(0.9, s + rng.range(0.05, 0.12))
          const u2 = Math.max(-0.8, Math.min(0.8, u + rng.range(-0.5, 0.5)))
          const c = g.sample(k, (s + s2) / 2, u + rng.range(-0.4, 0.4))
          d += `Q${fmt(c)} ${fmt(g.sample(k, s2, u2))}`
          s = s2
          u = u2
        }
      }
      parts.push({ d, stroke: '#eef0c8', sw: 0.02 })
      break
    }
    case 'chewed': {
      let rim = ''
      let hole = ''
      for (let i = 0; i < n(1.5, 3, 5); i++) {
        const k = pickLeaflet(g, rng)
        const s = rng.range(0.2, 0.92)
        const side = rng() < 0.5 ? -1 : 1
        const p = g.sample(k, s, side * 1.02)
        const r = rng.range(0.028, 0.05) * g.leaflets[k]!.len
        rim += dot(p, r + 0.007)
        hole += dot(p, r)
      }
      if (b >= 2) {
        for (let i = 0; i < n(0, 1, 2); i++) {
          const q = inside(g, rng, 0.25, 0.8, 0.5)
          const r = rng.range(0.016, 0.028)
          rim += dot(q.p, r + 0.006)
          hole += dot(q.p, r)
        }
      }
      parts.push({ d: rim, fill: '#5c4522' })
      parts.push({ d: hole, fill: GROUND })
      break
    }
    case 'sticky': {
      let d = ''
      for (let i = 0; i < n(4, 8, 14); i++) {
        const q = inside(g, rng, 0.1, 0.9, 0.8)
        d += dot(q.p, rng.range(0.012, 0.024))
      }
      parts.push({ d, fill: '#ffffff', opacity: 0.7 })
      if (b === 3) {
        let soot = ''
        for (let i = 0; i < n(0, 0, 8); i++) soot += dot(inside(g, rng).p, rng.range(0.004, 0.008))
        parts.push({ d: soot, fill: '#17150f', opacity: 0.85 })
      }
      break
    }
    case 'webbing': {
      let d = ''
      let mites = ''
      const tips = g.tips
      for (let i = 0; i < tips.length - 1; i++) {
        const a = tips[i]!
        const c = tips[i + 1]!
        const mid = { x: (a.x + c.x) / 2 + rng.range(-0.02, 0.02), y: (a.y + c.y) / 2 + rng.range(0.01, 0.05) }
        d += `M${fmt(a)}Q${fmt(mid)} ${fmt(c)}`
        if (b >= 2) {
          const inner = g.sample(i, rng.range(0.4, 0.7), rng.range(-0.3, 0.3))
          d += `M${fmt(a)}L${fmt(inner)}`
        }
      }
      if (b === 3) {
        for (let i = 0; i < tips.length; i++) {
          d += `M${fmt(tips[i]!)}L${fmt(g.sample(i, 0.15, 0))}`
          mites += dot(g.sample(i, rng.range(0.5, 0.95), rng.range(-0.5, 0.5)), 0.006)
        }
      }
      parts.push({ d, stroke: '#f8f8f2', sw: 0.009, opacity: 0.8 })
      if (mites) parts.push({ d: mites, fill: '#f0e2c8' })
      break
    }
  }
  return parts
}
