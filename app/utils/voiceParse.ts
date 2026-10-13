// Rule-based parser for spoken quick logs (Czech + English), e.g.
// "zalil jsem 2 litry pH 6,2 EC 1,4" → water entry, 2000 ml, pH 6.2, EC 1.4.
import type { EntryType, TrainingMethod } from '../types/grow'

export type VoiceLang = 'cs' | 'en'

export interface VoicePlant {
  id: string
  name: string
}

export interface VoiceDraft {
  type: EntryType
  plantId: string | null
  /** days relative to today (0 today, -1 yesterday) */
  dayOffset: number
  amountMl: number | null
  ph: number | null
  ec: number | null
  nutrients: string
  method: TrainingMethod | null
  product: string
  heightCm: number | null
  tempC: number | null
  humidity: number | null
  note: string
}

interface Tok {
  /** original text (numbers normalised to "6.2") */
  o: string
  /** folded: lowercase, no diacritics */
  f: string
  num: number | null
  used: boolean
}

// ── Tokenising ────────────────────────────────────────────────────

const foldChar = (ch: string) => {
  const base = ch.normalize('NFD').charAt(0)
  const low = base.toLowerCase()
  return low.length === 1 ? low : base
}
const fold = (s: string) => [...s].map(foldChar).join('')

function tokenize(text: string): Tok[] {
  const re = /\d+(?:[.,]\d+)?|[\p{L}µ][\p{L}\p{N}µ]*(?:[-'’][\p{L}\p{N}]+)*|%|°|\/|[,;.!?:+#]/gu
  const out: Tok[] = []
  for (const m of text.matchAll(re)) {
    const raw = m[0]
    if (/^\d/.test(raw)) {
      const v = raw.replace(',', '.')
      out.push({ o: v, f: v, num: Number(v), used: false })
    } else {
      out.push({ o: raw, f: fold(raw), num: null, used: false })
    }
  }
  return out
}

// ── Number words ──────────────────────────────────────────────────

const CS_NUM: Record<string, number> = {
  nula: 0, jedna: 1, jeden: 1, jedno: 1, jednu: 1, jednoho: 1, dva: 2, dve: 2, dvou: 2, tri: 3, trech: 3, ctyri: 4, ctyr: 4,
  pet: 5, sest: 6, sedm: 7, osm: 8, devet: 9, deset: 10, jedenact: 11, dvanact: 12, trinact: 13, ctrnact: 14,
  patnact: 15, sestnact: 16, sedmnact: 17, osmnact: 18, devatenact: 19, dvacet: 20, tricet: 30, ctyricet: 40,
  padesat: 50, sedesat: 60, sedmdesat: 70, osmdesat: 80, devadesat: 90, sto: 100, ste: 100, sta: 100, set: 100, tisic: 1000
}
const EN_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000
}
const DECIMAL = new Set(['cela', 'cele', 'celych', 'carka', 'tecka', 'point', 'dot'])
const HALF = new Set(['pul', 'half'])
const AND = new Set(['a', 'and'])

function wordValue(t: Tok, lang: VoiceLang): number | null {
  if (t.num !== null) return t.num
  const v = (lang === 'cs' ? CS_NUM : EN_NUM)[t.f]
  return v === undefined ? null : v
}

/** Merges spoken numbers ("šest celá dvě", "two and a half", "dvě stě padesát") into numeric tokens. */
function mergeNumbers(toks: Tok[], lang: VoiceLang): Tok[] {
  const out: Tok[] = []
  let i = 0
  const intRun = (start: number): { value: number, end: number, digits: string } | null => {
    let total = 0
    let cur = 0
    let j = start
    let any = false
    let digits = ''
    while (j < toks.length) {
      const v = wordValue(toks[j]!, lang)
      if (v === null) break
      // a digit token only continues a run of words, never another digit token ("2 3" stays two numbers)
      if (any && toks[j]!.num !== null) break
      if (v === 100) cur = (cur || 1) * 100
      else if (v === 1000) {
        total += (cur || 1) * 1000
        cur = 0
      } else if (any && v < 10 && cur % 10 !== 0) break
      else cur += v
      digits += toks[j]!.num !== null ? toks[j]!.o : String(v)
      any = true
      j++
      if (toks[j - 1]!.num !== null) break
    }
    return any ? { value: total + cur, end: j, digits } : null
  }

  while (i < toks.length) {
    const t = toks[i]!
    // "půl litru", "half a litre"
    if (HALF.has(t.f) && wordValue(toks[i - 1] ?? t, lang) === null) {
      out.push({ o: '0.5', f: '0.5', num: 0.5, used: false })
      i++
      if (toks[i]?.f === 'a' && lang === 'en') i++
      continue
    }
    const run = intRun(i)
    if (!run) {
      out.push(t)
      i++
      continue
    }
    let value = run.value
    let j = run.end
    // decimals: "šest celá dvě", "one point four", "one point two five"
    if (toks[j] && DECIMAL.has(toks[j]!.f)) {
      const singles: string[] = []
      let k = j + 1
      while (toks[k]) {
        const v = wordValue(toks[k]!, lang)
        if (v === null || v > 9 || toks[k]!.num !== null) break
        singles.push(String(v))
        k++
      }
      let frac = ''
      if (singles.length > 1) {
        frac = singles.join('')
        j = k
      } else {
        const fr = intRun(j + 1)
        if (fr) {
          frac = fr.digits.replace('.', '')
          j = fr.end
        }
      }
      if (frac) value = Number(`${Math.trunc(value)}.${frac}`)
    }
    // "dva a půl", "two and a half"
    if (toks[j] && AND.has(toks[j]!.f)) {
      let k = j + 1
      if (toks[k]?.f === 'a' && lang === 'en') k++
      if (toks[k] && HALF.has(toks[k]!.f)) {
        value += 0.5
        j = k + 1
      }
    }
    const s = String(Math.round(value * 1000) / 1000)
    out.push({ o: s, f: s, num: Number(s), used: false })
    i = j
  }
  return out
}

// ── Vocabulary (folded) ───────────────────────────────────────────

const has = (f: string, words: readonly (string | RegExp)[]) => words.some(w => (typeof w === 'string' ? f === w : w.test(f)))

const ML = [/^ml$/, /^mls$/, /^mililitr/, /^millilit/, /^mililit/]
const L = [/^l$/, /^lt$/, /^ltr$/, /^litr/, /^liter/, /^litre/]
const CM = [/^cm$/, /^centimet/, /^centimet/]
const METRE = [/^m$/, /^metr/, /^meter/, /^metre/]
const PCT = ['%', /^procent/, /^percent/, 'pct']
const DEG = ['°', /^stupn/, /^stupen/, /^degree/, /^celsi/]
const MS = ['ms', /^milisiem/, /^millisiem/]
const US = ['us', 'µs', /^mikrosiem/, /^microsiem/, /^mikro$/, /^micro$/]
const PER_L = ['na', 'per', '/', 'za']

const PH = ['ph', 'peha', 'pehacko']
const EC = ['ec', 'ece', 'eces', 'vodivost', 'vodivosti', 'conductivity']
const HEIGHT = [/^vysk/, /^vysok/, 'height', 'tall', /^meri$/]
const TEMP = [/^teplot/, 'temp', 'temperature', 'teplo']
const RH = [/^vlhkost/, 'humidity', 'rh', 'rv']
const FILLER = ['je', 'is', 'was', 'bylo', 'byla', 'byl', 'of', 'at', 'na', '=', ':', 'kolem', 'around', 'about', 'asi', 'zhruba', 'cca']

const WATER = [/^zali/, /^zalev/, /^zalej/, 'zalivka', 'watered', 'water', 'watering', 'irrigated', 'vodou']
const FEED = [/^pohnoj/, /^prihnoj/, /^hnoj/, /^zivin/, 'fed', 'feed', 'feeding', 'nutrients', 'nutes', /^fertili/, 'krmeni']
const ADDED = [/^pridal/, /^pridan/, 'added', 'add', 'mixed', 'namichal', 'namichala']
const MEASURE = [/^zmeril/, /^namer/, /^mereni/, 'measured', 'measurement', 'measure']
const NOTE = [/^poznamk/, 'note']
const PEST = [/^postrik/, /^postrik/, /^strikal/, 'sprayed', 'spray', 'spraying', /^skudc/, /^skudce/, /^msic/, /^svilus/, /^neem/, /^pests?$/, 'mites',
  'aphids', 'thrips', /^trasnen/, /^smutnic/, 'gnats', /^insektic/, /^insectic/, /^fungic/, /^plisen/, /^plisn/, /^padli/, 'mildew', 'mold', 'mould', /^osetril/, 'treated']
const PRODUCT_LEAD = ['s', 'se', 'with', 'using', /^pripravk/, /^prostredk/]
const YESTERDAY = ['vcera', 'yesterday']
const DAY_BEFORE = ['predevcirem']

const METHODS: [TrainingMethod, (string | RegExp)[]][] = [
  ['topping', ['topping', 'topped', /^topnul/, /^topoval/, /^zastip/]],
  ['fim', ['fim', 'fimmed', 'fimming', /^fimnul/, /^fimoval/]],
  ['lst', ['lst', /^ohnul/, /^ohyb/, /^vyvazal/, /^vyvazan/, /^privazal/, 'bent', 'tied']],
  ['scrog', [/^scrog/]],
  ['defoliation', [/^defolia/, /^odlist/]],
  ['lollipop', [/^lollipop/, /^lizatk/]],
  ['transplant', [/^presad/, /^presaz/, /^transplant/, 'repotted', 'repot']],
  ['other', [/^trenink/, /^tvarov/, 'trained', 'training']]
]

const STOP = new Set([
  'a', 'and', 's', 'se', 'with', 'do', 'to', 'into', 'for', 'pro', 'na', 'per', 'on', 'the', 'jsem', 'sem', 'jsme', 'i', 'plus', 'then',
  'pak', 'potom', 'also', 'taky', 'take', 'pri', 'at', 'of', 'in', 'v', 've', 'je', 'is', 'was', 'bylo', 'nebo', 'or', 'a', 'an',
  'it', 'her', 'him', 'ji', 'jim', 'mu', 'ho', 'rostlinu', 'rostline', 'rostlina', 'plant', 'plants', 'kytku', 'kytce', 'today', 'dnes',
  'vody', 'voda', 'vodu', 'water', 'litr', 'litru', 'ml', 'i'
])

const isWord = (t: Tok | undefined): t is Tok => !!t && t.num === null && /\p{L}/u.test(t.f)
const PUNCT = /^[,;.!?:]$/

function isKeyword(f: string): boolean {
  return has(f, [...WATER, ...FEED, ...ADDED, ...MEASURE, ...NOTE, ...PH, ...EC, ...HEIGHT, ...TEMP, ...RH, ...ML, ...L, ...CM, ...PCT, ...DEG, ...MS, ...US, ...YESTERDAY])
    || METHODS.some(([, w]) => has(f, w))
}

// ── Parser ────────────────────────────────────────────────────────

export function parseVoiceLog(text: string, opts: { plants?: VoicePlant[], lang?: VoiceLang } = {}): VoiceDraft {
  const lang = opts.lang ?? 'cs'
  const toks = mergeNumbers(tokenize(text), lang)
  const draft: VoiceDraft = {
    type: 'note', plantId: null, dayOffset: 0, amountMl: null, ph: null, ec: null, nutrients: '', method: null,
    product: '', heightCm: null, tempC: null, humidity: null, note: ''
  }
  const at = (i: number) => toks[i]
  const use = (...idx: number[]) => idx.forEach((i) => {
    if (toks[i]) toks[i]!.used = true
  })

  // plant names first so they never become part of a product name
  draft.plantId = matchPlant(toks, opts.plants ?? [])

  // value after a keyword: "pH 6.2", "pH je 6,2", "EC: 1.4"
  const valueAfter = (i: number): number => {
    let j = i + 1
    while (at(j) && (has(at(j)!.f, FILLER) || at(j)!.f === '-')) j++
    return at(j)?.num !== null && at(j) && !at(j)!.used ? j : -1
  }

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!
    if (t.used || t.num !== null) continue
    if (has(t.f, PH) && draft.ph === null) {
      const j = valueAfter(i)
      if (j >= 0 && at(j)!.num! >= 0 && at(j)!.num! <= 14) {
        draft.ph = at(j)!.num
        use(i, j)
      }
    } else if (has(t.f, EC) && draft.ec === null) {
      const j = valueAfter(i)
      if (j >= 0) {
        let v = at(j)!.num!
        const unit = at(j + 1)
        const micro = !!unit && has(unit.f, US)
        if (micro || (v > 20 && !(unit && has(unit.f, MS)))) v = v / 1000
        if (unit && (has(unit.f, US) || has(unit.f, MS))) {
          use(j + 1)
          if (at(j + 2)?.f === '/' && at(j + 3)?.f === 'cm') use(j + 2, j + 3)
        }
        if (v >= 0 && v <= 10) {
          draft.ec = Math.round(v * 100) / 100
          use(i, j)
        }
      }
    } else if (has(t.f, TEMP) && draft.tempC === null) {
      const j = valueAfter(i)
      if (j >= 0 && at(j)!.num! > -20 && at(j)!.num! < 60) {
        draft.tempC = at(j)!.num
        use(i, j)
        skipUnit(toks, j, DEG)
      }
    } else if (has(t.f, RH) && draft.humidity === null) {
      const j = valueAfter(i)
      if (j >= 0 && at(j)!.num! >= 0 && at(j)!.num! <= 100) {
        draft.humidity = at(j)!.num
        use(i, j)
        skipUnit(toks, j, PCT)
      }
    } else if (has(t.f, HEIGHT) && draft.heightCm === null) {
      const j = valueAfter(i)
      if (j >= 0) {
        const unit = at(j + 1)
        let v = at(j)!.num!
        if (unit && has(unit.f, METRE)) {
          v *= 100
          use(j + 1)
        } else if (unit && has(unit.f, CM)) use(j + 1)
        draft.heightCm = Math.round(v * 10) / 10
        use(i, j)
      }
    } else if (has(t.f, YESTERDAY)) {
      draft.dayOffset = -1
      use(i)
    } else if (has(t.f, DAY_BEFORE)) {
      draft.dayOffset = -2
      use(i)
    } else if (t.f === 'day' && at(i + 1)?.f === 'before' && at(i + 2)?.f === 'yesterday') {
      draft.dayOffset = -2
      use(i, i + 1, i + 2)
    }
  }

  // numbers with a unit: volumes, cm, %, °C
  const nutrients: string[] = []
  const feedLead = toks.some(t => has(t.f, ADDED) || has(t.f, FEED))
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!
    let value: number | null = t.num
    let unitIdx = i + 1
    // bare "litr" / "liter" = one litre
    if (value === null && isWord(t) && !t.used && /^(litr|liter|litre)$/.test(t.f) && !PER_L.includes(at(i - 1)?.f ?? '')) {
      value = 1
      unitIdx = i
    }
    if (value === null || t.used) continue
    const unit = at(unitIdx)
    if (!unit || unit.used) continue
    // "přesadil do 11 litrů" is a pot size, not water
    if (has(unit.f, L) && ['do', 'into', 'to'].includes(at(i - 1)?.f ?? '')) continue
    if (has(unit.f, ML) || has(unit.f, L)) {
      let v = value
      let end = unitIdx + 1
      // "litr a půl", "a litre and a half"
      if (has(unit.f, L) && AND.has(at(end)?.f ?? '')) {
        let k = end + 1
        if (at(k)?.f === 'a') k++
        if (at(k)?.num === 0.5) {
          v += 0.5
          end = k + 1
        }
      }
      const ml = has(unit.f, L) ? v * 1000 : v
      let perL = false
      if (has(unit.f, ML)) {
        const a = at(end)
        const b = at(end + 1)
        if (a && b && PER_L.includes(a.f) && has(b.f, L)) {
          perL = true
          end += 2
        }
      }
      const after = has(unit.f, ML) ? productName(toks, end) : null
      const before = has(unit.f, ML) && !after ? productNameBefore(toks, i, feedLead) : null
      const name = after ?? before
      if (name) {
        nutrients.push(`${name.text} ${formatNum(value, lang)} ml${perL ? '/L' : ''}`)
        use(...range(i, end), ...name.idx)
      } else if (draft.amountMl === null) {
        draft.amountMl = Math.round(ml)
        use(...range(i, end))
      }
      continue
    }
    if (t.num === null) continue
    if (has(unit.f, CM) && draft.heightCm === null) {
      draft.heightCm = value
      use(i, unitIdx)
    } else if (has(unit.f, PCT) && draft.humidity === null && value <= 100) {
      draft.humidity = value
      use(i, unitIdx)
    } else if (has(unit.f, DEG) && draft.tempC === null) {
      draft.tempC = value
      use(i, unitIdx)
      if (at(unitIdx + 1)?.f === 'c' || has(at(unitIdx + 1)?.f ?? '', [/^celsi/])) use(unitIdx + 1)
    }
  }
  draft.nutrients = nutrients.join(', ')

  // training method and pest product
  for (const t of toks) {
    if (t.used || !isWord(t)) continue
    const m = METHODS.find(([, w]) => has(t.f, w))
    if (m && (!draft.method || draft.method === 'other')) {
      draft.method = m[0]
      t.used = true
    }
  }
  const pestIdx = toks.findIndex(t => isWord(t) && has(t.f, PEST))
  if (pestIdx >= 0) {
    const lead = toks.findIndex((t, i) => i >= pestIdx && isWord(t) && has(t.f, PRODUCT_LEAD))
    const name = lead >= 0 ? productName(toks, lead + 1, true) : null
    const neem = toks.find(t => /^neem/.test(t.f))
    draft.product = name?.text ?? (neem ? 'Neem' : '')
  }

  const words = toks.filter(isWord)
  const any = (list: (string | RegExp)[]) => words.some(t => has(t.f, list))
  if (draft.nutrients || (any(FEED) && draft.amountMl !== null)) draft.type = 'feed'
  else if (draft.amountMl !== null || any(WATER)) draft.type = 'water'
  else if (draft.method) draft.type = 'train'
  else if (pestIdx >= 0) draft.type = 'pest'
  else if ([draft.heightCm, draft.tempC, draft.humidity, draft.ph, draft.ec].some(v => v !== null) || any(MEASURE)) draft.type = 'measure'
  else draft.type = 'note'

  if (draft.type === 'note' || draft.type === 'pest') {
    draft.note = text.trim().replace(/^(poznámka|poznamka|note)\s*[:,-]?\s*/i, '')
    if (draft.note) draft.note = draft.note.charAt(0).toUpperCase() + draft.note.slice(1)
  }
  if (draft.type !== 'train') draft.method = null
  if (draft.type !== 'pest') draft.product = ''
  return draft
}

