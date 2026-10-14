// Turns VisualSymptom[] into per-leaf, per-bud and per-stem looks.
import type { SymptomWhere, VisualSymptom } from '../../../shared/game/types'
import { clamp01, mix, shade, smoothstep } from './color'
import type { Pose, PoseKind } from './leafGeometry'
import type { Bucket, OverlayKind } from './overlays'

export interface LeafCtx {
  /** 0 oldest (lowest) .. 1 newest (top) */
  age: number
  isTop: boolean
  /** sugar leaf inside a bud */
  sugar: boolean
  /** 0..1 deterministic per-leaf variation */
  jitter: number
}

export interface PlantBase {
  green: string
  purple: number
  vigor: number
  dead: boolean
}

export interface LeafLook {
  fill: string
  vein: string
  veinW: number
  /** edge band colour painted under an inset of the main fill */
  outer?: string
  inset: number
  overlays: { kind: OverlayKind, bucket: Bucket, opacity: number }[]
  pose: Pose
  /** degrees added to the petiole angle, positive = toward the ground */
  angleDelta: number
  sizeMul: number
}

export const C = {
  yellow: '#d9c33a',
  lime: '#cdd548',
  pale: '#d6e18c',
  bleach: '#efe9c4',
  dark: '#1b4f24',
  burnEdge: '#9a6428',
  dull: '#7d8a57',
  dead: '#6e4b2b',
  purple: '#5a2e7a',
  purpleStem: '#6a3d8c',
  veinLight: '#d6e6a6'
} as const

export function leafWeight(where: SymptomWhere, ctx: LeafCtx): number {
  switch (where) {
    case 'all': return 1
    case 'old': return ctx.sugar ? 0 : (1 - smoothstep(0.3, 0.65, ctx.age)) * (0.75 + 0.25 * (1 - ctx.age))
    case 'new': return ctx.sugar ? 1 : smoothstep(0.45, 0.75, ctx.age)
    case 'top': return ctx.isTop || ctx.sugar ? 1 : 0
    case 'buds': return ctx.sugar ? 1 : 0
    case 'stems': return 0
    case 'underside': return ctx.sugar ? 0 : 1 - smoothstep(0.4, 0.85, ctx.age)
  }
  return 0
}

export function bucketOf(e: number): Bucket | 0 {
  if (e < 0.12) return 0
  if (e < 0.4) return 1
  if (e < 0.72) return 2
  return 3
}

export function poseAmount(e: number): number {
  if (e < 0.1) return 0
  if (e < 0.3) return 0.35
  if (e < 0.65) return 0.7
  return 1
}

export const poseKey = (p: Pose) => (p.amount > 0 ? `${p.kind}${p.amount}` : 'n')

export function baseLeafFill(base: PlantBase, ctx: LeafCtx): string {
  if (base.dead) return shade(C.dead, 0.9 + 0.2 * ctx.jitter)
  let fill = shade(base.green, 0.93 + 0.12 * ctx.jitter)
  fill = mix(fill, C.dull, (1 - base.vigor) * 0.6)
  fill = mix(fill, C.purple, base.purple * (ctx.sugar ? 0.7 : 0.25 + 0.15 * ctx.age))
  return fill
}

const OVERLAY_KINDS = new Set<string>([
  'tip-burn', 'rust-spots', 'necrotic-spots', 'bronze-patches', 'stipple', 'silver-streaks',
  'insects', 'powder', 'leaf-trails', 'chewed', 'sticky', 'webbing'
])

