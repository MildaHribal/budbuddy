import { describe, expect, it } from 'vitest'
import type { Stage } from '../shared/game/types'
import { buildScene } from '~/utils/gameRender/layout'
import { buildModel } from '~/utils/gameRender/model'
import { SAMPLE_FLOWER, SAMPLE_VEG, SYMPTOM_KINDS, sampleVisual, symptom } from '~/utils/gameRender/fixtures'
import { bucketOf, leafLook, leafWeight, stemLook, budLook } from '~/utils/gameRender/symptoms'

const base = { green: '#3f8f2e', purple: 0, vigor: 1, dead: false }
const oldLeaf = { age: 0.1, isTop: false, sugar: false, jitter: 0.5 }
const newLeaf = { age: 0.95, isTop: true, sugar: false, jitter: 0.5 }

describe('scene layout', () => {
  it('is deterministic for the same visual', () => {
    const a = buildScene(SAMPLE_FLOWER)
    const b = buildScene(SAMPLE_FLOWER)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(buildScene({ ...SAMPLE_FLOWER, seed: 7 }))).not.toBe(JSON.stringify(a))
  })

  it('keeps the leaf budget: 120 full, 30 thumb', () => {
    const big = sampleVisual({ stage: 'veg', heightCm: 180, nodes: 22, leafiness: 1, leafShape: 0 })
    expect(buildScene(big, 'full').leaves.length).toBeLessThanOrEqual(120)
    expect(buildScene(big, 'thumb').leaves.length).toBeLessThanOrEqual(30)
    expect(buildScene(big, 'full').leaves.length).toBeGreaterThan(20)
  })

  it('every stage renders without throwing and fits the frame', () => {
    const stages: Stage[] = ['germination', 'seedling', 'veg', 'flower', 'ripening', 'harvested', 'dead']
    for (const stage of stages) {
      const sc = buildScene(sampleVisual({ stage, heightCm: stage === 'germination' ? 0 : 50, nodes: 9, budSize: 0.6 }))
      expect(sc.pot.w).toBeGreaterThan(0)
      for (const l of sc.leaves) {
        expect(l.nx).toBeGreaterThan(-sc.w)
        expect(l.nx).toBeLessThan(2 * sc.w)
        expect(l.ny).toBeGreaterThan(0)
        expect(l.ny).toBeLessThan(sc.h)
      }
    }
    expect(buildScene(sampleVisual({ stage: 'germination', nodes: 0 })).germ).toBeTruthy()
    expect(buildScene(sampleVisual({ stage: 'seedling', nodes: 2 })).cotyledons).toBeTruthy()
    expect(buildScene(sampleVisual({ stage: 'harvested' })).stump).toBeTruthy()
    expect(buildScene(sampleVisual({ stage: 'harvested' })).leaves).toHaveLength(0)
  })

  it('flowering stages have buds with a cola, veg has none', () => {
    expect(buildScene(SAMPLE_VEG).buds).toHaveLength(0)
    const fl = buildScene(SAMPLE_FLOWER)
    expect(fl.buds.some(b => b.isCola)).toBe(true)
    expect(fl.buds.length).toBeGreaterThan(3)
  })

  it('topping multiplies colas, lst flattens the canopy', () => {
    const single = buildScene(sampleVisual({ stage: 'flower', nodes: 12, heightCm: 70, budSize: 0.6 }))
    const topped = buildScene(sampleVisual({ stage: 'flower', nodes: 12, heightCm: 70, budSize: 0.6, topped: 1 }))
    expect(topped.buds.filter(b => b.isCola)).toHaveLength(2)
    expect(single.buds.filter(b => b.isCola)).toHaveLength(1)
    const lst = buildScene(sampleVisual({ lst: true, nodes: 10, heightCm: 50 }))
    const up = buildScene(sampleVisual({ nodes: 10, heightCm: 50 }))
    expect(lst.canopyTop).toBeGreaterThan(up.canopyTop)
  })

  it('lower leaves are old, top leaves new', () => {
    const sc = buildScene(SAMPLE_VEG)
    const lowest = sc.leaves.reduce((a, b) => (a.ny > b.ny ? a : b))
    const highest = sc.leaves.reduce((a, b) => (a.ny < b.ny ? a : b))
    expect(lowest.ctx.age).toBeLessThan(highest.ctx.age)
    expect(highest.ctx.isTop).toBe(true)
  })

  it('seedling starts with single-blade leaves', () => {
    const sc = buildScene(sampleVisual({ stage: 'seedling', nodes: 1, heightCm: 4 }))
    expect(sc.leaves.filter(l => l.ctx.age < 1).every(l => l.fingers === 1)).toBe(true)
    expect(sc.leaves.every(l => l.fingers <= 3)).toBe(true)
  })
})

