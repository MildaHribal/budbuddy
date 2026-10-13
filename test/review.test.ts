import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { JournalEntry, Plant } from '../app/types/grow'
import { blankEntry } from '../app/utils/entries'
import { normalizeData, normalizeEntry } from '../app/utils/schema'
import { clampAlign, isIdentity, normalizeAlignMap } from '../app/utils/review/align'
import { buildArchive, journalCsv, photoFileNames } from '../app/utils/review/archive'
import { better, daySeries, nearestFrame, runSummary, stageSegments } from '../app/utils/review/compare'
import { buildPdf, pdfString } from '../app/utils/review/pdf'
import { clipSeconds, ghostFrame, stageOn, timelapseFrames, videoSteps } from '../app/utils/review/timelapse'
import { computeWrapped, longestStreak, wrappedPeriods } from '../app/utils/review/wrapped'

function plant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1', name: 'Blue Dream #1', strain: 'Blue Dream', type: 'photoperiod', stage: 'flowering',
    stageHistory: [{ stage: 'seedling', date: '2026-01-01' }, { stage: 'vegetative', date: '2026-01-15' }, { stage: 'flowering', date: '2026-02-20' }],
    startDate: '2026-01-01', potSize: '11 L', medium: 'soil', location: 'indoor', wateringInterval: 3, health: 4,
    photoId: null, notes: '', harvest: null, archived: false, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z',
    ...over
  }
}

let seq = 0
function entry(over: Partial<JournalEntry>): JournalEntry {
  seq++
  return { ...blankEntry(), id: `e${seq}`, plantId: 'p1', type: 'note', date: '2026-01-01', createdAt: `2026-01-01T10:00:${String(seq % 60).padStart(2, '0')}Z`, ...over }
}

describe('photo alignment', () => {
  it('clamps and drops identity', () => {
    expect(clampAlign({ x: 2, y: -2, scale: 10, rotate: -90 })).toEqual({ x: 0.5, y: -0.5, scale: 2.5, rotate: -30 })
    expect(isIdentity({ x: 0, y: 0, scale: 1, rotate: 0 })).toBe(true)
    expect(normalizeAlignMap({ a: { x: 0.1, y: 0, scale: 1, rotate: 0 }, b: { x: 0, y: 0, scale: 1, rotate: 0 }, gone: { x: 0.2 } }, ['a', 'b'])).toEqual({ align: { a: { x: 0.1, y: 0, scale: 1, rotate: 0 } } })
    expect(normalizeAlignMap('junk', ['a'])).toEqual({})
  })

  it('survives normalisation and is optional', () => {
    const e = normalizeEntry({ id: 'x', plantId: 'p', type: 'photo', photoIds: ['a'], align: { a: { x: 0.05, y: 0.02, scale: 1.1, rotate: 2 } } })
    expect(e.align).toEqual({ a: { x: 0.05, y: 0.02, scale: 1.1, rotate: 2 } })
    expect('align' in normalizeEntry({ id: 'y', plantId: 'p', type: 'note' })).toBe(false)
    const data = normalizeData({ plants: [{ id: 'p', name: 'P' }], entries: [{ plantId: 'p', type: 'photo', photoIds: ['a'], align: { a: { x: 0.1 } } }] })
    expect(data.entries[0]!.align?.a?.x).toBe(0.1)
  })
})