export function leafLook(symptoms: VisualSymptom[], ctx: LeafCtx, base: PlantBase): LeafLook {
  let fill = baseLeafFill(base, ctx)
  let vein = mix(fill, C.veinLight, base.dead ? 0.2 : 0.32)
  let veinW = 0.01
  let outer: string | undefined
  let inset = 0
  const overlays: LeafLook['overlays'] = []
  let pose: Pose = { kind: 'none', amount: 0 }
  let poseE = 0
  let angleDelta = 0
  let sizeMul = 1

  const setPose = (kind: PoseKind, e: number) => {
    if (e > poseE) {
      poseE = e
      pose = { kind, amount: poseAmount(e) }
    }
  }

  if (base.dead) {
    setPose('wilt', 1)
    angleDelta += 55
  }

  for (const s of symptoms) {
    const w = leafWeight(s.where, ctx)
    if (w <= 0) continue
    const e = clamp01(s.intensity * w * (0.85 + 0.3 * ctx.jitter))
    if (e <= 0.02) continue
    if (OVERLAY_KINDS.has(s.kind)) {
      const b = bucketOf(e)
      if (b) overlays.push({ kind: s.kind as OverlayKind, bucket: b, opacity: Math.min(1, 0.5 + e * 0.8) })
      // mite-damaged leaves lose colour overall
      if (s.kind === 'stipple') fill = mix(fill, '#a9b56e', 0.35 * e)
      if (s.kind === 'sticky') fill = mix(fill, '#8fc85e', 0.2 * e)
      continue
    }
    switch (s.kind) {
      case 'chlorosis-uniform':
        fill = mix(fill, C.yellow, e)
        vein = mix(vein, '#e4d65c', e)
        break
      case 'chlorosis-interveinal':
        fill = mix(fill, '#d9d23a', e)
        vein = mix(vein, '#2b7a28', Math.min(1, e * 1.8))
        veinW = Math.max(veinW, 0.012 + 0.07 * e)
        break
      case 'yellow-edges-in':
        outer = mix(outer ?? fill, C.yellow, Math.min(1, 0.45 + e))
        inset = Math.max(inset, 0.18 + 0.5 * e)
        break
      case 'edge-burn':
        outer = mix(outer ?? fill, C.burnEdge, Math.min(1, 0.55 + e))
        inset = Math.max(inset, 0.12 + 0.3 * e)
        fill = mix(fill, C.yellow, 0.3 * e)
        break
      case 'dark-green':
        fill = mix(fill, C.dark, e * 0.9)
        vein = mix(vein, '#3b8338', e)
        break
      case 'pale-new-growth':
        fill = mix(fill, C.pale, e)
        vein = mix(vein, '#e6edb0', e)
        break
      case 'bleached-top':
        fill = mix(fill, C.bleach, e)
        vein = mix(vein, '#ebe6c6', e)
        break
      case 'claw':
        setPose('claw', e)
        angleDelta += 8 * e
        break
      case 'taco':
        setPose('taco', e)
        break
      case 'curl-down':
        setPose('curl-down', e)
        angleDelta += 15 * e
        break
      case 'curl-up':
        setPose('curl-up', e)
        angleDelta -= 10 * e
        break
      case 'twisted-new-growth':
        setPose('twist', e)
        sizeMul *= 1 - 0.35 * e
        break
      case 'droop':
        angleDelta += 45 * e
        fill = mix(fill, C.dark, 0.2 * e)
        setPose('curl-down', 0.6 * e)
        break
      case 'wilt':
        angleDelta += 60 * e
        setPose('wilt', e)
        fill = mix(fill, C.dull, 0.5 * e)
        break
      case 'stunted':
        sizeMul *= 1 - 0.3 * e
        break
      default:
        break
    }
  }
  // quantize the inset so symbols are shared
  if (inset > 0) inset = inset < 0.3 ? 0.22 : inset < 0.55 ? 0.42 : 0.65
  return { fill, vein, veinW, outer, inset, overlays, pose, angleDelta, sizeMul }
}

export interface BudLook {
  calyx: string
  calyxTip: string
  pistil: string
  frost: number
  mold: number
  nanners: number
  foxtails: number
  powder: number
  webbing: number
  droop: number
}

const budWeight = (where: SymptomWhere) => (where === 'buds' || where === 'all' || where === 'top' ? 1 : where === 'new' ? 0.6 : 0)

