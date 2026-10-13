import { describe, expect, it } from 'vitest'
import type { PhenoHunt, Plant } from '../app/types/grow'
import { buildDemoData } from '../app/utils/demo'
import { buildJpegPdf } from '../app/utils/jpegPdf'
import { bestPerCriterion, candidateScore, floweringDays, nextTag, normalizeHunt, rankCandidates, scoredShare } from '../app/utils/pheno'
import { paginateLabels, parsePlantLink, plantLink } from '../app/utils/qr'
import { normalizeData } from '../app/utils/schema'
import { needsGlobalLight, normalizeSpace, spaceSchedule } from '../app/utils/spaces'

const settings = { lightsOn: '06:00', lightHours: 18 }

describe('spaces', () => {
  it('normalizes and falls back to the global schedule', () => {
    const s = normalizeSpace({ id: 'a', name: '  Tent  ', lightHours: 'x' }, settings)
    expect(s).toMatchObject({ id: 'a', name: 'Tent', location: 'indoor', lightsOn: '06:00', lightHours: 18 })
    expect(normalizeSpace({ name: 'Balcony', location: 'outdoor', lightHours: null }, settings).lightHours).toBeNull()
    expect(spaceSchedule({ lightsOn: '20:00', lightHours: 12 })).toEqual({ lightsOn: '20:00', hours: 12 })
    expect(spaceSchedule({ lightsOn: '20:00', lightHours: null })).toBeNull()
  })

  it('keeps the global light card only while it is needed', () => {
    const demo = buildDemoData('2026-10-11')
    const tent = normalizeSpace({ id: 't', name: 'Tent' }, settings)
    expect(needsGlobalLight(demo.plants, [])).toBe(true)
    const all = demo.plants.map(p => ({ ...p, spaceId: 't' }))
    expect(needsGlobalLight(all, [tent])).toBe(false)
    const some = demo.plants.map((p, i) => ({ ...p, spaceId: i ? 't' : undefined }))
    const firstGrowsIndoors = demo.plants[0]!.location !== 'outdoor' && !demo.plants[0]!.archived && ['germination', 'seedling', 'vegetative', 'flowering'].includes(demo.plants[0]!.stage)
    expect(needsGlobalLight(some, [tent])).toBe(firstGrowsIndoors)
  })
})

describe('schema with tents and hunts', () => {
  const demo = buildDemoData('2026-10-11')
  const [a, b] = demo.plants
  const raw = {
    ...demo,
    plants: demo.plants.map((p, i) => ({ ...p, spaceId: i === 0 ? 'tent' : i === 1 ? 'ghost' : undefined, wateringAuto: i === 0 })),
    spaces: [{ id: 'tent', name: 'Tent', lightsOn: '20:00', lightHours: 12 }, 'junk'],
    hunts: [{ id: 'h', name: 'Hunt', candidates: [{ plantId: a!.id, scores: { smell: 5, resin: 9 } }, { plantId: 'gone' }, { plantId: b!.id, tag: 'B' }], keeper: { plantId: a!.id, role: 'clone' }, weights: { smell: 3, yield: 1 } }]
  }
  const data = normalizeData(JSON.parse(JSON.stringify(raw)))

  it('keeps spaces and drops dangling space ids', () => {
    expect(data.spaces).toHaveLength(1)
    expect(data.plants[0]!.spaceId).toBe('tent')
    expect(data.plants[0]!.wateringAuto).toBe(true)
    expect('spaceId' in data.plants[1]!).toBe(false)
    expect('wateringAuto' in data.plants[1]!).toBe(false)
  })

  it('cleans hunts', () => {
    const h = data.hunts![0]!
    expect(h.candidates.map(c => c.plantId)).toEqual([a!.id, b!.id])
    expect(h.candidates[0]!.scores).toEqual({ smell: 5 })
    expect(h.candidates[0]!.tag).toBe('#1')
    expect(h.candidates[1]!.tag).toBe('B')
    expect(h.keeper).toEqual({ plantId: a!.id, role: 'clone' })
    expect(h.weights).toEqual({ smell: 3 })
  })

  it('old saves without the new collections still load', () => {
    const old = normalizeData(JSON.parse(JSON.stringify({ ...demo, spaces: undefined, hunts: undefined })))
    expect(old.spaces).toEqual([])
    expect(old.hunts).toEqual([])
    // tent links without their tents are dropped
    expect(old.plants).toEqual(demo.plants.map(({ spaceId: _, ...p }) => p))
  })
})