describe('timelapse', () => {
  const p = plant()
  const entries = [
    entry({ type: 'photo', date: '2026-02-25', photoIds: ['c'] }),
    entry({ type: 'photo', date: '2026-01-05', photoIds: ['a'], align: { a: { x: 0.1, y: 0, scale: 1, rotate: 0 } } }),
    entry({ type: 'water', date: '2026-01-20', photoIds: ['b'] }),
    entry({ type: 'photo', date: '2026-01-20', photoIds: [] }),
    entry({ type: 'photo', plantId: 'other', date: '2026-01-10', photoIds: ['z'] })
  ]

  it('orders frames and resolves stage and day', () => {
    const frames = timelapseFrames(p, entries)
    expect(frames.map(f => f.photoId)).toEqual(['a', 'b', 'c'])
    expect(frames.map(f => f.stage)).toEqual(['seedling', 'vegetative', 'flowering'])
    expect(frames[1]!.day).toBe(19)
    expect(frames[0]!.align.x).toBe(0.1)
    expect(frames[1]!.align).toEqual({ x: 0, y: 0, scale: 1, rotate: 0 })
  })

  it('stageOn uses the history', () => {
    expect(stageOn(p, '2025-12-31')).toBe('seedling')
    expect(stageOn(p, '2026-01-15')).toBe('vegetative')
    expect(stageOn(p, '2026-05-01')).toBe('flowering')
  })

  it('ghost is the newest earlier photo outside the new entry', () => {
    expect(ghostFrame(p, entries, '2026-02-01')?.photoId).toBe('b')
    expect(ghostFrame(p, entries, '2026-03-01', ['c'])?.photoId).toBe('b')
    expect(ghostFrame(p, entries, '2026-01-01')).toBeNull()
  })

  it('video steps hold each photo and cross-fade when smooth', () => {
    const hard = videoSteps(3, 3, 30, false, 1)
    expect(hard.length).toBe(10 + 10 + 40)
    expect(hard.every(s => s.mix === 0)).toBe(true)
    const soft = videoSteps(2, 3, 30, true, 0)
    expect(soft.some(s => s.from === 0 && s.to === 1 && s.mix > 0 && s.mix < 1)).toBe(true)
    expect(soft[soft.length - 1]).toEqual({ from: 1, to: 1, mix: 0 })
    expect(clipSeconds(3, 3, 30, 1)).toBe(2)
    expect(videoSteps(0, 4, 30, true)).toEqual([])
  })
})

describe('grow wrapped', () => {
  const a = plant({ id: 'a', name: 'A', harvest: { date: '2026-04-01', wetWeight: 300, dryWeight: 80, notes: '' }, stage: 'curing' })
  const b = plant({ id: 'b', name: 'B', harvest: { date: '2026-04-03', wetWeight: 200, dryWeight: 55.5, notes: '' }, stage: 'curing' })
  const c = plant({ id: 'c', name: 'C' })
  const entries = [
    entry({ plantId: 'a', type: 'water', date: '2026-03-01', amountMl: 1500 }),
    entry({ plantId: 'a', type: 'water', date: '2026-03-02', amountMl: 500 }),
    entry({ plantId: 'a', type: 'photo', date: '2026-03-03', photoIds: ['pa'] }),
    entry({ plantId: 'b', type: 'feed', date: '2026-03-03', amountMl: 1000 }),
    entry({ plantId: 'c', type: 'water', date: '2026-03-10' }),
    entry({ plantId: 'c', type: 'note', date: '2025-06-01', note: 'old' })
  ]
  const data = { plants: [a, b, c], entries }

  it('lists years and all time', () => {
    expect(wrappedPeriods(data).map(p => p.id)).toEqual(['2026', '2025', 'all'])
    expect(wrappedPeriods({ plants: [], entries: [] }).map(p => p.id)).toEqual(['all'])
  })

  it('computes the season', () => {
    const s = computeWrapped(data, wrappedPeriods(data)[0]!)!
    expect(s.plants).toBe(3)
    expect(s.entries).toBe(5)
    expect(s.dryGrams).toBe(135.5)
    expect(s.wetGrams).toBe(500)
    expect(s.bestPlant?.id).toBe('a')
    expect(s.topAction).toEqual({ type: 'water', count: 3 })
    expect(s.waterLitres).toBe(3)
    expect(s.longestStreak).toBe(3)
    expect(s.streakEnd).toBe('2026-03-03')
    expect(s.bestPhoto?.photoId).toBe('pa')
    expect(s.firstDate).toBe('2026-03-01')
    expect(s.lastDate).toBe('2026-04-03')
    expect(s.seasonDays).toBe(34)
    expect(s.mostLogged?.id).toBe('a')
  })

  it('returns null for an empty period', () => {
    expect(computeWrapped(data, { id: '2024', from: '2024-01-01', to: '2024-12-31' })).toBeNull()
  })

  it('finds the longest streak', () => {
    expect(longestStreak(['2026-01-01', '2026-01-03', '2026-01-04', '2026-01-04', '2026-01-05'])).toEqual({ length: 3, end: '2026-01-05' })
    expect(longestStreak([])).toEqual({ length: 0, end: null })
  })
})