export function budLook(symptoms: VisualSymptom[], v: { purple: number, pistils: number, frost: number, vigor: number, dead: boolean }, jitter: number): BudLook {
  let calyx = v.dead ? '#6a4a2c' : shade('#5aa341', 0.95 + 0.1 * jitter)
  calyx = mix(calyx, C.dull, (1 - v.vigor) * 0.5)
  calyx = mix(calyx, '#dfe6cf', v.frost * 0.3)
  calyx = mix(calyx, C.purple, v.purple * 0.75)
  const calyxTip = mix(shade(calyx, 1.18), '#7a3d9c', v.purple * 0.6)
  const pistil = v.dead ? '#4a2e1a' : mix(mix('#f3eddc', '#e2812f', v.pistils * 1.4), '#8a4522', Math.max(0, v.pistils - 0.6) * 2.5)
  const look: BudLook = { calyx, calyxTip, pistil, frost: v.dead ? 0 : v.frost, mold: 0, nanners: 0, foxtails: 0, powder: 0, webbing: 0, droop: 0 }
  for (const s of symptoms) {
    const e = clamp01(s.intensity * budWeight(s.where) * (0.85 + 0.3 * jitter))
    if (e <= 0.02) continue
    switch (s.kind) {
      case 'gray-mold':
        look.mold = Math.max(look.mold, e)
        break
      case 'nanners':
        look.nanners = Math.max(look.nanners, e)
        break
      case 'foxtails':
        look.foxtails = Math.max(look.foxtails, e)
        break
      case 'powder':
        look.powder = Math.max(look.powder, e)
        break
      case 'webbing':
        look.webbing = Math.max(look.webbing, e)
        break
      case 'bleached-top':
        look.calyx = mix(look.calyx, C.bleach, e)
        look.calyxTip = mix(look.calyxTip, C.bleach, e)
        break
      case 'chlorosis-uniform':
        look.calyx = mix(look.calyx, C.yellow, e * 0.7)
        break
      case 'wilt':
        look.droop = Math.max(look.droop, e)
        break
      default:
        break
    }
  }
  if (v.dead) {
    look.calyxTip = '#7d5a38'
    look.droop = 1
  }
  return look
}

export interface StemLook {
  stem: string
  petiole: string
  bugs: number
  powder: number
}

export function stemLook(symptoms: VisualSymptom[], base: PlantBase): StemLook {
  let stem = base.dead ? '#5a3f26' : mix('#5f9240', C.dull, (1 - base.vigor) * 0.5)
  stem = mix(stem, C.purpleStem, base.purple * 0.35)
  let petiole = stem
  let bugs = 0
  let powder = 0
  for (const s of symptoms) {
    const e = clamp01(s.intensity)
    const onStems = s.where === 'stems' || s.where === 'all'
    if (s.kind === 'purple-stems' && onStems) stem = mix(stem, C.purpleStem, e)
    if (s.kind === 'purple-petioles' && (onStems || s.where === 'old' || s.where === 'new')) petiole = mix(petiole, C.purpleStem, e)
    if (s.kind === 'purple-stems' && onStems) petiole = mix(petiole, C.purpleStem, e * 0.6)
    if (s.kind === 'insects' && s.where === 'stems') bugs = Math.max(bugs, e)
    if (s.kind === 'powder' && s.where === 'stems') powder = Math.max(powder, e)
  }
  return { stem, petiole, bugs, powder }
}

/** Plant-level multipliers from whole-plant symptoms. */
export function plantMods(symptoms: VisualSymptom[]): { internode: number, stemW: number, scale: number, leaf: number } {
  let stretch = 0
  let stunted = 0
  for (const s of symptoms) {
    if (s.kind === 'stretch') stretch = Math.max(stretch, s.intensity)
    if (s.kind === 'stunted') stunted = Math.max(stunted, s.intensity)
  }
  return {
    internode: 1 + 0.3 * stretch,
    stemW: (1 - 0.35 * stretch) * (1 + 0.1 * stunted),
    scale: 1 - 0.3 * stunted,
    leaf: (1 - 0.25 * stretch) * (1 - 0.3 * stunted)
  }
}
