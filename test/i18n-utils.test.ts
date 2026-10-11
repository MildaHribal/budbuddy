import { afterEach, describe, expect, it } from 'vitest'
import { dliAdvice, nutrientMix, vpdZone } from '../app/utils/calc'
import { formatDate, formatRelativeDay, weekdayShort } from '../app/utils/date'
import { buildDemoData } from '../app/utils/demo'
import { blankEntry, entryInfo, entrySummary, entryTypes, formatVolume, trainingLabel, trainingMethods, ENTRY_TYPES } from '../app/utils/entries'
import { formatDuration } from '../app/utils/light'
import { locale } from '../app/utils/locale'
import { healthInfo, healthLevels, stageInfo, stages, STAGES } from '../app/utils/stages'
import type { JournalEntry } from '../app/types/grow'

const entry = (e: Partial<JournalEntry>): JournalEntry =>
  ({ ...blankEntry(), id: 'e', plantId: 'p', type: 'measure', date: '2026-10-11', createdAt: '', ...e }) as JournalEntry

afterEach(() => {
  locale.value = 'en'
})

describe('czech labels', () => {
  it('localizes stages and keeps STAGES english', () => {
    locale.value = 'cs'
    expect(stages().map(s => s.label)).toEqual(['Klíčení', 'Sazenice', 'Vegetace', 'Kvetení', 'Sušení', 'Zrání'])
    expect(stageInfo('flowering').range).toBe('7–11 týdnů')
    expect(stageInfo('flowering').color).toBe('#c9a2ff')
    expect(STAGES[0]!.label).toBe('Germination')
    locale.value = 'en'
    expect(stageInfo('curing').label).toBe('Curing')
  })

  it('localizes health levels', () => {
    locale.value = 'cs'
    expect(healthInfo(2).label).toBe('Trápí se')
    expect(healthLevels().map(h => h.label)).toEqual(['Výborné', 'Dobré', 'Ujde', 'Trápí se', 'Kritické'])
  })

  it('localizes entries and training', () => {
    locale.value = 'cs'
    expect(entryInfo('water').verb).toBe('Zalito')
    expect(entryTypes()).toHaveLength(ENTRY_TYPES.length)
    expect(trainingLabel('lst')).toBe('LST')
    expect(trainingLabel('defoliation')).toBe('Defoliace')
    expect(trainingMethods().find(t => t.value === 'other')?.label).toBe('Jiné')
    expect(formatVolume(1500)).toBe('1,5 L')
    expect(entrySummary(entry({ ph: 6.2, humidity: 55 }))).toBe('pH 6,2 · 55 % RV')
    locale.value = 'en'
    expect(formatVolume(1500)).toBe('1.5 L')
    expect(entrySummary(entry({ humidity: 55 }))).toBe('55 % RH')
  })

  it('localizes calculators', () => {
    locale.value = 'cs'
    expect(vpdZone(0.2).label).toBe('Příliš nízké')
    expect(dliAdvice(30)).toBe('Výborné pro vegetaci.')
    expect(nutrientMix([{ name: '', dose: 1 }], 1)[0]!.name).toBe('Bez názvu')
  })

  it('formats durations', () => {
    locale.value = 'cs'
    expect(formatDuration(252)).toBe('4 h 12 min')
  })

  it('builds a czech demo garden', () => {
    locale.value = 'cs'
    const d = buildDemoData('2026-10-11')
    expect(d.tasks[0]!.title).toBe('Zkontrolovat trichomy na Northern Lights')
  })
})

describe('relative days', () => {
  it('uses czech words and plurals', () => {
    locale.value = 'cs'
    expect(formatRelativeDay('2026-10-11', '2026-10-11')).toBe('Dnes')
    expect(formatRelativeDay('2026-10-10', '2026-10-11')).toBe('Včera')
    expect(formatRelativeDay('2026-10-12', '2026-10-11')).toBe('Zítra')
    expect(formatRelativeDay('2026-10-09', '2026-10-11')).toBe('před 2 dny')
    expect(formatRelativeDay('2026-10-06', '2026-10-11')).toBe('před 5 dny')
  })

  it('keeps english', () => {
    expect(formatRelativeDay('2026-10-12', '2026-10-11')).toBe('Tomorrow')
    expect(formatRelativeDay('2026-10-06', '2026-10-11')).toBe('5 days ago')
  })

  it('formats dates in the active locale', () => {
    expect(weekdayShort('2026-10-11')).toBe('Sun')
    locale.value = 'cs'
    expect(weekdayShort('2026-10-11')).toBe('ne')
    expect(formatDate('2026-10-11', { day: 'numeric', month: 'numeric' })).toBe('11. 10.')
  })
})

describe('czechVocative', () => {
  it('declines common first names', async () => {
    const { czechVocative } = await import('../app/utils/locale')
    const cases: Record<string, string> = { 'Karel': 'Karle', 'Pavel': 'Pavle', 'Petr': 'Petře', 'Jan': 'Jane', 'Tomáš': 'Tomáši', 'Marek': 'Marku', 'Patrik': 'Patriku', 'Jana': 'Jano', 'Milda': 'Mildo', 'Marie': 'Marie', 'Igor': 'Igore', 'Karel Novák': 'Karle Novák' }
    for (const [n, v] of Object.entries(cases)) expect(czechVocative(n)).toBe(v)
  })
})
