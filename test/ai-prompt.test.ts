import { beforeEach, describe, expect, it } from 'vitest'
import type { DiagResult } from '../app/ai/diagnose'
import type { KbHit } from '../app/ai/kb'
import { buildKbQuery, buildTurnText, citedNumbers, describeLight, formatPassages, isSmallTalk, prepareHistory, selectPassages, summarizePlant, systemInstruction } from '../app/ai/prompt'
import type { JournalEntry, Plant } from '../app/types/grow'
import { blankEntry } from '../app/utils/entries'
import { locale } from '../app/utils/locale'

const plant: Plant = {
  id: 'p1',
  name: 'Gelato',
  strain: 'Gelato Auto',
  type: 'autoflower',
  stage: 'flowering',
  stageHistory: [
    { stage: 'seedling', date: '2026-08-01' },
    { stage: 'vegetative', date: '2026-08-20' },
    { stage: 'flowering', date: '2026-09-20' }
  ],
  startDate: '2026-08-01',
  potSize: '11 L',
  medium: 'soil',
  location: 'indoor',
  wateringInterval: 3,
  health: 4,
  photoId: null,
  notes: 'Mírně žloutnou spodní listy',
  harvest: null,
  archived: false,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z'
}

let seq = 0
const entry = (patch: Partial<JournalEntry>): JournalEntry => ({
  ...blankEntry(),
  id: `e${++seq}`,
  plantId: 'p1',
  type: 'water',
  date: '2026-10-10',
  createdAt: `2026-10-10T08:00:${String(seq).padStart(2, '0')}.000Z`,
  ...patch
})

const entries = [
  entry({ type: 'feed', date: '2026-10-08', amountMl: 1000, nutrients: 'BioBloom 2 ml/L', ph: 6.2, ec: 1.4 }),
  entry({ type: 'water', date: '2026-10-10', amountMl: 1500, ph: 6.4 }),
  entry({ type: 'measure', date: '2026-10-09', tempC: 25, humidity: 55, heightCm: 70 }),
  entry({ type: 'feed', date: '2026-09-01', nutrients: 'BioGrow 3 ml/L' }),
  entry({ type: 'pest', date: '2026-09-05', product: 'Neem' }),
  entry({ type: 'water', date: '2026-10-09', plantId: 'other' })
]

describe('summarizePlant', () => {
  const at = new Date(2026, 9, 11, 20, 40)
  const run = (lang: 'cs' | 'en') => {
    locale.value = lang
    return summarizePlant({ plant, entries, today: '2026-10-11', light: { lightsOn: '06:00', lightHours: 18 }, now: at })
  }

  it('describes the plant in Czech with Czech dates', () => {
    const text = run('cs')
    expect(text).toContain('Rostlina: Gelato – odrůda Gelato Auto (samonakvétací (autoflower))')
    expect(text).toContain('21. den této fáze (4. týden), celkové stáří 71 dní (start 1. 8. 2026)')
    expect(text).toContain('hlína, květináč 11 L, interiér')
    expect(text).toContain('Světlo: 18/6, zapíná 06:00, zhasíná 00:00, teď svítí (zhasne za 3 h 20 min)')
    expect(text).toContain('Plánovaný interval zálivky: každé 3 dny')
    expect(text).toContain('Mírně žloutnou spodní listy')
  })

  it('describes the plant in English with English dates', () => {
    const text = run('en')
    expect(text).toContain('Plant: Gelato – strain Gelato Auto (autoflower)')
    expect(text).toContain('day 21 of this stage (week 4), total age 71 days (started 1 Aug 2026)')
    expect(text).toContain('Setup: soil, pot 11 L, indoors')
    expect(text).toContain('Light: 18/6, on at 06:00, off at 00:00, lit now (off in 3 h 20 min)')
    expect(text).toContain('Planned watering interval: every 3 days')
  })

  it('lists recent entries newest first with doses', () => {
    const text = run('en')
    const water = text.indexOf('10 Oct 2026')
    const feed = text.indexOf('8 Oct 2026')
    expect(water).toBeGreaterThan(-1)
    expect(feed).toBeGreaterThan(water)
    expect(text).toContain('1 L, BioBloom 2 ml/L, pH 6.2, EC 1.4 mS/cm')
    expect(run('cs')).toContain('1,5 L, pH 6.4')
  })

  it('summarises older history, ignores other plants and skips light outdoors', () => {
    const text = run('cs')
    expect(text).toMatch(/Starší historie: 0× \S+, 1× \S+/)
    expect(text).toContain('Dřívější ošetření: 5. 9. 2026')
    expect(text).toContain('Neem')
    expect(text.split('\n').filter(l => l.startsWith('- '))).toHaveLength(3)
    expect(summarizePlant({ plant: { ...plant, location: 'outdoor' }, entries, light: { lightsOn: '06:00', lightHours: 18 } })).not.toContain('Světlo')
  })

  it('reports the latest measurements', () => {
    expect(run('cs')).toContain('teplota 25 °C (9. 10. 2026), vlhkost 55 % (9. 10. 2026), výška 70 cm (9. 10. 2026), pH 6.4 (10. 10. 2026)')
    expect(run('en')).toContain('temperature 25 °C (9 Oct 2026), humidity 55 % (9 Oct 2026)')
  })
})