describe('compare', () => {
  const p = plant({ stage: 'curing', archived: false, harvest: { date: '2026-04-10', wetWeight: 400, dryWeight: 100, notes: '' }, stageHistory: [{ stage: 'seedling', date: '2026-01-01' }, { stage: 'vegetative', date: '2026-01-15' }, { stage: 'flowering', date: '2026-02-20' }, { stage: 'drying', date: '2026-04-10' }, { stage: 'curing', date: '2026-04-20' }] })
  const entries = [
    entry({ type: 'feed', date: '2026-01-20', ec: 1.2, ph: 6.2, amountMl: 1000 }),
    entry({ type: 'feed', date: '2026-01-20', ec: 1.4, ph: 6.4, amountMl: 1000 }),
    entry({ type: 'measure', date: '2026-02-01', heightCm: 40 }),
    entry({ type: 'note', date: '2026-04-25' })
  ]

  it('summarises a finished run', () => {
    const s = runSummary(p, entries, '2026-10-01')
    expect(s.endDate).toBe('2026-04-25')
    expect(s.harvestDay).toBe(99)
    expect(s.vegDays).toBe(36)
    expect(s.flowerDays).toBe(49)
    expect(s.feeds).toBe(2)
    expect(s.avgEc).toBe(1.3)
    expect(s.avgPh).toBe(6.3)
    expect(s.maxHeight).toBe(40)
    expect(s.dry).toBe(100)
    expect(s.waterLitres).toBe(2)
  })

  it('splits stages into day segments', () => {
    const seg = stageSegments(p, '2026-04-25')
    expect(seg[0]).toEqual({ stage: 'seedling', from: 0, to: 14 })
    expect(seg[seg.length - 1]).toEqual({ stage: 'curing', from: 109, to: 115 })
  })

  it('averages series per day and finds nearby photos', () => {
    expect(daySeries(p, entries, 'ec')).toEqual([{ day: 19, value: 1.3 }])
    const frames = [{ photoId: 'x', entryId: 'e', date: '', day: 10, stage: 'seedling' as const, align: { x: 0, y: 0, scale: 1, rotate: 0 } }]
    expect(nearestFrame(frames, 14)?.photoId).toBe('x')
    expect(nearestFrame(frames, 30)).toBeNull()
  })

  it('picks the better side', () => {
    expect(better(100, 80, true)).toBe('a')
    expect(better(100, 80, false)).toBe('b')
    expect(better(null, 80, true)).toBeNull()
    expect(better(1, 2, null)).toBeNull()
  })
})

describe('pdf + archive', () => {
  it('writes a valid PDF skeleton', () => {
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9])
    const pdf = buildPdf([{ jpeg, width: 10, height: 14 }, { jpeg, width: 10, height: 14 }], { title: 'Žlutá' })
    const text = new TextDecoder('latin1').decode(pdf)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Count 2')
    expect(text).toContain(pdfString('Žlutá'))
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    // xref offset points at the xref table
    const start = Number(text.match(/startxref\n(\d+)/)![1])
    expect(text.slice(start, start + 4)).toBe('xref')
    // every object offset points at "<id> 0 obj"
    const offsets = [...text.slice(start).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]))
    offsets.forEach((o, i) => expect(text.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`))
  })

  it('names photos chronologically and writes CSV + ZIP', () => {
    const names = photoFileNames([{ photoId: 'a', date: '2026-01-05', day: 4, ext: 'jpg' }, { photoId: 'b', date: '2026-01-05', day: 4, ext: 'jpg' }])
    expect(names.get('b')).toBe('photos/day-004_2026-01-05_2.jpg')
    const csv = journalCsv(plant(), [entry({ type: 'note', date: '2026-01-03', note: 'hi, "there"', photoIds: ['a'] })], names)
    expect(csv).toContain('"hi, ""there"""')
    expect(csv).toContain('photos/day-004_2026-01-05_1.jpg')
    const zip = buildArchive({ data: { ok: 1 }, csv, readme: 'r', photos: [{ name: 'photos/a.jpg', bytes: new Uint8Array([1, 2, 3]) }] }, 'grow')
    const files = unzipSync(zip)
    expect(Object.keys(files).sort()).toEqual(['grow/README.txt', 'grow/journal.csv', 'grow/photos/a.jpg', 'grow/plant.json'])
    expect(JSON.parse(strFromU8(files['grow/plant.json']!))).toEqual({ ok: 1 })
  })
})
