// Cannabis fan leaf geometry in leaf-local unit coords: leaflets join at (0,0),
// the central leaflet tip is at (0,-1), the petiole attaches from +y.
// Local +x is "down" once the renderer rotates the leaf sideways, so poses bend toward +x.

export type Pt = { x: number, y: number }
export type PoseKind = 'none' | 'claw' | 'taco' | 'curl-down' | 'curl-up' | 'twist' | 'wilt'
export interface Pose { kind: PoseKind, amount: number }

export interface Leaflet {
  k: number
  angle: number
  len: number
  halfW: number
  teeth: number
}

export interface LeafGeometry {
  fingers: number
  shape: number
  pose: Pose
  silhouette: string
  veins: string
  leaflets: Leaflet[]
  tips: Pt[]
  /** point inside leaflet k at progress s (0 base..1 tip) and across u (-1 left edge..1 right edge) */
  sample: (k: number, s: number, u: number) => Pt
}

const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString()
export const fmt = (p: Pt) => `${f3(p.x)} ${f3(p.y)}`

const PROFILE_NORM = 0.475
/** Lanceolate half-width profile, widest at ~40 % of the length. */
export function widthProfile(t: number): number {
  if (t <= 0 || t >= 1) return 0
  return (Math.pow(t, 0.45) * Math.pow(1 - t, 0.65)) / PROFILE_NORM
}

/** Leaflet count realistic for the strain: sativa up to 11, indica up to 7. */
export function maxFingers(shape: number): number {
  const f = Math.round(11 - 4 * shape)
  return f % 2 === 0 ? f - 1 : f
}

export function fanLayout(fingers: number, shape: number): Leaflet[] {
  const n = Math.max(1, fingers | 1)
  const kmax = (n - 1) / 2
  const outerDeg = n === 1 ? 0 : n === 3 ? 42 : 90 - 16 * shape
  const ratio = 0.07 + 0.085 * shape
  const out: Leaflet[] = []
  for (let k = -kmax; k <= kmax; k++) {
    const rel = kmax === 0 ? 0 : Math.abs(k) / kmax
    const len = 1 - 0.5 * Math.pow(rel, 1.4)
    out.push({
      k,
      angle: (k / (kmax || 1)) * outerDeg * Math.PI / 180,
      len,
      halfW: len * ratio * (1 + 0.12 * rel),
      teeth: Math.round(6 + 9 * len)
    })
  }
  return out
}

function toLeaf(l: Leaflet, u: number, v: number): Pt {
  const c = Math.cos(l.angle)
  const s = Math.sin(l.angle)
  return { x: u * c + v * s, y: u * s - v * c }
}

function deform(p: Pt, s: number, l: Leaflet, pose: Pose): Pt {
  const a = pose.amount
  if (pose.kind === 'none' || a <= 0) return p
  const L = l.len
  switch (pose.kind) {
    case 'claw':
      return { x: p.x + a * 0.42 * L * Math.pow(s, 3), y: p.y + a * 0.12 * L * Math.pow(s, 3) }
    case 'curl-down':
      return { x: p.x + a * 0.3 * L * Math.pow(s, 1.8), y: p.y }
    case 'curl-up':
      return { x: p.x - a * 0.3 * L * Math.pow(s, 1.8), y: p.y }
    case 'wilt':
      return { x: p.x + a * 0.42 * L * Math.pow(s, 1.6), y: p.y + a * 0.12 * L * s * s }
    case 'twist':
      return { x: p.x + a * 0.11 * L * Math.sin(s * 7 + l.k * 1.3) * s, y: p.y + a * 0.04 * L * Math.cos(s * 5 + l.k) * s }
    case 'taco':
      return { x: p.x + a * 0.05 * L * s * s, y: p.y }
  }
  return p
}

export function widthMul(pose: Pose): number {
  if (pose.kind === 'taco') return 1 - 0.55 * pose.amount
  if (pose.kind === 'twist') return 1 - 0.3 * pose.amount
  return 1
}