describe('symptom resolution', () => {
  it('weights leaves by age for old/new/top', () => {
    expect(leafWeight('old', oldLeaf)).toBeGreaterThan(0.9)
    expect(leafWeight('old', newLeaf)).toBe(0)
    expect(leafWeight('new', newLeaf)).toBe(1)
    expect(leafWeight('new', oldLeaf)).toBe(0)
    expect(leafWeight('top', newLeaf)).toBe(1)
    expect(leafWeight('top', oldLeaf)).toBe(0)
    expect(leafWeight('buds', { ...newLeaf, sugar: true })).toBe(1)
    expect(leafWeight('stems', oldLeaf)).toBe(0)
  })

  it('buckets intensity into 0..3', () => {
    expect(bucketOf(0.05)).toBe(0)
    expect(bucketOf(0.3)).toBe(1)
    expect(bucketOf(0.5)).toBe(2)
    expect(bucketOf(0.9)).toBe(3)
  })

  it('chlorosis shifts fill toward yellow continuously, only on affected leaves', () => {
    const healthy = leafLook([], oldLeaf, base).fill
    const mild = leafLook([symptom('chlorosis-uniform', 0.3)], oldLeaf, base).fill
    const strong = leafLook([symptom('chlorosis-uniform', 1)], oldLeaf, base).fill
    const red = (h: string) => parseInt(h.slice(1, 3), 16)
    expect(red(mild)).toBeGreaterThan(red(healthy))
    expect(red(strong)).toBeGreaterThan(red(mild))
    expect(leafLook([symptom('chlorosis-uniform', 1)], newLeaf, base).fill).toBe(leafLook([], newLeaf, base).fill)
  })

  it('interveinal keeps green veins while the blade yellows', () => {
    const look = leafLook([symptom('chlorosis-interveinal', 1)], oldLeaf, base)
    const g = (h: string) => parseInt(h.slice(3, 5), 16)
    const r = (h: string) => parseInt(h.slice(1, 3), 16)
    expect(r(look.fill)).toBeGreaterThan(180)
    expect(r(look.vein)).toBeLessThan(90)
    expect(g(look.vein)).toBeGreaterThan(r(look.vein))
    expect(look.veinW).toBeGreaterThan(0.05)
  })

  it('edge symptoms paint an outer band with an inset, tip burn is an overlay', () => {
    const edges = leafLook([symptom('yellow-edges-in', 0.7)], oldLeaf, base)
    expect(edges.outer).toBeTruthy()
    expect(edges.inset).toBeGreaterThan(0)
    const tips = leafLook([symptom('tip-burn', 0.7)], oldLeaf, base)
    expect(tips.overlays[0]?.kind).toBe('tip-burn')
    expect(tips.overlays[0]?.bucket).toBe(2)
  })

  it('poses and droop come from the strongest matching symptom', () => {
    expect(leafLook([symptom('claw', 0.9)], oldLeaf, base).pose.kind).toBe('claw')
    expect(leafLook([symptom('claw', 0.2), symptom('wilt', 0.9)], oldLeaf, base).pose.kind).toBe('wilt')
    expect(leafLook([symptom('droop', 1)], oldLeaf, base).angleDelta).toBeGreaterThan(30)
    expect(leafLook([symptom('curl-up', 1)], oldLeaf, base).angleDelta).toBeLessThan(0)
    expect(leafLook([symptom('twisted-new-growth', 1)], newLeaf, base).sizeMul).toBeLessThan(1)
  })

  it('stems and buds pick up their own symptoms', () => {
    expect(stemLook([symptom('purple-stems', 1)], base).stem).not.toBe(stemLook([], base).stem)
    expect(stemLook([symptom('purple-petioles', 1)], base).petiole).not.toBe(stemLook([], base).petiole)
    const bud = { purple: 0, pistils: 0.3, frost: 0.5, vigor: 1, dead: false }
    expect(budLook([symptom('gray-mold', 0.8)], bud, 0.5).mold).toBeGreaterThan(0.5)
    expect(budLook([symptom('nanners', 0.8)], bud, 0.5).nanners).toBeGreaterThan(0.5)
    expect(budLook([symptom('foxtails', 0.8)], bud, 0.5).foxtails).toBeGreaterThan(0.5)
    expect(budLook([symptom('gray-mold', 0.8, 'old')], bud, 0.5).mold).toBe(0)
  })

  it('pistil colour runs white to orange to brown', () => {
    const bud = (p: number) => budLook([], { purple: 0, pistils: p, frost: 0, vigor: 1, dead: false }, 0.5).pistil
    const b = (h: string) => parseInt(h.slice(5, 7), 16)
    expect(b(bud(0))).toBeGreaterThan(b(bud(0.5)))
    expect(b(bud(0.5))).toBeGreaterThan(b(bud(1)))
  })
})

describe('render model', () => {
  it('every symptom kind changes the picture of a flowering plant', () => {
    const healthy = JSON.stringify(buildModel(SAMPLE_FLOWER, 'u'))
    for (const kind of SYMPTOM_KINDS) {
      const m = JSON.stringify(buildModel({ ...SAMPLE_FLOWER, symptoms: [symptom(kind, 0.8)] }, 'u'))
      expect(m, kind).not.toBe(healthy)
    }
  })

  it('shares leaf symbols instead of one per leaf and stays within budget', () => {
    const m = buildModel(SAMPLE_FLOWER, 'u')
    const leafCount = m.back.length + m.front.length
    expect(leafCount).toBeGreaterThan(15)
    expect(m.symbols.length).toBeLessThan(10)
    expect(m.elementCount).toBeLessThan(700)
    const thumb = buildModel(SAMPLE_FLOWER, 'u', 'thumb')
    expect(thumb.elementCount).toBeLessThan(m.elementCount / 2)
  })

  it('symptom overlays are reused across leaves with the same geometry', () => {
    const m = buildModel({ ...SAMPLE_VEG, symptoms: [symptom('rust-spots', 1, 'all')] }, 'u')
    const used = new Set([...m.back, ...m.front].flatMap(l => l.overlays.map(o => o.id)))
    expect(used.size).toBe(m.overlays.length)
    expect(m.overlays.length).toBeLessThan(12)
    expect([...m.back, ...m.front].filter(l => l.overlays.length).length).toBeGreaterThan(10)
  })
})
