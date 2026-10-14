import { describe, expect, it } from 'vitest'
import { buildRatingRequest, parseRatingReply } from '../app/ai/harvestRating'
import { buildDemoData } from '../app/utils/demo'
import { harvestBonuses, overallScore, potLitres, scoreHarvest, starsFor } from '../app/utils/harvestScore'
import { normalizeData } from '../app/utils/schema'

const today = '2026-10-15'

function harvested() {
  const data = buildDemoData(today)
  const plant = data.plants.find(p => p.harvest)!
  return { data, plant, entries: data.entries.filter(e => e.plantId === plant.id) }
}

describe('harvest score', () => {
  it('turns AI scores into stars', () => {
    expect(overallScore({ structure: 10, frost: 10, trimCure: 10, health: 10 })).toBe(10)
    expect(starsFor(9)).toBe(5)
    expect(starsFor(7)).toBe(4)
    expect(starsFor(5.5)).toBe(3)
    expect(starsFor(4)).toBe(2)
    expect(starsFor(2)).toBe(1)
  })

  it('reads pot sizes', () => {
    expect(potLitres('11 L')).toBe(11)
    expect(potLitres('7,5l')).toBe(7.5)
    expect(potLitres('3 gal')).toBeCloseTo(11.36, 1)
    expect(potLitres('big one')).toBeNull()
  })

  it('adds journal-backed bonuses and no yield points without a dry weight', () => {
    const { plant, entries } = harvested()
    const keys = harvestBonuses(plant, entries, today).map(b => b.key)
    expect(keys).toEqual(expect.arrayContaining(['weighed', 'yield', 'efficiency', 'cured']))
    plant.harvest!.dryWeight = null
    expect(harvestBonuses(plant, entries, today).map(b => b.key)).not.toContain('yield')
  })

  it('points = quality + bonuses', () => {
    const { plant, entries } = harvested()
    const r = scoreHarvest(plant, entries, { scores: { structure: 6, frost: 6, trimCure: 6, health: 6 }, summary: '', good: [], improve: [] }, { photoIds: [], aroma: null }, today)
    expect(r.stars).toBe(3)
    expect(r.points).toBe(60 + r.bonuses.reduce((s, b) => s + b.points, 0))
  })

  it('the demo harvest carries a rating that survives a save and load', () => {
    const { data, plant } = harvested()
    expect(plant.harvest!.rating!.stars).toBeGreaterThanOrEqual(4)
    const again = normalizeData(JSON.parse(JSON.stringify(data)))
    expect(again.plants.find(p => p.id === plant.id)!.harvest!.rating).toEqual(plant.harvest!.rating)
  })
})

describe('harvest rating reply', () => {
  it('parses JSON with surrounding noise and clamps scores', () => {
    const r = parseRatingReply('Sure!\n```json\n{"valid":true,"structure":12,"frost":7.6,"trimCure":"6","health":0,"summary":"Nice — dense","good":["a","b","c","d"],"improve":[]}\n```')
    expect(r).toEqual({ valid: true, scores: { structure: 10, frost: 8, trimCure: 6, health: 1 }, summary: 'Nice , dense', good: ['a', 'b', 'c'], improve: [] })
  })

  it('passes on a refusal and rejects garbage', () => {
    expect(parseRatingReply('{"valid":false,"reason":"This is a living plant"}')).toEqual({ valid: false, reason: 'This is a living plant' })
    expect(parseRatingReply('no json here')).toBeNull()
    expect(parseRatingReply('{"valid":true,"structure":5}')).toBeNull()
  })

  it('sends the photos and the harvest facts', () => {
    const { plant, entries } = harvested()
    const img = { mimeType: 'image/jpeg', base64: 'AAAA' }
    const req = buildRatingRequest({ plant, entries, images: [img, img, img, img], aroma: 3, today }, 'en')
    expect(req.images).toHaveLength(3)
    expect(req.userText).toContain('Dry weight: 96 g')
    expect(req.userText).toContain('Aroma (grower\'s nose): loud')
  })
})
