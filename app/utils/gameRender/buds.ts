// Bud (cola) geometry in bud-local scene units: base at (0,0), growing toward -y.
import { dot, ellipse, fmt, type Pt } from './leafGeometry'
import { makeRng } from './prng'
import type { BudLook } from './symptoms'

export interface BudPart {
  d: string
  fill?: string
  stroke?: string
  sw?: number
  opacity?: number
}

export interface SugarLeaf {
  x: number
  y: number
  rot: number
  side: 1 | -1
  len: number
  fy: number
  fingers: number
  jitter: number
}

export interface BudGeometry {
  parts: BudPart[]
  sugar: SugarLeaf[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

function tear(c: Pt, w: number, h: number, deg: number): string {
  const a = deg * Math.PI / 180
  const cs = Math.cos(a)
  const sn = Math.sin(a)
  const P = (x: number, y: number) => `${r2(c.x + x * cs - y * sn)} ${r2(c.y + x * sn + y * cs)}`
  return `M${P(0, -h)}C${P(0.55 * w, -0.6 * h)} ${P(0.58 * w, 0.15 * h)} ${P(0, 0.28 * h)}C${P(-0.58 * w, 0.15 * h)} ${P(-0.55 * w, -0.6 * h)} ${P(0, -h)}Z`
}

export function buildBud(len: number, width: number, density: number, pistils: number, look: BudLook, seed: number, detail: 'full' | 'thumb'): BudGeometry {
  const rng = makeRng(seed)
  const ch = Math.max(1.2, width * 0.5)
  const dy = ch * 0.5 * (1.3 - 0.4 * density)
  const rows = Math.max(3, Math.ceil(len / dy))
  const calyx: string[] = []
  const tips: string[] = []
  const pistil: string[] = []
  const frost: string[] = []
  const centers: { p: Pt, deg: number, wr: number }[] = []

  const widthAt = (t: number) => Math.max(0.3 * width, width * Math.sqrt(Math.max(0, 1 - t * t)) * (t < 0.12 ? 0.75 + 2 * t : 1))

  for (let r = 0; r < rows; r++) {
    const t = r / rows
    const y = -r * dy - ch * 0.2
    const wr = widthAt(t)
    const m = Math.max(1, Math.round(wr / (ch * 0.72)))
    const zig = (r % 2) * ch * 0.3
    for (let c = 0; c < m; c++) {
      const x = (c - (m - 1) / 2) * (ch * 0.72) + zig + rng.range(-ch * 0.08, ch * 0.08)
      const deg = (x / Math.max(wr / 2, 0.1)) * 38 + rng.range(-6, 6)
      const h = ch * rng.range(0.9, 1.1)
      centers.push({ p: { x, y }, deg, wr })
      calyx.push(tear({ x, y }, ch * 0.78, h, deg))
      tips.push(tear({ x: x - Math.sin(deg * Math.PI / 180) * h * 0.45, y: y - Math.cos(deg * Math.PI / 180) * h * 0.45 }, ch * 0.42, h * 0.5, deg))
      if (detail === 'full' || r % 2 === 0) {
        const ripe = pistils
        const pl = ch * (1.05 - 0.45 * ripe) * rng.range(0.8, 1.15)
        const sgn = x >= 0 ? 1 : -1
        const tip = { x: x - Math.sin(deg * Math.PI / 180) * h, y: y - Math.cos(deg * Math.PI / 180) * h }
        const out = { x: sgn * pl * rng.range(0.3, 0.7), y: -pl * (0.55 - 0.4 * ripe) }
        const end = { x: tip.x + out.x, y: tip.y + out.y + ripe * pl * 0.35 }
        const ctl = { x: tip.x + out.x * 0.3, y: tip.y - pl * 0.6 }
        pistil.push(`M${fmt(tip)}Q${fmt(ctl)} ${fmt(end)}`)
      }
      if (detail === 'full' && look.frost > 0.05) {
        for (let k = 0; k < 3; k++) {
          frost.push(dot({ x: x + rng.range(-ch * 0.3, ch * 0.3), y: y - rng.range(0, h * 0.8) }, ch * rng.range(0.04, 0.07)))
        }
      }
    }
  }

  const parts: BudPart[] = []
  parts.push({ d: calyx.join(''), fill: look.calyx, stroke: shadeHex(look.calyx, 0.66), sw: Math.max(0.35, ch * 0.07) })
  parts.push({ d: tips.join(''), fill: look.calyxTip, opacity: 0.85 })
  parts.push({ d: pistil.join(''), stroke: look.pistil, sw: Math.max(0.5, ch * 0.12) })
  if (frost.length) parts.push({ d: frost.join(''), fill: '#f6f7f0', opacity: 0.12 + 0.5 * look.frost })

  // sugar leaves: bigger low on the bud, pointing out and up
  const sugar: SugarLeaf[] = []
  const levels = detail === 'thumb' ? [0.3] : len > ch * 5 ? [0.12, 0.42, 0.72] : [0.2, 0.6]
  for (const t of levels) {
    for (const side of [-1, 1] as const) {
      if (detail === 'full' && rng() < 0.2) continue
      const wr = widthAt(t)
      const y = -t * len
      sugar.push({
        x: side * wr * 0.32, y, side, rot: side * (58 + rng.range(-12, 12)),
        len: ch * (2.1 + 1.6 * (1 - t)), fy: rng.range(0.6, 0.9), fingers: t < 0.3 && len > ch * 5 ? 5 : 3, jitter: rng()
      })
    }
  }

  // symptoms on the bud
  if (look.foxtails > 0.05) {
    const spires = 1 + Math.round(2 * look.foxtails)
    let fd = ''
    let fp = ''
    for (let i = 0; i < spires; i++) {
      const x0 = (i - (spires - 1) / 2) * width * 0.3 + rng.range(-width * 0.08, width * 0.08)
      const hgt = len * (0.22 + 0.3 * look.foxtails) * rng.range(0.8, 1.2)
      const cnt = Math.max(2, Math.round(hgt / (ch * 0.42)))
      for (let k = 0; k < cnt; k++) {
        const y = -len * 0.92 - k * ch * 0.42
        const deg = rng.range(-12, 12) + (k % 2 ? 15 : -15)
        fd += tear({ x: x0 + (k % 2 ? 0.18 : -0.18) * ch, y }, ch * 0.5, ch * 0.75, deg)
        fp += `M${r2(x0)} ${r2(y - ch * 0.7)}q${r2(ch * 0.25 * (k % 2 ? 1 : -1))} ${r2(-ch * 0.4)} ${r2(ch * 0.4 * (k % 2 ? 1 : -1))} ${r2(-ch * 0.5)}`
      }
    }
    parts.push({ d: fp, stroke: look.pistil, sw: Math.max(0.4, ch * 0.09) })
    parts.push({ d: fd, fill: shadeHex(look.calyx, 1.28), stroke: shadeHex(look.calyx, 0.72), sw: Math.max(0.3, ch * 0.05) })
  }
  if (look.nanners > 0.05) {
    const cnt = 2 + Math.round(6 * look.nanners)
    let nd = ''
    for (let i = 0; i < cnt; i++) {
      const c = centers[rng.int(0, centers.length - 1)]!
      const sgn = c.p.x >= 0 ? 1 : -1
      const p = { x: c.p.x + sgn * ch * 0.35, y: c.p.y - ch * 0.5 }
      nd += ellipse(p, ch * 0.36, ch * 0.13, sgn * -40 + rng.range(-15, 15))
    }
    parts.push({ d: nd, fill: '#e9dc4e', stroke: '#b9a72a', sw: Math.max(0.25, ch * 0.04) })
  }
  if (look.mold > 0.05) {
    const e = look.mold
    const cy = -len * rng.range(0.35, 0.6)
    const rad = Math.max(ch * 1.2, len * 0.2 * (0.6 + 0.8 * e))
    let brown = ''
    let fuzz = ''
    let rot = ''
    for (let i = 0; i < 4 + Math.round(4 * e); i++) {
      brown += ellipse({ x: rng.range(-rad * 0.5, rad * 0.5), y: cy + rng.range(-rad * 0.6, rad * 0.6) }, rad * rng.range(0.35, 0.6), rad * rng.range(0.25, 0.45), rng.range(0, 180))
    }
    for (let i = 0; i < 10 + Math.round(18 * e); i++) {
      fuzz += dot({ x: rng.range(-rad * 0.7, rad * 0.7), y: cy + rng.range(-rad * 0.8, rad * 0.8) }, ch * rng.range(0.07, 0.14))
    }
    if (e > 0.6) {
      for (let i = 0; i < 3; i++) rot += ellipse({ x: rng.range(-rad * 0.3, rad * 0.3), y: cy + rng.range(-rad * 0.3, rad * 0.3) }, rad * 0.3, rad * 0.22, rng.range(0, 180))
    }
    parts.push({ d: brown, fill: '#6e5440', opacity: 0.92 })
    if (rot) parts.push({ d: rot, fill: '#3b2c22' })
    parts.push({ d: fuzz, fill: '#bdb8ab', opacity: 0.9 })
  }
  if (look.powder > 0.05) {
    let pd = ''
    for (let i = 0; i < 2 + Math.round(5 * look.powder); i++) {
      const c = centers[rng.int(0, centers.length - 1)]!
      for (let k = 0; k < 6; k++) pd += dot({ x: c.p.x + rng.range(-ch * 0.5, ch * 0.5), y: c.p.y + rng.range(-ch * 0.6, ch * 0.2) }, ch * rng.range(0.12, 0.22))
    }
    parts.push({ d: pd, fill: '#f3f3ec', opacity: 0.85 })
  }
  if (look.webbing > 0.05) {
    let wd = ''
    let md = ''
    const strands = 4 + Math.round(8 * look.webbing)
    for (let i = 0; i < strands; i++) {
      const a = centers[rng.int(0, centers.length - 1)]!
      const b = centers[rng.int(0, centers.length - 1)]!
      const pa = { x: a.p.x + (a.p.x >= 0 ? 1 : -1) * a.wr * 0.3, y: a.p.y }
      const pb = { x: b.p.x + (b.p.x >= 0 ? 1 : -1) * b.wr * 0.3, y: b.p.y }
      wd += `M${fmt(pa)}Q${fmt({ x: (pa.x + pb.x) / 2 + rng.range(-ch, ch), y: (pa.y + pb.y) / 2 + rng.range(-ch, ch) })} ${fmt(pb)}`
      if (look.webbing > 0.5) md += dot({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, ch * 0.08)
    }
    parts.push({ d: wd, stroke: '#f6f6f0', sw: Math.max(0.3, ch * 0.05), opacity: 0.65 })
    if (md) parts.push({ d: md, fill: '#f0e2c8' })
  }
  return { parts, sugar }
}

function shadeHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1)))).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}
