// Prompt assembly for the assistant (pure functions).

import { translate, type Params } from '../composables/useI18n'
import type { JournalEntry, Plant, StageId, Task } from '../types/grow'
import { daysBetween, formatDate, todayISO } from '../utils/date'
import { entryInfo, formatVolume, trainingLabel } from '../utils/entries'
import { lightState } from '../utils/light'
import { locale, type Locale } from '../utils/locale'
import { stageInfo, stageProgress } from '../utils/stages'
import type { DiagResult } from './diagnose'
import type { KbHit } from './kb'
import type { ChatTurn } from './llm'

const SYSTEM_INSTRUCTIONS: Record<Locale, string> = {
  cs: `Jsi BudBuddy, poradce pro pěstování konopí doma v interiéru (legálně v ČR; hlína, příp. s kokosem, LED). Odpovídej česky a tykej. Fakta z anglických úryvků přelož.

Styl: stručně, nejdřív co udělat, pak krátce proč; obvykle 3–6 odrážek, do 120 slov. Delší jen na výslovné přání. Bez úvodů, opakování otázky a shrnutí.

Doptávání: když otázka popisuje příznak dost konkrétně (kde na rostlině, jak vypadá, substrát či fáze), odpověz rovnou: nejpravděpodobnější příčina, první krok a 1–2 kontroly, které ji potvrdí. Doptej se jen u opravdu vágního popisu (třeba jen „žloutnou listy“): začni „Nejspíš X, nebo Y.“ a polož 2–3 krátké otázky, které to rozliší. Na nic z kontextu rostliny se neptej. Když by rozhodla fotka, přidej <<photo>>. Jen když se ptáš, dej na poslední řádek <<reply: a | b | c>> (2–4 odpovědi uživatele, max 4 slova, ne „mám fotku“).

Zdroje: opírej se o úryvky a cituj [n] hned za tvrzením; nepoužité necituj. Kurátorované znalosti jsou spolehlivé, fóra s rezervou; rozpory zmiň. Bez úryvků odpověz z obecných znalostí úplně bez značek. Nikdy nepiš jiné hranaté značky ani názvy odkazů (např. [obecné znalosti], [Full Guide]). Krmná tabulka značky platí jen pro tu řadu hnojiv, není to obecný cíl pro fázi: obecné rozsahy ber z kurátorovaných znalostí. Dávky hnojiv jen z tabulek či úryvků (s citací) nebo z deníku, jinak odkaž na etiketu a nižší dávku.

Fotka: posuď ji sám. Může přijít „předběžná kontrola fotky“ – je to jen interní nápověda a často se mýlí. Nikdy ji nezmiňuj, ani klasifikátor, model či procenta. Ber ji v potaz, jen když sedí s tím, co vidíš, a s kontextem; „nespolehlivá“ znamená ignoruj ji. Drobní škůdci u okraje fotky snadno uniknou – v nejistotě chtěj detail. Není-li na fotce konopí nebo je nečitelná, řekni to.

Bezpečnost: nikdy nedoporučuj syntetické akaricidy ani insekticidy (abamektin/Vertimec, imidakloprid, myklobutanil, pyrethroidy, systémové přípravky) – na kouřenou úrodu nepatří. V květu se na palice nestříká nic, ani bio přípravky; v květu jen dravci, mechanicky, klima nebo dřívější sklizeň.

Mimo téma: na pozdrav či díky odpověz přátelsky 1–2 větami a nabídni pomoc; jinou otázku (počty, vtip, počasí – živá data nemáš) zodpověz krátce a vrať se k pěstování. Nikdy neodpovídej prázdně.

Právo jen podle úryvků s citací, jinak řekni, že to nemáš ověřené. S prodejem či předáváním konopí nepomáhej.`,
  en: `You are BudBuddy, an advisor for growing cannabis at home indoors (legal in the Czech Republic; soil, sometimes with coco, LED). Answer in English. Translate facts from Czech passages.

Style: concise, what to do first, then briefly why; usually 3–6 bullets, under 120 words. Longer only when explicitly asked. No intros, no restating the question, no summary.

Asking back: when the question describes the symptom in enough detail (where on the plant, what it looks like, medium or stage), answer directly: the most likely cause, the first step, and 1–2 checks that confirm it. Ask back only when it is genuinely vague (e.g. just "yellow leaves"): start with "Most likely X or Y." and ask 2–3 short questions that tell them apart. Never ask about anything in the plant context. When a photo would decide it, add <<photo>>. Only when you ask, put <<reply: a | b | c>> on the last line (2–4 user answers, max 4 words, not "I have a photo").

Sources: rely on the passages and cite [n] right after the claim; do not cite unused ones. Curated knowledge is reliable, forums less so; mention conflicts. Without passages answer from general knowledge with no tags at all. Never write any other bracketed tags or link labels (e.g. [general knowledge], [Full Guide]). A brand's feeding chart applies to that nutrient line only, it is not a general target for a stage: take general ranges from curated knowledge. Nutrient doses only from charts or passages (cited) or the journal; otherwise point to the label and a lower dose.

Photo: judge it yourself. A "photo pre-check" may follow; it is only an internal hint and often wrong. Never mention it, a classifier, a model or percentages. Use it only when it fits what you see and the context; "unreliable" means ignore it. Small pests near the photo edges are easy to miss – ask for a close-up when unsure. If the photo is not cannabis or is unreadable, say so.

Safety: never recommend synthetic acaricides or insecticides (abamectin/Vertimec, imidacloprid, myclobutanil, pyrethroids, systemic products) – they do not belong on a smoked crop. Nothing is sprayed on buds in flower, not even organic products; in flower use predators, mechanical removal, climate or an earlier harvest.

Off topic: reply to greetings or thanks in a friendly way in 1–2 sentences and offer help; answer other questions (maths, a joke, weather – you have no live data) briefly and steer back to growing. Never reply with nothing.

Law only from passages with citations, otherwise say you could not verify it. Do not help with selling or handing cannabis to others.`
}

