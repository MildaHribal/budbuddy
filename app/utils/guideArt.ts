// Procedural cannabis fan-leaf geometry for the guide illustrations.

export const ART = {
  leaf: '#9be36b',
  leafDeep: '#5fb04a',
  lamp: '#ffd28a',
  text: '#e9f3e4',
  muted: '#8d9a8a',
  yellow: '#e8d96a',
  pale: '#f2edc8',
  lime: '#dbe58c',
  burn: '#b9773e',
  rust: '#d9a76a',
  purple: '#c9a2ff',
  magenta: '#d27bd0',
  water: '#7cc8f2',
  soil: '#8a6a4c',
  pest: '#ff8a5c'
} as const

type Pt = [number, number]

export interface LeafletShape {
  outline: string
  midrib: string
  veins: string
  tip: Pt
  /** point at 55 % along the midrib */
  mid: Pt
  length: number
}

export interface LeafletOpts {
  length: number
  width: number
  /** degrees, 0 = straight up, positive = clockwise */
  angle: number
  /** downward pull along the length (droop) */
  droop?: number
  /** sideways bend relative to the leaflet (twist/crinkle) */
  bend?: number
  teeth?: number
}

const f = (n: number) => Math.round(n * 10) / 10
const pt = (p: Pt) => `${f(p[0])} ${f(p[1])}`

function halfWidth(t: number): number {
  // narrow base, widest ~40 %, long tapering tip; peak normalised to 1
  const raw = Math.pow(t, 0.75) * Math.pow(1 - t, 1.15)
  return raw / 0.2865
}

export function leaflet(o: LeafletOpts): LeafletShape {
  const a = (o.angle * Math.PI) / 180
  const d: Pt = [Math.sin(a), -Math.cos(a)]
  const n: Pt = [Math.cos(a), Math.sin(a)]
  const L = o.length
  const g = o.droop ?? 0
  const b = o.bend ?? 0
  const W = o.width / 2

  const c = (t: number): Pt => [
    d[0] * L * t + n[0] * b * L * t * t,
    d[1] * L * t + n[1] * b * L * t * t + g * L * t * t
  ]
  const side = (t: number, k: number, s: 1 | -1): Pt => {
    const tx = d[0] * L + n[0] * 2 * b * L * t
    const ty = d[1] * L + n[1] * 2 * b * L * t + 2 * g * L * t
    const m = Math.hypot(tx, ty) || 1
    const p = c(t)
    const w = W * halfWidth(t) * k * s
    return [p[0] - (ty / m) * w, p[1] + (tx / m) * w]
  }

  const teeth = o.teeth ?? Math.max(6, Math.round(L / 6))
  const right: Pt[] = []
  const left: Pt[] = []
  const t0 = 0.06
  const t1 = 0.96
  for (let i = 0; i < teeth; i++) {
    const ta = t0 + ((t1 - t0) * i) / teeth
    const tb = t0 + ((t1 - t0) * (i + 0.85)) / teeth
    right.push(side(ta, 0.8, 1), side(tb, 1, 1))
    left.push(side(ta, 0.8, -1), side(tb, 1, -1))
  }
  const base = c(0)
  const tip = c(1)
  const outline = `M${pt(base)}L${right.map(pt).join('L')}L${pt(tip)}L${left.reverse().map(pt).join('L')}Z`

  const ribPts = Array.from({ length: 9 }, (_, i) => c(i / 8))
  const midrib = `M${ribPts.map(pt).join('L')}`

  const veins: string[] = []
  const vc = Math.max(3, Math.round(teeth / 2))
  for (let i = 1; i < vc; i++) {
    const t = 0.1 + (0.78 * i) / vc
    const from = c(t)
    for (const s of [1, -1] as const) veins.push(`M${pt(from)}L${pt(side(Math.min(t + 0.07, 0.98), 0.88, s))}`)
  }

  return { outline, midrib, veins: veins.join(''), tip, mid: c(0.55), length: L }
}

export interface FanLeafOpts {
  size: number
  count?: 5 | 7
  droop?: number
  /** extra leaflet width factor (fat = overwatered, thin = wilted) */
  plump?: number
  /** spread factor for leaflet angles */
  spread?: number
  /** per-leaflet sideways bend amplitude (crinkle/twist) */
  wobble?: number
}

export function fanLeaf(o: FanLeafOpts): LeafletShape[] {
  const count = o.count ?? 7
  const spread = o.spread ?? 1
  const rows = count === 7
    ? [[0, 1], [27, 0.86], [55, 0.66], [88, 0.38]]
    : [[0, 1], [32, 0.82], [70, 0.5]]
  const out: LeafletShape[] = []
  rows.forEach(([ang, len], i) => {
    for (const s of i === 0 ? [1] : [-1, 1]) {
      const L = o.size * (len as number)
      const k = i * 2 + (s > 0 ? 0 : 1)
      out.push(leaflet({
        length: L,
        width: L * 0.21 * (o.plump ?? 1),
        angle: (ang as number) * spread * s,
        droop: (o.droop ?? 0) * (0.6 + (ang as number) / 220),
        bend: o.wobble ? o.wobble * (k % 2 ? 1 : -1) * (0.6 + (k % 3) * 0.3) : 0
      }))
    }
  })
  // draw small side leaflets first so the centre one sits on top
  return out.reverse()
}

/** Deterministic pseudo-random points inside a leaflet, along its midrib. */
export function scatter(shape: LeafletShape, count: number, seed: number): Pt[] {
  let x = seed * 9301 + 49297
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280)
  const [tx, ty] = shape.tip
  const pts: Pt[] = []
  for (let i = 0; i < count; i++) {
    const t = 0.2 + rnd() * 0.65
    const off = (rnd() - 0.5) * shape.length * 0.12
    const m = Math.hypot(tx, ty) || 1
    pts.push([tx * t - (ty / m) * off, ty * t + (tx / m) * off])
  }
  return pts
}