/** Serrated outline of one leaflet, closed polygon with progress s per point. */
export function leafletOutline(l: Leaflet, pose: Pose, teeth = l.teeth, wm = widthMul(pose)): { p: Pt, s: number }[] {
  const right: { p: Pt, s: number }[] = []
  const left: { p: Pt, s: number }[] = []
  const hw = l.halfW * wm
  const depth = (t: number) => hw * 0.32 * Math.max(0, Math.min(1, Math.min(t * 6, (1 - t) * 4)))
  const push = (t: number, dx: number) => {
    const w = hw * widthProfile(t) + dx
    const v = t * l.len
    right.push({ p: deform(toLeaf(l, w, v), t, l, pose), s: t })
    left.push({ p: deform(toLeaf(l, -w, v), t, l, pose), s: t })
  }
  push(0, 0)
  const n = Math.max(3, teeth)
  const dt = 1 / n
  for (let i = 0; i < n; i++) {
    const t0 = i * dt
    const t1 = t0 + dt
    const serrate = teeth > 0 && t0 > 0.06 && t1 < 0.96
    if (serrate) {
      const ta = t0 + 0.68 * dt
      push(ta, depth(ta))
      push(t1, -0.3 * depth(t1))
    } else if (t1 < 1) {
      push(t1, 0)
    }
  }
  const tipP = deform(toLeaf(l, 0, l.len), 1, l, pose)
  return [...right, { p: tipP, s: 1 }, ...left.reverse()]
}

export function polyPath(pts: { p: Pt }[]): string {
  if (!pts.length) return ''
  return `M${pts.map(q => fmt(q.p)).join('L')}Z`
}

export function buildLeaf(fingers: number, shape: number, pose: Pose = { kind: 'none', amount: 0 }): LeafGeometry {
  const leaflets = fanLayout(fingers, shape)
  const sil: string[] = []
  const veins: string[] = []
  const tips: Pt[] = []
  const wm = widthMul(pose)
  const mid = (l: Leaflet, t: number) => deform(toLeaf(l, 0, t * l.len), t, l, pose)
  for (const l of leaflets) {
    const outline = leafletOutline(l, pose)
    sil.push(polyPath(outline))
    tips.push(outline.find(q => q.s === 1)!.p)
    // midrib
    const midPts: Pt[] = []
    for (let i = 0; i <= 7; i++) midPts.push(mid(l, (i / 7) * 0.96))
    veins.push(`M${midPts.map(fmt).join('L')}`)
    // side veins: toward every other tooth apex, both sides
    const n = l.teeth
    for (let i = 1; i < n - 1; i += 2) {
      const ta = (i + 0.68) / n
      if (ta < 0.1 || ta > 0.93) continue
      const w = l.halfW * wm * widthProfile(ta) * 0.92
      const from = mid(l, ta - 0.17)
      const r = deform(toLeaf(l, w, ta * l.len), ta, l, pose)
      const q = deform(toLeaf(l, -w, ta * l.len), ta, l, pose)
      veins.push(`M${fmt(from)}L${fmt(r)}M${fmt(from)}L${fmt(q)}`)
    }
  }
  return {
    fingers: leaflets.length,
    shape,
    pose,
    silhouette: sil.join(''),
    veins: veins.join(''),
    leaflets,
    tips,
    sample: (k, s, u) => {
      const l = leaflets[k]!
      const w = l.halfW * wm * widthProfile(s) * u
      return deform(toLeaf(l, w, s * l.len), s, l, pose)
    }
  }
}

/** Smooth inner silhouette (no teeth), used for edge bands: outer colour under, this on top. */
export function insetPath(geom: LeafGeometry, inset: number): string {
  const parts: string[] = []
  const wm = widthMul(geom.pose) * (1 - inset * 0.9)
  for (const l of geom.leaflets) {
    const short: Leaflet = { ...l, len: l.len * (1 - inset * 0.3) }
    parts.push(polyPath(leafletOutline(short, geom.pose, 0, wm)))
  }
  return parts.join('')
}

/** Tip wedges: the last `frac` of each leaflet. */
export function tipsPath(geom: LeafGeometry, frac: number): string {
  const parts: string[] = []
  for (const l of geom.leaflets) {
    const outline = leafletOutline(l, geom.pose)
    const thr = 1 - frac
    const keep = outline.filter(q => q.s >= thr)
    if (keep.length >= 3) parts.push(polyPath(keep))
  }
  return parts.join('')
}

/** Circle as path arcs so many dots fit one element. */
export function dot(c: Pt, r: number): string {
  return `M${f3(c.x - r)} ${f3(c.y)}a${f3(r)} ${f3(r)} 0 1 0 ${f3(2 * r)} 0a${f3(r)} ${f3(r)} 0 1 0 ${f3(-2 * r)} 0`
}

export function ellipse(c: Pt, rx: number, ry: number, rotDeg: number): string {
  const a = rotDeg * Math.PI / 180
  const dx = Math.cos(a) * rx
  const dy = Math.sin(a) * rx
  return `M${f3(c.x - dx)} ${f3(c.y - dy)}a${f3(rx)} ${f3(ry)} ${f3(rotDeg)} 1 0 ${f3(2 * dx)} ${f3(2 * dy)}a${f3(rx)} ${f3(ry)} ${f3(rotDeg)} 1 0 ${f3(-2 * dx)} ${f3(-2 * dy)}`
}