function skipUnit(toks: Tok[], j: number, unit: (string | RegExp)[]) {
  const u = toks[j + 1]
  if (u && has(u.f, unit)) {
    u.used = true
    if (toks[j + 2]?.f === 'c') toks[j + 2]!.used = true
  }
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k)

function formatNum(v: number, lang: VoiceLang): string {
  const s = String(Math.round(v * 100) / 100)
  return lang === 'cs' ? s.replace('.', ',') : s
}

/** Up to three name-like words from `start` ("Bio Grow", "CalMag"). */
function productName(toks: Tok[], start: number, allowKeywords = false): { text: string, idx: number[] } | null {
  const idx: number[] = []
  let j = start
  // "3 ml hnojiva Bio Grow" / "3 ml of Bio Grow"
  while (toks[j] && isWord(toks[j]) && /^(hnojiv|of$|z$)/.test(toks[j]!.f)) j++
  while (toks[j] && idx.length < 3) {
    const t = toks[j]!
    if (t.used || PUNCT.test(t.f) || t.f === '/') break
    if (t.num !== null) break
    if (!isWord(t) || STOP.has(t.f) || (!allowKeywords && isKeyword(t.f))) break
    idx.push(j)
    j++
  }
  if (!idx.length) return null
  return { text: idx.map(i => toks[i]!.o).join(' '), idx }
}

