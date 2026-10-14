import { describe, expect, it } from 'vitest'
import { buildLeaf, fanLayout, insetPath, leafletOutline, maxFingers, tipsPath, widthProfile } from '~/utils/gameRender/leafGeometry'
import { buildOverlay, type OverlayKind } from '~/utils/gameRender/overlays'
import { makeRng, hashSeed } from '~/utils/gameRender/prng'

const NONE = { kind: 'none' as const, amount: 0 }

describe('prng', () => {
  it('is deterministic and in [0,1)', () => {
    const a = makeRng(123)
    const b = makeRng(123)
    for (let i = 0; i < 50; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(hashSeed(1, 'x')).toBe(hashSeed(1, 'x'))
    expect(hashSeed(1, 'x')).not.toBe(hashSeed(1, 'y'))
  })
})

describe('leaf geometry', () => {
  it('finger cap follows leaf shape: sativa 11, indica 7', () => {
    expect(maxFingers(0)).toBe(11)
    expect(maxFingers(1)).toBe(7)
    expect(maxFingers(0.5) % 2).toBe(1)
  })

  it('fan layout is symmetric with the central leaflet longest', () => {
    const l = fanLayout(7, 0.5)
    expect(l).toHaveLength(7)
    expect(l[3]!.angle).toBe(0)
    expect(l[3]!.len).toBe(1)
    expect(l[0]!.angle).toBeCloseTo(-l[6]!.angle)
    expect(l[0]!.len).toBeLessThan(l[1]!.len)
    expect(l[1]!.len).toBeLessThan(l[2]!.len)
  })

  it('sativa leaflets are narrower than indica', () => {
    expect(fanLayout(7, 0)[3]!.halfW).toBeLessThan(fanLayout(7, 1)[3]!.halfW)
  })

  it('width profile is lanceolate (widest near 40 %)', () => {
    expect(widthProfile(0)).toBe(0)
    expect(widthProfile(1)).toBe(0)
    expect(widthProfile(0.4)).toBeGreaterThan(widthProfile(0.15))
    expect(widthProfile(0.4)).toBeGreaterThan(widthProfile(0.8))
    expect(widthProfile(0.41)).toBeCloseTo(1, 1)
  })

  it('serrated outline is a closed polygon with teeth on both edges', () => {
    const l = fanLayout(1, 0.5)[0]!
    const pts = leafletOutline(l, NONE)
    expect(pts[0]!.s).toBe(0)
    expect(pts.some(p => p.s === 1)).toBe(true)
    expect(pts.length).toBeGreaterThan(l.teeth * 2)
    // the tip is at (0,-1): the central leaflet is one unit long
    const tip = pts.find(p => p.s === 1)!.p
    expect(tip.x).toBeCloseTo(0, 6)
    expect(tip.y).toBeCloseTo(-1, 6)
  })

  it('builds a unit leaf with silhouette, veins and tips', () => {
    const g = buildLeaf(7, 0.5)
    expect(g.fingers).toBe(7)
    expect(g.silhouette.startsWith('M')).toBe(true)
    expect(g.silhouette.endsWith('Z')).toBe(true)
    expect((g.silhouette.match(/Z/g) || []).length).toBe(7)
    expect(g.veins).toContain('M')
    expect(g.tips).toHaveLength(7)
    const inside = g.sample(3, 0.5, 0)
    expect(inside.x).toBeCloseTo(0, 6)
    expect(inside.y).toBeCloseTo(-0.5, 6)
  })

  it('poses bend toward local +x (the ground once rotated) and are deterministic', () => {
    const plain = buildLeaf(5, 0.5)
    const claw = buildLeaf(5, 0.5, { kind: 'claw', amount: 1 })
    const up = buildLeaf(5, 0.5, { kind: 'curl-up', amount: 1 })
    expect(claw.tips[2]!.x).toBeGreaterThan(plain.tips[2]!.x)
    expect(up.tips[2]!.x).toBeLessThan(plain.tips[2]!.x)
    expect(buildLeaf(5, 0.5, { kind: 'claw', amount: 1 }).silhouette).toBe(claw.silhouette)
    const taco = buildLeaf(5, 0.5, { kind: 'taco', amount: 1 })
    expect(taco.leaflets[2]!.halfW).toBe(plain.leaflets[2]!.halfW)
    expect(taco.silhouette).not.toBe(plain.silhouette)
  })

  it('inset and tip paths exist for every leaflet', () => {
    const g = buildLeaf(9, 0)
    expect((insetPath(g, 0.4).match(/Z/g) || []).length).toBe(9)
    expect((tipsPath(g, 0.2).match(/Z/g) || []).length).toBe(9)
  })
})

describe('overlays', () => {
  const kinds: OverlayKind[] = ['tip-burn', 'rust-spots', 'necrotic-spots', 'bronze-patches', 'stipple', 'silver-streaks', 'insects', 'powder', 'leaf-trails', 'chewed', 'sticky', 'webbing']

  it('every kind produces drawable parts for every bucket and is deterministic', () => {
    const g = buildLeaf(7, 0.5)
    for (const kind of kinds) {
      for (const b of [1, 2, 3] as const) {
        const parts = buildOverlay(kind, g, b, 99)
        expect(parts.length, kind).toBeGreaterThan(0)
        for (const p of parts) {
          expect(p.d.length, kind).toBeGreaterThan(2)
          expect(p.fill || p.stroke, kind).toBeTruthy()
        }
        expect(JSON.stringify(buildOverlay(kind, g, b, 99))).toBe(JSON.stringify(parts))
      }
    }
  })

  it('coverage grows with the bucket', () => {
    const g = buildLeaf(7, 0.5)
    const len = (b: 1 | 2 | 3) => buildOverlay('rust-spots', g, b, 5)[0]!.d.length
    expect(len(1)).toBeLessThan(len(2))
    expect(len(2)).toBeLessThan(len(3))
  })

  it('spots stay inside the leaf extents', () => {
    const g = buildLeaf(7, 0.5)
    const d = buildOverlay('stipple', g, 3, 1)[0]!.d
    const xs = [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)]
    expect(xs.length).toBeGreaterThan(20)
    for (const m of xs) {
      expect(Math.abs(Number(m[1]))).toBeLessThan(1.05)
      expect(Number(m[2])).toBeLessThan(0.05)
      expect(Number(m[2])).toBeGreaterThan(-1.05)
    }
  })
})