describe('describeLight', () => {
  it('handles darkness and continuous light in both languages', () => {
    locale.value = 'cs'
    expect(describeLight('06:00', 12, new Date(2026, 9, 11, 19, 0))).toBe('Světlo: 12/12, zapíná 06:00, zhasíná 18:00, teď je tma (rozsvítí se za 11 h 0 min)')
    expect(describeLight('06:00', 24)).toBe('Světlo: 24/0, svítí nepřetržitě')
    locale.value = 'en'
    expect(describeLight('06:00', 12, new Date(2026, 9, 11, 19, 0))).toBe('Light: 12/12, on at 06:00, off at 18:00, dark now (on in 11 h 0 min)')
  })
})

describe('systemInstruction', () => {
  it('asks for the selected language and translated facts', () => {
    expect(systemInstruction('cs')).toContain('odpovídej vždy česky')
    expect(systemInstruction('cs')).toContain('převeď do češtiny')
    expect(systemInstruction('en')).toContain('always answer in English')
    for (const lang of ['cs', 'en'] as const) {
      expect(systemInstruction(lang)).toContain('<<reply:')
      expect(systemInstruction(lang)).toContain('<<photo>>')
    }
    expect(systemInstruction('en')).toContain('translate the facts')
    locale.value = 'en'
    expect(systemInstruction()).toBe(systemInstruction('en'))
  })
})

const diag: DiagResult = {
  diag: [
    { cls: 'n_def', label: 'Nedostatek dusíku', p: 0.62, evidence: 'tested' },
    { cls: 'mites', label: 'Svilušky', p: 0.21, evidence: 'weak' },
    { cls: 'k_def', label: 'Nedostatek draslíku', p: 0.05, evidence: 'transfer-only' }
  ],
  stage: [{ cls: 'flower', label: 'kvetení', p: 0.9 }],
  unsupported: ['plíseň šedá'],
  modelVersion: 'test-1'
}

const hits: KbHit[] = [
  { id: 'a', kind: 'knowledge', title: 'Dusík', text: 'Spodní listy žloutnou   jako první.', url: 'https://example.org/n', lang: 'cs', score: 0.9 },
  { id: 'b', kind: 'corpus', title: 'Forum', text: 'x'.repeat(2000), lang: 'en', score: 0.5 }
]