/** "Bio Grow 3 ml" – a name right before the number, only when the sentence talks about adding or feeding. */
function productNameBefore(toks: Tok[], numIdx: number, feedLead: boolean): { text: string, idx: number[] } | null {
  if (!feedLead) return null
  const idx: number[] = []
  let j = numIdx - 1
  while (j >= 0 && idx.length < 3) {
    const t = toks[j]!
    if (t.used || !isWord(t) || STOP.has(t.f) || isKeyword(t.f) || has(t.f, ADDED) || has(t.f, FEED)) break
    idx.unshift(j)
    j--
  }
  if (!idx.length) return null
  return { text: idx.map(i => toks[i]!.o).join(' '), idx }
}

/** Finds the plant whose name is spoken; tolerant of Czech endings ("Gelata" → "Gelato"). */
function matchPlant(toks: Tok[], plants: VoicePlant[]): string | null {
  let best: { id: string, score: number, idx: number[] } | null = null
  let tie = false
  for (const p of plants) {
    const words = fold(p.name).match(/[\p{L}\p{N}]+/gu)?.filter(w => w.length >= 2 || /\d/.test(w)) ?? []
    if (!words.length) continue
    const idx: number[] = []
    let ok = true
    let score = 0
    for (const w of words) {
      let hit: number
      if (/^\d+$/.test(w)) {
        // a number in a name ("#2") only counts right after the rest of the name, never "… 1 litr"
        const prev = idx[idx.length - 1]
        const next = prev === undefined ? -1 : toks[prev + 1]?.f === '#' ? prev + 2 : prev + 1
        hit = next >= 0 && toks[next]?.num === Number(w) && !toks[next]!.used ? next : -1
        if (hit < 0) continue
      } else {
        hit = toks.findIndex((t, i) => !idx.includes(i) && !t.used && wordMatches(t.f, w))
      }
      if (hit < 0) {
        // short filler words in a name ("of") may be skipped
        if (w.length >= 3) {
          ok = false
          break
        }
        continue
      }
      idx.push(hit)
      score += w.length
    }
    if (!ok || !idx.length) continue
    if (!best || score > best.score) {
      best = { id: p.id, score, idx }
      tie = false
    } else if (score === best.score) tie = true
  }
  if (!best || tie) return null
  for (const i of best.idx) toks[i]!.used = true
  return best.id
}

function wordMatches(token: string, word: string): boolean {
  if (token === word) return true
  if (/\d/.test(word) || /\d/.test(token)) return false
  if (word.length < 4 || token.length < 4) return false
  const stem = word.slice(0, Math.max(3, word.length - 2))
  return token.startsWith(stem) && token.length <= word.length + 3
}
