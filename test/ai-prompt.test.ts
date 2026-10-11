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

  it('describes the plant compactly in Czech', () => {
    const text = run('cs')
    expect(text).toContain('Gelato, Gelato Auto (samonakvétací (autoflower)) · Kvetení 21. den (4. týden), věk 71 d, start 1. 8.')
    expect(text).toContain('hlína 11 L, interiér · světlo 18/6, 06:00–00:00, teď svítí (zhasne za 3 h 20 min) · zálivka á 3 dny · zdraví 4/5')
    expect(text).toContain('Pozn.: Mírně žloutnou spodní listy')
  })

  it('describes the plant compactly in English', () => {
    const text = run('en')
    expect(text).toContain('Gelato, Gelato Auto (autoflower) · Flowering day 21 (week 4), age 71 d, started 1 Aug')
    expect(text).toContain('soil 11 L, indoors · light 18/6, on 06:00–00:00, lit now (off in 3 h 20 min) · water every 3 d · health 4/5')
  })

  it('lists recent entries newest first, one line each', () => {
    const text = run('en')
    expect(text).toContain('- 10 Oct Water 1.5 L, pH 6.4\n- 9 Oct Measure 70 cm, 25 °C, RH 55 %\n- 8 Oct Feed 1 L, BioBloom 2 ml/L, pH 6.2, EC 1.4')
    expect(run('cs')).toContain('- 10. 10. Zálivka 1,5 L, pH 6.4')
  })

  it('summarises older history, ignores other plants and skips light outdoors', () => {
    const text = run('cs')
    expect(text).toMatch(/Dříve: 1× \S+, 1× \S+/)
    expect(text).toContain('Ošetření: 5. 9.')
    expect(text).toContain('Neem')
    expect(text.split('\n').filter(l => l.startsWith('- '))).toHaveLength(3)
    expect(summarizePlant({ plant: { ...plant, location: 'outdoor' }, entries, light: { lightsOn: '06:00', lightHours: 18 } })).not.toContain('světlo')
  })

  it('does not repeat measurements already listed in the journal', () => {
    expect(run('cs')).not.toContain('Poslední:')
    const old = summarizePlant({ plant, entries: entries.filter(e => e.type !== 'measure').concat({ ...entries[2]!, date: '2026-09-01' }), today: '2026-10-11' })
    expect(old).toContain('Poslední: 25 °C (1. 9.), RH 55 % (1. 9.), 70 cm (1. 9.)')
  })
})

describe('describeLight', () => {
  it('handles darkness and continuous light in both languages', () => {
    locale.value = 'cs'
    expect(describeLight('06:00', 12, new Date(2026, 9, 11, 19, 0))).toBe('světlo 12/12, 06:00–18:00, teď tma (rozsvítí za 11 h 0 min)')
    expect(describeLight('06:00', 24)).toBe('světlo 24/0')
    locale.value = 'en'
    expect(describeLight('06:00', 12, new Date(2026, 9, 11, 19, 0))).toBe('light 12/12, on 06:00–18:00, dark now (on in 11 h 0 min)')
  })
})

describe('systemInstruction', () => {
  it('asks for the selected language and translated facts', () => {
    expect(systemInstruction('cs')).toContain('Odpovídej česky a tykej')
    expect(systemInstruction('cs')).toContain('anglických úryvků přelož')
    expect(systemInstruction('en')).toContain('Answer in English')
    for (const lang of ['cs', 'en'] as const) {
      expect(systemInstruction(lang)).toContain('<<reply:')
      expect(systemInstruction(lang)).toContain('<<photo>>')
    }
    expect(systemInstruction('en')).toContain('Translate facts from Czech passages')
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
    expect(text).toContain('[1] Dusík (kurátorovaná znalost)\nSpodní listy žloutnou jako první.')
    expect(text).toContain('[2] Forum (fórum/korpus – méně spolehlivé)')
    expect(text).not.toContain('https://')
    expect(text.length).toBeLessThan(500)
  })

  it('puts context, diagnosis, passages and question into one turn', () => {
    const text = buildTurnText({ question: 'Co s tím?', plantContext: 'Rostlina: Gelato', diagnosis: diag, passages: hits, today: '2026-10-11' })
    expect(text).toContain('## Rostlina\nRostlina: Gelato')
    expect(text).toContain('1. Nedostatek dusíku 62 % (tested)')
    expect(text).toContain('Nepozná: plíseň šedá')
    expect(buildTurnText({ question: 'x', passages: null })).not.toContain('## Rostlina')
    expect(text.indexOf('## Úryvky')).toBeLessThan(text.indexOf('## Otázka\nCo s tím?'))
  })

  it('builds the turn in English', () => {
    locale.value = 'en'
    const text = buildTurnText({ question: '', photoWithoutClassifier: true, kbAvailable: false, today: '2026-10-11' })
    expect(text).toContain('Today: Sun, 11 Oct 2026')
    expect(text).toContain('No knowledge pack installed')
    expect(text).toContain('What do you see in the photo?')
    expect(formatPassages(hits)).toContain('[2] Forum (forum/corpus – less reliable)')
  })

  it('omits the passages section when search was skipped', () => {
    expect(buildTurnText({ question: 'ahoj', passages: null })).not.toContain('## Úryvky')
  })

  it('explains missing knowledge base and classifier', () => {
    const text = buildTurnText({ question: '', photoWithoutClassifier: true, kbAvailable: false })
    expect(text).toContain('Klasifikátor na zařízení není')
    expect(text).toContain('Znalostní balíček není nainstalovaný')
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
      { role: 'assistant', text: 'odpověď [1] a [2, 3].' }
    ])
    expect(history).toEqual([
      { role: 'user', text: 'a\n\nb\n(fotka)' },
      { role: 'assistant', text: 'odpověď a.' }
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

describe('prepareHistory truncation', () => {
  it('keeps the last answer longer than older ones', () => {
    const long = 'x'.repeat(1000)
    const h = prepareHistory([{ role: 'user', text: 'q1' }, { role: 'assistant', text: long }, { role: 'user', text: 'q2' }, { role: 'assistant', text: long }])
    expect(h.map(t => t.text.length)).toEqual([2, 300, 2, 700])
  })
})

describe('selectPassages', () => {
  const hit = (id: string, kind: KbHit['kind']): KbHit => ({ id, kind, title: id, text: id, lang: 'cs', score: 1 })
  it('prefers curated passages, caps forum text and keeps search order', () => {
    const hits = [hit('c1', 'corpus'), hit('k1', 'knowledge'), hit('c2', 'corpus'), hit('c3', 'corpus'), hit('f1', 'feeding_chart'), hit('c4', 'corpus'), hit('c5', 'corpus')]
    expect(selectPassages(hits, 5, 2).map(h => h.id)).toEqual(['c1', 'k1', 'c2', 'f1'])
    expect(selectPassages(hits, 3, 3).map(h => h.id)).toEqual(['c1', 'k1', 'f1'])
  })

  it('drops near-identical passages', () => {
    const a = { ...hit('k1', 'knowledge'), title: 'Žloutnutí listů', text: 'Spodní listy žloutnou…' }
    expect(selectPassages([a, { ...a, id: 'k2', title: 'Žloutnutí  listů!' }, hit('k3', 'knowledge')]).map(h => h.id)).toEqual(['k1', 'k3'])
  })
})

describe('citedNumbers', () => {
  it('finds single and grouped citations', () => {
    expect(citedNumbers('A [1], B [3, 2] a C [2][5].')).toEqual([1, 2, 3, 5])
  })
})