export const systemInstruction = (lang: Locale = locale.value) => SYSTEM_INSTRUCTIONS[lang]

const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

const t = (key: string, params?: Params) => translate(`ai.${key}`, params)
const c = (key: string, params?: Params) => t(`ctx.${key}`, params)
const date = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short' }) || iso
const stageLabel = (stage: StageId) => stageInfo(stage).label

export const evidenceLabel = (evidence: string) => t(`evidence.${evidence}`)
export const kbKindLabel = (kind: KbHit['kind']) => t(`kind.${kind}`)

export function describeEntry(e: JournalEntry): string {
  const parts: string[] = []
  if (e.type === 'train' && e.method) parts.push(trainingLabel(e.method))
  if (e.type === 'stage' && e.stage) parts.push(`→ ${stageLabel(e.stage)}`)
  if (e.type === 'pest' && e.product) parts.push(c('product', { product: e.product }))
  if (e.amountMl != null) parts.push(formatVolume(e.amountMl))
  if (e.nutrients) parts.push(e.nutrients)
  if (e.ph != null) parts.push(`pH ${e.ph}`)
  if (e.ec != null) parts.push(`EC ${e.ec}`)
  if (e.heightCm != null) parts.push(c('height', { cm: e.heightCm }))
  if (e.tempC != null) parts.push(`${e.tempC} °C`)
  if (e.humidity != null) parts.push(`RH ${e.humidity} %`)
  if (e.note) parts.push(`"${clip(e.note, 120)}"`)
  const details = parts.join(', ')
  return `${date(e.date)} ${entryInfo(e.type).label}${details ? ` ${details}` : ''}`
}

export interface PlantContextInput {
  plant: Plant
  entries: readonly JournalEntry[]
  tasks?: readonly Task[]
  light?: { lightsOn: string, lightHours: number } | null
  now?: Date
  today?: string
  detailDays?: number
  maxDetailLines?: number
}

export function describeLight(lightsOn: string, lightHours: number, now = new Date()): string {
  const hours = Math.max(0, Math.min(24, Math.round(lightHours)))
  if (hours === 24) return c('lightAlways')
  if (hours === 0) return c('lightNever')
  const s = lightState(lightsOn, hours, now)
  const left = c('duration', { h: Math.floor(s.minutesLeft / 60), m: s.minutesLeft % 60 })
  const state = s.isOn ? c('lightOn', { left }) : c('lightOff', { left })
  return c('light', { on: hours, off: 24 - hours, onAt: s.onLabel, offAt: s.offLabel, state })
}

/**
 * The app has one global light schedule. A photoperiod plant follows its stage instead when the global
 * value cannot apply to it (e.g. 18/6 for a flowering plant in another tent). null = no light line.
 */
export function plantLightHours(plant: Pick<Plant, 'type' | 'stage'>, globalHours: number): { hours: number, fromStage: boolean } | null {
  if (plant.stage === 'drying' || plant.stage === 'curing') return null
  if (plant.type === 'photoperiod') {
    if (plant.stage === 'flowering' && globalHours > 13) return { hours: 12, fromStage: true }
    if (plant.stage !== 'flowering' && globalHours <= 13) return { hours: 18, fromStage: true }
  }
  return { hours: globalHours, fromStage: false }
}