describe('turn assembly', () => {
  beforeEach(() => {
    locale.value = 'cs'
  })

  it('adds the top diagnosis names to the knowledge query', () => {
    expect(buildKbQuery('  Proč žloutne? ', diag)).toBe('Proč žloutne? Nedostatek dusíku Svilušky')
    expect(buildKbQuery('pH v hlíně')).toBe('pH v hlíně')
  })

  it('numbers passages and marks how reliable they are', () => {
    const text = formatPassages(hits)
    expect(text).toContain('[1] Dusík (kurátorovaná znalost, cs)\nURL: https://example.org/n\nSpodní listy žloutnou jako první.')
    expect(text).toContain('[2] Forum (fórum/korpus – méně spolehlivé, en)')
    expect(text.length).toBeLessThan(1500)
  })

  it('puts context, diagnosis, passages and question into one turn', () => {
    const text = buildTurnText({ question: 'Co s tím?', plantContext: 'Rostlina: Gelato', diagnosis: diag, passages: hits, today: '2026-10-11' })
    expect(text).toContain('## Kontext rostliny\nRostlina: Gelato')
    expect(text).toContain('1. Nedostatek dusíku – 62 % (důkazy: tested')
    expect(text).toContain('Klasifikátor nepozná (nepodporováno): plíseň šedá')
    expect(text.indexOf('## Úryvky')).toBeLessThan(text.indexOf('## Otázka\nCo s tím?'))
  })

  it('builds the turn in English', () => {
    locale.value = 'en'
    const text = buildTurnText({ question: '', photoWithoutClassifier: true, kbAvailable: false, today: '2026-10-11' })
    expect(text).toContain('Today: Sunday, 11 October 2026')
    expect(text).toContain('## Plant context\nThe question is not about a specific plant')
    expect(text).toContain('The knowledge base is not installed')
    expect(text).toContain('What do you see in the photo?')
    expect(formatPassages(hits)).toContain('[2] Forum (forum/corpus – less reliable, en)')
  })

  it('omits the passages section when search was skipped', () => {
    expect(buildTurnText({ question: 'ahoj', passages: null })).not.toContain('## Úryvky')
  })

  it('explains missing knowledge base and classifier', () => {
    const text = buildTurnText({ question: '', photoWithoutClassifier: true, kbAvailable: false })
    expect(text).toContain('Klasifikátor na zařízení není k dispozici')
    expect(text).toContain('Znalostní báze není v zařízení nainstalovaná')
    expect(text).toContain('Co vidíš na fotce?')
  })
})

describe('prepareHistory', () => {
  beforeEach(() => {
    locale.value = 'cs'
  })

  it('starts with the user, merges repeated roles and keeps the last turns', () => {
    const history = prepareHistory([
      { role: 'assistant', text: 'orphan' },
      { role: 'user', text: 'a' },
      { role: 'user', text: 'b', hadPhoto: true },
      { role: 'assistant', text: 'odpověď' }
    ])
    expect(history).toEqual([
      { role: 'user', text: 'a\n\nb\n(přiložil jsem fotku)' },
      { role: 'assistant', text: 'odpověď' }
    ])
    const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' as const : 'user' as const, text: `t${i}` }))
    expect(prepareHistory(long, 3)).toHaveLength(6)
  })
})

describe('isSmallTalk', () => {
  it('recognises greetings and thanks only', () => {
    for (const q of ['Ahoj!', 'čau', 'jak se máš?', 'Díky moc', 'Dobrý den', 'Hi there', 'hello', 'thanks!']) {
      expect(isSmallTalk(q), q).toBe(true)
    }
    for (const q of ['ahoj, proč žloutnou listy?', 'kolik je 2+2', 'jaké pH v hlíně', '']) expect(isSmallTalk(q), q).toBe(false)
  })
})

describe('selectPassages', () => {
  const hit = (id: string, kind: KbHit['kind']): KbHit => ({ id, kind, title: id, text: id, lang: 'cs', score: 1 })
  it('prefers curated passages, caps forum text and keeps search order', () => {
    const hits = [hit('c1', 'corpus'), hit('k1', 'knowledge'), hit('c2', 'corpus'), hit('c3', 'corpus'), hit('f1', 'feeding_chart'), hit('c4', 'corpus'), hit('c5', 'corpus')]
    expect(selectPassages(hits, 5, 2).map(h => h.id)).toEqual(['c1', 'k1', 'c2', 'f1'])
    expect(selectPassages(hits, 3, 3).map(h => h.id)).toEqual(['c1', 'k1', 'f1'])
  })
})

describe('citedNumbers', () => {
  it('finds single and grouped citations', () => {
    expect(citedNumbers('A [1], B [3, 2] a C [2][5].')).toEqual([1, 2, 3, 5])
  })
})