describe('pheno scoring', () => {
  const hunt = (over: Partial<PhenoHunt> = {}): PhenoHunt => normalizeHunt({
    id: 'h',
    candidates: [
      { plantId: 'a', scores: { vigour: 4, smell: 2 } },
      { plantId: 'b', scores: { vigour: 3, smell: 5 } },
      { plantId: 'c', scores: {} },
      { plantId: 'd', scores: { vigour: 3, smell: 5 } }
    ],
    ...over
  }, new Set(['a', 'b', 'c', 'd']))

  it('averages scored criteria with weights', () => {
    const h = hunt()
    expect(candidateScore(h.candidates[0]!, h)).toBe(3)
    expect(candidateScore(h.candidates[2]!, h)).toBeNull()
    const weighted = hunt({ weights: { smell: 3 } })
    expect(candidateScore(weighted.candidates[0]!, weighted)).toBe(2.5)
    const smellOff = hunt({ weights: { smell: 0 } })
    expect(candidateScore(smellOff.candidates[1]!, smellOff)).toBe(3)
  })

  it('ranks best first, shares ties, unscored last', () => {
    const r = rankCandidates(hunt({ weights: { smell: 2 } }))
    expect(r.map(x => x.candidate.plantId)).toEqual(['b', 'd', 'a', 'c'])
    expect(r.map(x => x.rank)).toEqual([1, 1, 3, null])
  })

  it('finds the best per criterion and scoring progress', () => {
    const h = hunt()
    expect(bestPerCriterion(h)).toEqual({ vigour: 4, smell: 5 })
    expect(scoredShare(h.candidates[0]!, h)).toBeCloseTo(2 / 6)
  })

  it('picks a free tag', () => {
    expect(nextTag({ candidates: [{ plantId: 'a', tag: '#1', scores: {}, notes: '' }, { plantId: 'b', tag: '#3', scores: {}, notes: '' }] })).toBe('#4')
  })

  it('counts days in flower', () => {
    const p = { stageHistory: [{ stage: 'vegetative', date: '2026-08-01' }, { stage: 'flowering', date: '2026-09-01' }], harvest: null } as unknown as Plant
    expect(floweringDays(p, '2026-09-29')).toBe(28)
    expect(floweringDays({ ...p, harvest: { date: '2026-09-15', wetWeight: null, dryWeight: null, notes: '' } }, '2026-10-30')).toBe(14)
    expect(floweringDays({ ...p, stageHistory: [] }, '2026-09-29')).toBeNull()
  })
})

describe('QR labels', () => {
  it('round-trips plant links', () => {
    expect(plantLink('abc-123')).toBe('https://budbuddy.hribal.site/plants/abc-123')
    expect(parsePlantLink(plantLink('abc-123'))).toBe('abc-123')
    expect(parsePlantLink('budbuddy://app/plants/42?x=1')).toBe('42')
    expect(parsePlantLink('  https://budbuddy.hribal.site/my_trees/7/ ')).toBe('7')
    expect(parsePlantLink('https://evil.example/plants/1')).toBeNull()
    expect(parsePlantLink('hello')).toBeNull()
  })

  it('paginates', () => {
    expect(paginateLabels([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('writes a well-formed PDF', async () => {
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9])
    const blob = buildJpegPdf([{ jpeg, width: 10, height: 14 }, { jpeg, width: 10, height: 14 }])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Count 2')
    const start = Number(/startxref\n(\d+)/.exec(text)![1])
    expect(text.slice(start, start + 4)).toBe('xref')
    // every xref offset points at its object
    const offsets = [...text.matchAll(/^(\d{10}) 00000 n $/gm)].map(m => Number(m[1]))
    offsets.forEach((o, i) => expect(text.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true))
  })
})