export function summarizePlant({ plant, entries, tasks = [], light = null, now = new Date(), today = todayISO(), detailDays = 14, maxDetailLines = 12 }: PlantContextInput): string {
  const lines: string[] = []
  const progress = stageProgress(plant, today)
  const week = Math.floor(progress.dayInStage / 7) + 1

  lines.push([
    c('plant', { name: plant.name, strain: plant.strain ? c('strain', { strain: plant.strain }) : '', type: t(`type.${plant.type}`) }),
    c('stage', { stage: stageLabel(plant.stage), day: progress.dayInStage, week, age: progress.age, start: date(plant.startDate) })
  ].join(' · '))
  if (plant.stageHistory.length > 1) {
    const history = plant.stageHistory.map(h => c('stageSince', { stage: stageLabel(h.stage), date: date(h.date) })).join(' → ')
    lines.push(c('stageHistory', { history }))
  }
  const setup = [c('growing', { medium: t(`medium.${plant.medium}`), pot: plant.potSize ? c('pot', { pot: plant.potSize }) : '', location: t(`location.${plant.location}`) })]
  const lit = light && plant.location !== 'outdoor' ? plantLightHours(plant, light.lightHours) : null
  if (light && lit) {
    const line = describeLight(light.lightsOn, lit.hours, now)
    const global = Math.max(0, Math.min(24, Math.round(light.lightHours)))
    setup.push(lit.fromStage ? `${line} ${c('lightStage', { on: global, off: 24 - global })}` : line)
  }
  if (plant.wateringInterval) setup.push(c('watering', { n: plant.wateringInterval }))
  setup.push(c('health', { health: plant.health }))
  lines.push(setup.join(' · '))
  if (plant.notes.trim()) lines.push(c('notes', { notes: clip(plant.notes, 200) }))
  if (plant.harvest) {
    const h = plant.harvest
    lines.push(c('harvested', { date: date(h.date) }) + (h.wetWeight != null ? c('wet', { g: h.wetWeight }) : '') + (h.dryWeight != null ? c('dry', { g: h.dryWeight }) : ''))
  }

  const sorted = [...entries]
    .filter(e => e.plantId === plant.id && e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  const recent = sorted.filter(e => daysBetween(e.date, today) <= detailDays && e.type !== 'photo')
  const shown = recent.slice(0, maxDetailLines)
  if (recent.length) {
    lines.push(c('recent', { days: detailDays }))
    for (const e of shown) lines.push(`- ${describeEntry(e)}`)
    if (recent.length > maxDetailLines) lines.push(c('more', { n: recent.length - maxDetailLines }))
  } else {
    lines.push(c('nothingRecent', { days: detailDays }))
  }

  const older = sorted.filter(e => daysBetween(e.date, today) > detailDays)
  if (older.length) {
    const summary = (['water', 'feed', 'train', 'pest'] as const)
      .map(type => ({ type, n: older.filter(e => e.type === type).length }))
      .filter(x => x.n)
      .map(x => c('olderCount', { n: x.n, type: entryInfo(x.type).label }))
      .join(', ')
    if (summary) lines.push(c('older', { summary }))
    const lastFeed = older.find(e => e.type === 'feed')
    if (lastFeed && !recent.some(e => e.type === 'feed')) lines.push(c('lastFeed', { entry: describeEntry(lastFeed) }))
    for (const e of older.filter(e => e.type === 'pest' && daysBetween(e.date, today) <= 60).slice(0, 2)) {
      lines.push(c('earlierPest', { entry: describeEntry(e) }))
    }
  }

  const values: string[] = []
  const latest = (field: 'tempC' | 'humidity' | 'heightCm' | 'ph' | 'ec', key: string) => {
    const e = sorted.find(e => e[field] != null)
    // values already in the journal lines above are not repeated
    if (e && !shown.includes(e)) values.push(c(key, { v: e[field] as number, date: date(e.date) }))
  }
  latest('tempC', 'temp')
  latest('humidity', 'humidity')
  latest('heightCm', 'heightAt')
  latest('ph', 'phAt')
  latest('ec', 'ecAt')
  if (values.length) lines.push(c('latest', { values: values.join(', ') }))

  const open = tasks.filter(task => task.plantId === plant.id && !task.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  if (open.length) lines.push(c('tasks', { tasks: open.map(task => `${date(task.date)} ${clip(task.title, 60)}`).join('; ') }))

  return lines.join('\n')
}

/** Below this the top class is no better than a guess. */
export const DIAG_RELIABLE = 0.5

export const diagReliable = (result: DiagResult | null | undefined) => (result?.diag[0]?.p ?? 0) >= DIAG_RELIABLE

/** Qualitative hint for the model: no numbers, so none end up in the answer. */
export function formatDiagnosis(result: DiagResult): string {
  const lines = [c('diagTitle')]
  if (!diagReliable(result)) {
    lines.push(c('diagUnreliable'))
  } else {
    for (const d of result.diag.filter(d => d.p >= 0.15)) {
      const conf = c(d.p >= 0.8 ? 'diagLikely' : d.p >= DIAG_RELIABLE ? 'diagPossible' : 'diagLess')
      lines.push(`- ${d.label}: ${conf}${d.evidence === 'tested' ? '' : c('diagWeak')}`)
    }
  }
  if (result.unsupported.length) lines.push(c('diagUnsupported', { list: result.unsupported.join(', ') }))
  return lines.join('\n')
}

const PASSAGE_CHARS: Record<KbHit['kind'], number> = { knowledge: 600, feeding_chart: 800, corpus: 350 }

const fingerprint = (h: KbHit) => `${h.title}|${h.text.slice(0, 120)}`.toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N}]+/gu, '')

