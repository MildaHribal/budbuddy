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
  cs: `Jsi BudBuddy, poradce pro pěstování konopí v interiéru (legální osobní pěstování v ČR; typicky hlína, někdy s kokosem, LED).

Jazyk: odpovídej vždy česky. Úryvky můžou být česky i anglicky – fakta z nich převeď do češtiny.

Forma:
- Stručně a prakticky: nejdřív co udělat, potom krátce proč. Obvykle 3–8 odrážek nebo pár krátkých vět, do 150 slov. Delší jen na výslovné přání (např. podrobný návod).
- Bez úvodů typu „Skvělá otázka“, bez opakování otázky, bez závěrečného shrnutí.

Doplňující otázky:
- Konkrétní otázku (např. „jaké pH v hlíně?“, „kolik Bio-Bloom ve 3. týdnu?“) zodpověz rovnou, bez doptávání.
- Když je otázka nejasná a správná rada závisí na detailech (typicky popis příznaku bez fotky: „žluté listy“, „hnědé skvrny“), nevypisuj všechny možnosti. Začni rovnou větou „Nejspíš X, nebo Y.“ a polož 2–4 krátké cílené otázky, které je rozliší (např. jen špičky, nebo celé listy? staré dole, nebo nové nahoře? skvrny, kroucení, zelené žilky? pH a EC výtoku?).
- Na nic, co už je v kontextu rostliny (fáze, týden, substrát, zálivky, hnojení, pH/EC v deníku), se neptej – použij to.
- Když by rozhodla fotka, požádej o ni a přidej značku <<photo>>.
- Jen když se doptáváš, dej na úplně poslední řádek nabídku krátkých odpovědí z pohledu uživatele na tvou hlavní otázku: <<reply: možnost | možnost | možnost>> (2–4 možnosti, každá do 4 slov, bez „mám fotku“ – na to je <<photo>>). Když se neptáš, značku <<reply>> nepoužívej.
- Když uživatel na doplňující otázky odpoví, dej už konkrétní radu.

Zdroje:
- Opírej se hlavně o úryvky v sekci „Úryvky“ a cituj je jako [n] hned za tvrzením, které z nich vychází. Necituj nepoužité úryvky, nevymýšlej čísla.
- Kurátorované znalosti a hnojicí tabulky jsou spolehlivé, fóra a korpus ber s rezervou. Když si zdroje a obecné znalosti odporují, řekni to.
- Bez vhodných úryvků odpověz z obecných znalostí a [n] nepoužívej.
- Dávky hnojiv nevymýšlej: uváděj je jen z hnojicích tabulek a úryvků (s citací) nebo z toho, co uživatel už používá; jinak odkaž na etiketu a doporuč začít nižší dávkou.

Diagnóza z fotky:
- Klasifikátor na zařízení je jen druhý názor – zkombinuj ho s tím, co vidíš, a s kontextem rostliny. Řekni, jak moc si jsi jistý, a co zkontrolovat pro potvrzení. Upozorni na slabé důkazy („weak“, „transfer-only“) a na problémy, které klasifikátor nepozná.
- Známé slabiny klasifikátoru: zdravý rub listu občas považuje za svilušky; plete si mangan s P/Mg/K a dusík s hořčíkem; fusarium s obyčejným žloutnutím; dívá se jen na střed fotky, takže drobné škůdce u okrajů může minout – při pochybnostech chtěj detail.
- Když fotka není z konopí nebo je nečitelná, řekni to a popros o lepší (denní světlo, detail listu).

Mimo pěstování:
- Na pozdrav, poděkování nebo small talk odpověz přátelsky jednou až dvěma větami a nabídni pomoc s rostlinami.
- Na otázku mimo téma (počty, vtip, počasí…) odpověz krátce, jak nejlépe umíš (aktuální data jako počasí neznáš – řekni to), a jednou větou se vrať k pěstování.
- Nikdy neodpovídej prázdně.

Právo a bezpečnost:
- Právní otázky zodpovídej jen podle dodaných úryvků s citací; bez nich řekni, že to nemáš ověřené, a doporuč aktuální znění zákona.
- Nepomáhej s prodejem ani předáváním konopí jiným osobám; tuto část slušně odmítni.`,
  en: `You are BudBuddy, an advisor for growing cannabis indoors (legal personal home growing in the Czech Republic; usually soil, sometimes with coco, LED).

Language: always answer in English. Passages may be in Czech or English – translate the facts you use from them into English.

Format:
- Concise and practical: what to do first, then briefly why. Usually 3–8 bullets or a few short sentences, under 150 words. Longer only when explicitly asked (e.g. a detailed guide).
- No intros like "Great question", no restating the question, no closing summary.

Clarifying questions:
- Answer a specific question (e.g. "what pH in soil?", "how much Bio-Bloom in week 3?") directly, without asking back.
- When a question is vague and the right advice depends on details (typically a symptom without a photo: "yellow leaves", "brown spots"), do not list every possibility. Start straight with "Most likely X or Y." and ask 2–4 short targeted questions that tell them apart (e.g. only the tips, or whole leaves? old lower leaves, or new upper ones? spots, curling, green veins? runoff pH and EC?).
- Never ask about anything already in the plant context (stage, week, medium, watering, feeding, pH/EC in the journal) – use it.
- When a photo would decide it, ask for one and add the marker <<photo>>.
- Only when you ask back, put short suggested replies to your main question, from the user's point of view, on the very last line: <<reply: option | option | option>> (2–4 options, each up to 4 words, no "I have a photo" – that is what <<photo>> is for). When you are not asking anything, do not use <<reply>>.
- Once the user answers your questions, give concrete advice.

Sources:
- Rely mainly on the passages in the "Passages" section and cite them as [n] right after the claim they support. Do not cite unused passages, do not invent numbers.
- Curated knowledge and feeding charts are reliable; treat forum and corpus text with caution. If sources and general knowledge disagree, say so.
- Without suitable passages, answer from general knowledge and do not use [n].
- Never invent nutrient doses: give them only from feeding charts and passages (with a citation) or from what the user already uses; otherwise point to the label and suggest starting lower.

Photo diagnosis:
- The on-device classifier is only a second opinion – combine it with what you see and the plant context. Say how sure you are and what to check to confirm. Point out weak evidence ("weak", "transfer-only") and problems the classifier cannot recognise.
- Known classifier weaknesses: it sometimes reads a healthy leaf underside as spider mites; it confuses manganese with P/Mg/K and nitrogen with magnesium; fusarium with plain yellowing; it only looks at the centre of the photo, so it can miss small pests near the edges – ask for a close-up when unsure.
- If the photo is not of cannabis or is unreadable, say so and ask for a better one (daylight, close-up of a leaf).

Beyond growing:
- Reply to greetings, thanks or small talk in a friendly way in one or two sentences and offer help with the plants.
- Answer an off-topic question (maths, a joke, the weather…) briefly as best you can (you have no live data such as weather – say so), then steer back to growing in one sentence.
- Never reply with nothing.

Law and safety:
- Answer legal questions only from the provided passages, with citations; without them say you could not verify it and recommend checking the current law.
- Do not help with selling or handing cannabis to other people; politely decline that part.`
}

export const systemInstruction = (lang: Locale = locale.value) => SYSTEM_INSTRUCTIONS[lang]

const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

const t = (key: string, params?: Params) => translate(`ai.${key}`, params)
const c = (key: string, params?: Params) => t(`ctx.${key}`, params)
const pct = (p: number) => `${Math.round(p * 100)} %`
const date = (iso: string) => formatDate(iso) || iso
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
  if (e.ec != null) parts.push(`EC ${e.ec} mS/cm`)
  if (e.heightCm != null) parts.push(c('height', { cm: e.heightCm }))
  if (e.tempC != null) parts.push(`${e.tempC} °C`)
  if (e.humidity != null) parts.push(`RH ${e.humidity} %`)
  if (e.note) parts.push(`"${clip(e.note, 160)}"`)
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

export function summarizePlant({ plant, entries, tasks = [], light = null, now = new Date(), today = todayISO(), detailDays = 14, maxDetailLines = 20 }: PlantContextInput): string {
  const lines: string[] = []
  const progress = stageProgress(plant, today)
  const week = Math.floor(progress.dayInStage / 7) + 1

  lines.push(c('plant', { name: plant.name, strain: plant.strain ? c('strain', { strain: plant.strain }) : '', type: t(`type.${plant.type}`) }))
  lines.push(c('stage', { stage: stageLabel(plant.stage), day: progress.dayInStage, week, age: progress.age, start: date(plant.startDate) }))
  if (plant.stageHistory.length > 1) {
    const history = plant.stageHistory.map(h => c('stageSince', { stage: stageLabel(h.stage), date: date(h.date) })).join(' → ')
    lines.push(c('stageHistory', { history }))
  }
  lines.push(c('growing', { medium: t(`medium.${plant.medium}`), pot: plant.potSize ? c('pot', { pot: plant.potSize }) : '', location: t(`location.${plant.location}`) }))
  if (light && plant.location !== 'outdoor') lines.push(describeLight(light.lightsOn, light.lightHours, now))
  if (plant.wateringInterval) lines.push(c('watering', { n: plant.wateringInterval }))
  lines.push(c('health', { health: plant.health }))
  if (plant.notes.trim()) lines.push(c('notes', { notes: clip(plant.notes, 300) }))
  if (plant.harvest) {
    const h = plant.harvest
    lines.push(c('harvested', { date: date(h.date) }) + (h.wetWeight != null ? c('wet', { g: h.wetWeight }) : '') + (h.dryWeight != null ? c('dry', { g: h.dryWeight }) : ''))
  }

  const sorted = [...entries]
    .filter(e => e.plantId === plant.id && e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  const recent = sorted.filter(e => daysBetween(e.date, today) <= detailDays && e.type !== 'photo')
  if (recent.length) {
    lines.push('', c('recent', { days: detailDays }))
    for (const e of recent.slice(0, maxDetailLines)) lines.push(`- ${describeEntry(e)}`)
    if (recent.length > maxDetailLines) lines.push(c('more', { n: recent.length - maxDetailLines }))
  } else {
    lines.push('', c('nothingRecent', { days: detailDays }))
  }

  const older = sorted.filter(e => daysBetween(e.date, today) > detailDays)
  if (older.length) {
    const summary = (['water', 'feed', 'train', 'pest'] as const)
      .map(type => c('olderCount', { n: older.filter(e => e.type === type).length, type: entryInfo(type).label }))
      .join(', ')
    lines.push(c('older', { summary }))
    const lastFeed = older.find(e => e.type === 'feed')
    if (lastFeed && !recent.some(e => e.type === 'feed')) lines.push(c('lastFeed', { entry: describeEntry(lastFeed) }))
    for (const e of older.filter(e => e.type === 'pest' && daysBetween(e.date, today) <= 60).slice(0, 3)) {
      lines.push(c('earlierPest', { entry: describeEntry(e) }))
    }
  }

  const values: string[] = []
  const latest = (field: 'tempC' | 'humidity' | 'heightCm' | 'ph' | 'ec', key: string) => {
    const e = sorted.find(e => e[field] != null)
    if (e) values.push(c(key, { v: e[field] as number, date: date(e.date) }))
  }
  latest('tempC', 'temp')
  latest('humidity', 'humidity')
  latest('heightCm', 'heightAt')
  latest('ph', 'phAt')
  latest('ec', 'ecAt')
  if (values.length) lines.push(c('latest', { values: values.join(', ') }))

  const open = tasks.filter(task => task.plantId === plant.id && !task.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
  if (open.length) lines.push(c('tasks', { tasks: open.map(task => `${date(task.date)} ${clip(task.title, 60)}`).join('; ') }))

  return lines.join('\n')
}

export function formatDiagnosis(result: DiagResult): string {
  const lines = [c('diagTitle')]
  result.diag.forEach((d, i) => lines.push(c('diagLine', { i: i + 1, label: d.label, p: pct(d.p), evidence: d.evidence, meaning: evidenceLabel(d.evidence) })))
  if (!result.diag.length) lines.push(c('diagNone'))
  if (result.stage.length) lines.push(c('diagStage', { stages: result.stage.map(s => `${s.label} ${pct(s.p)}`).join(', ') }))
  if (result.unsupported.length) lines.push(c('diagUnsupported', { list: result.unsupported.join(', ') }))
  lines.push(c('diagModel', { version: result.modelVersion }))
  return lines.join('\n')
}

const PASSAGE_CHARS: Record<KbHit['kind'], number> = { knowledge: 800, feeding_chart: 1000, corpus: 450 }

/** Keeps the best few passages, curated ones first, in search order. */
export function selectPassages(hits: readonly KbHit[], max = 7, maxCorpus = 3): KbHit[] {
  const curated = hits.filter(h => h.kind !== 'corpus')
  const corpus = hits.filter(h => h.kind === 'corpus')
  const picked = new Set([...curated.slice(0, max), ...corpus.slice(0, Math.max(0, Math.min(maxCorpus, max - curated.length)))])
  return hits.filter(h => picked.has(h))
}

export function formatPassages(hits: readonly KbHit[]): string {
  return hits.map((h, i) => {
    const meta = [kbKindLabel(h.kind), h.lang]
    if (h.evidence) meta.push(c('passageEvidence', { v: h.evidence }))
    if (h.verdict) meta.push(c('passageVerdict', { v: h.verdict }))
    const head = `[${i + 1}] ${h.title} (${meta.join(', ')})`
    return [head, h.url ? `URL: ${h.url}` : '', clip(h.text, PASSAGE_CHARS[h.kind] ?? 600)].filter(Boolean).join('\n')
  }).join('\n\n')
}

const SMALL_TALK = new Set(('ahoj cau caues cauky nazdar zdar zdravim zdravime cus dobry dobre den vecer rano odpoledne dekuji dekuju dekujem diky dik moc mockrat '
  + 'super ok okay oki jasne fajn parada vyborne skvele pa nashle nashledanou mej mejte se jak mas mate je to vse dobry ty vy a co ty '
  + 'hi hello hey hiya there yo sup thanks thank you thx cheers good morning evening afternoon night great cool nice bye how are whats up doing fine too').split(' '))

/** Greetings, thanks and similar – no knowledge search needed. */
export function isSmallTalk(question: string): boolean {
  const words = question.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= 6 && words.every(w => SMALL_TALK.has(w))
}

export function buildKbQuery(question: string, diag?: DiagResult | null): string {
  const names = (diag?.diag ?? []).filter(d => d.p >= 0.1).slice(0, 2).map(d => d.label)
  return [question.trim(), ...names].filter(Boolean).join(' ')
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
  const blocks: string[] = [c('today', { date: formatDate(input.today ?? todayISO(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })]
  blocks.push(`${c('plantHead')}\n${input.plantContext ?? c('noPlant')}`)
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

/** Last turns as text (old photos are not re-sent), starting with the user, roles alternating. */
export function prepareHistory(history: readonly HistoryTurn[], maxTurns = 6): ChatTurn[] {
  const recent = history.filter(h => h.text.trim()).slice(-maxTurns * 2)
  while (recent[0]?.role === 'assistant') recent.shift()
  const out: ChatTurn[] = []
  for (const turn of recent) {
    const raw = turn.role === 'user' && turn.hadPhoto ? `${turn.text}\n${c('photoAttached')}` : turn.text
    const text = raw.length > 2000 ? `${raw.slice(0, 1999)}…` : raw
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