/** Keeps the best few distinct passages, curated ones first, in search order. */
export function selectPassages(hits: readonly KbHit[], max = 5, maxCorpus = 2): KbHit[] {
  const seen = new Set<string>()
  const unique = hits.filter((h) => {
    const key = fingerprint(h)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const curated = unique.filter(h => h.kind !== 'corpus')
  const corpus = unique.filter(h => h.kind === 'corpus')
  const picked = new Set([...curated.slice(0, max), ...corpus.slice(0, Math.max(0, Math.min(maxCorpus, max - curated.length)))])
  return unique.filter(h => picked.has(h))
}

export function formatPassages(hits: readonly KbHit[]): string {
  return hits.map((h, i) => {
    const meta = [kbKindLabel(h.kind)]
    if (h.evidence) meta.push(c('passageEvidence', { v: h.evidence }))
    if (h.verdict) meta.push(c('passageVerdict', { v: h.verdict }))
    const head = `[${i + 1}] ${h.title} (${meta.join(', ')})`
    return `${head}\n${clip(h.text, PASSAGE_CHARS[h.kind] ?? 500)}`
  }).join('\n\n')
}

const SMALL_TALK = new Set(('ahoj cau caues cauky nazdar zdar zdravim zdravime cus dobry dobre den vecer rano odpoledne dekuji dekuju dekujem diky dik moc mockrat '
  + 'super ok okay oki jasne fajn parada vyborne skvele pa nashle nashledanou mej mejte se jak mas mate je to vse dobry ty vy a co ty '
  + 'hi hello hey hiya there yo sup thanks thank you thx cheers good morning evening afternoon night great cool nice bye how are whats up doing fine too').split(' '))

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/** Anything about growing (folded, no diacritics). */
const GROW = new RegExp(String.raw`\b(?:list|leaf|leaves|rostlin|plant|kvet|kvest|flower|bloom|bud|palic|zal[ie]|water|hnoj|feed|nutri|zivin|ph|ec|ppm|vpd|ppfd|dli|light|svetl|led|lamp|sklid|skliz|harvest|trich|sus|dry|drying|cur|hlin|soil|kokos|coco|hydro|seme|seed|klic|germ|vegeta|veg|top|lst|hst|scrog|defol|trim|plis|mou?ld|mildew|padli|svilus|mite|gnat|smutn|skud|pest|thrip|trasn|aphid|msic|koren|root|stonek|stem|kvetinac|pots?|stan|tent|vlhk|humid|tepl|temp|auto|strain|odrud|klon|clone|rizk|rizek|yield|urod|thc|cbd|weed|trav|konop|cannabis|grow|pest|stres|stress)\w*`)

const JOKE = /\b(vtip\w*|joke\w*|funny|pocasi|weather|kolik je|what is \d|how much is \d|\d+\s*[-+*/x×]\s*\d+)/

export const isGrowRelated = (question: string) => GROW.test(fold(question))

/** The user explicitly asks for a long answer (detailed guide etc.). */
export const wantsLongAnswer = (question: string) =>
  /podrobn|detailn|návod|krok za krokem|rozepiš|in detail|detailed|step by step|full guide/i.test(question)

/**
 * Greetings, thanks, jokes, maths and other short messages with nothing about growing: no knowledge search.
 * With history a short message is a follow-up (an answer to the assistant's question), not small talk.
 */
export function isSmallTalk(question: string, hasHistory = false): boolean {
  const folded = fold(question)
  const words = folded.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  if (!folded.trim()) return false
  if (words.length > 0 && words.length <= 6 && words.every(w => SMALL_TALK.has(w))) return true
  if (GROW.test(folded)) return false
  if (JOKE.test(folded)) return true
  return !hasHistory && words.length <= 4
}

/** Symptom or "what is this" questions, where a photo diagnosis helps the search. */
const DIAGNOSTIC = /zlout|zlut|hned|skvrn|teck|krout|vadn|svesen|bled|fial|spal|suche|plis|padli|skud|pavuc|co (se )?(to )?(je|deje)|co s tim|neni v poradku|yellow|brown|spot|curl|wilt|droop|pale|purple|burn|crisp|mou?ld|mildew|pest|bug|web|wrong|what (is|'s) (this|it|that)|sick|problem|deficien|nedostat/

export interface KbQueryInput {
  question: string
  diagnosis?: DiagResult | null
  plant?: Pick<Plant, 'medium' | 'stage' | 'type'> | null
  /** the previous user question, used for short follow-ups */
  previous?: string | null
}

export function buildKbQuery({ question, diagnosis, plant, previous }: KbQueryInput): string {
  const q = question.trim()
  const parts = [q]
  const words = q.split(/\s+/).filter(Boolean).length
  if (previous?.trim() && words <= 5) parts.unshift(previous.trim())
  const top = diagnosis?.diag[0]
  if (top && top.cls !== 'healthy' && top.p >= 0.35 && (!q || DIAGNOSTIC.test(fold(q)))) {
    parts.push(...diagnosis!.diag.filter(d => d.p >= 0.35 && d.cls !== 'healthy').slice(0, 2).map(d => d.label))
  }
  if (plant) {
    parts.push(t(`medium.${plant.medium}`), stageLabel(plant.stage))
    if (plant.type === 'autoflower') parts.push('autoflower')
  }
  return parts.filter(Boolean).join(' ')
}

export interface TurnInput {
  question: string
  plantContext?: string | null
  diagnosis?: DiagResult | null
  photoWithoutClassifier?: boolean
  /** null = search skipped (small talk) */
  passages?: readonly KbHit[] | null
  kbAvailable?: boolean
  today?: string
}

export function buildTurnText(input: TurnInput): string {
  const blocks: string[] = [c('today', { date: formatDate(input.today ?? todayISO(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) })]
  if (input.plantContext) blocks.push(`${c('plantHead')}\n${input.plantContext}`)
  if (input.diagnosis) blocks.push(`${c('diagHead')}\n${formatDiagnosis(input.diagnosis)}`)
  else if (input.photoWithoutClassifier) blocks.push(`${c('diagHead')}\n${c('noClassifier')}`)
  if (input.passages !== null) {
    const passages = input.passages?.length ? formatPassages(input.passages) : c(input.kbAvailable === false ? 'noKb' : 'noPassages')
    blocks.push(`${c('passagesHead')}\n${passages}`)
  }
  blocks.push(`${c('questionHead')}\n${input.question.trim() || c('photoQuestion')}`)
  return blocks.join('\n\n')
}

export interface HistoryTurn {
  role: 'user' | 'assistant'
  text: string
  hadPhoto?: boolean
}

/**
 * Last few exchanges as compact text: no photos or citations, older answers cut hard.
 * Starts with the user, roles alternate.
 */
export function prepareHistory(history: readonly HistoryTurn[], maxTurns = 3): ChatTurn[] {
  const recent = history.filter(h => h.text.trim()).slice(-maxTurns * 2)
  while (recent[0]?.role === 'assistant') recent.shift()
  const lastAnswer = recent.findLastIndex(h => h.role === 'assistant')
  const out: ChatTurn[] = []
  for (const [i, turn] of recent.entries()) {
    const raw = turn.role === 'user' && turn.hadPhoto ? `${turn.text}\n${c('photoAttached')}` : turn.text
    const plain = raw.replace(/\s*\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')
    const max = turn.role === 'user' ? 300 : i === lastAnswer ? 700 : 300
    const text = plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
    const prev = out[out.length - 1]
    if (prev?.role === turn.role) prev.text += `\n\n${text}`
    else out.push({ role: turn.role, text })
  }
  return out
}

export function citedNumbers(answer: string): number[] {
  const found = new Set<number>()
  for (const m of answer.matchAll(/\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g)) {
    for (const n of (m[1] ?? '').split(/\s*[,–-]\s*/)) found.add(Number(n))
  }
  return [...found].filter(n => n > 0).sort((a, b) => a - b)
}
