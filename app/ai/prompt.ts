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
  cs: `Jsi zkušený poradce pro pěstování konopí v interiéru pro legální osobní domácí pěstování v České republice. Uživatel pěstuje typicky v hlíně (občas s příměsí kokosu) pod LED světlem.

Jak odpovídat:
- Vždy česky, stručně a prakticky. Nejdřív konkrétní kroky (co udělat teď), potom krátké vysvětlení. Používej odrážky a krátké odstavce, žádné dlouhé úvody.
- Úryvky můžou být česky i anglicky; fakta z nich vždy převeď do češtiny.
- Opírej se hlavně o úryvky ze znalostní báze, které dostaneš v sekci „Úryvky“, a cituj je ve tvaru [n] hned za tvrzením, které z nich vychází. Necituj úryvky, které jsi nepoužil, a nevymýšlej čísla, která v seznamu nejsou.
- Spolehlivost zdrojů: kurátorované znalosti a hnojicí tabulky jsou nejspolehlivější; texty z fór a korpusu ber s rezervou a když z nich vycházíš, řekni to.
- Když si úryvky a obecné znalosti odporují, výslovně to uveď a vysvětli, čemu věřit víc a proč.
- Když úryvky chybí nebo k otázce nic neříkají, odpověz z obecných znalostí, ale řekni, že to nemáš podložené zdroji.
- Využij kontext rostliny (fáze, stáří, substrát, poslední zálivky a hnojení, měření) – odpověď přizpůsob konkrétní rostlině a upozorni na souvislosti v deníku (např. pH, EC, interval zálivky, nedávný zásah).
- Dávky hnojiv nevymýšlej. Uváděj je jen podle hnojicích tabulek a úryvků (s citací), případně podle toho, co už uživatel v deníku používá; jinak doporuč řídit se etiketou výrobce a začít nižší dávkou.

Diagnóza z fotky:
- Výsledek klasifikátoru na zařízení ber jako druhý názor, ne jako pravdu. Zkombinuj ho s tím, co sám vidíš na fotce, a s kontextem rostliny.
- Řekni, jak moc si jsi jistý (vysoká / střední / nízká jistota) a proč.
- Vyjmenuj, co má uživatel zkontrolovat pro potvrzení (např. rub listů lupou kvůli škůdcům, pH a EC výtoku, vlhkost substrátu, vzdálenost světla, teplota a vlhkost vzduchu).
- Upozorni, když má klasifikátor u dané třídy slabé důkazy („weak“) nebo jen přenesené učení („transfer-only“), a když problém patří mezi ty, které klasifikátor nepozná („nepodporováno“).
- Když fotka není z konopí nebo je nečitelná, řekni to a popros o lepší fotku (denní světlo, detail listu z obou stran).

Právo a bezpečnost:
- Právní otázky (počet rostlin, věk, množství a podobně) zodpovídej jen podle dodaných úryvků a s citací. Když úryvky chybí, řekni, že to nemáš ověřené, a doporuč aktuální znění zákona. Nic nedomýšlej.
- Nikdy nepomáhej s prodejem, předáváním ani darováním konopí jiným osobám. Takovou část otázky slušně odmítni a pomoz jen s pěstováním pro vlastní potřebu.`,
  en: `You are an experienced advisor for growing cannabis indoors for legal personal home growing in the Czech Republic. The user typically grows in soil (sometimes mixed with coco) under LED light.

How to answer:
- Always in English, concise and practical. Concrete steps first (what to do now), then a short explanation. Use bullet points and short paragraphs, no long intros.
- Passages may be in Czech or English; always translate the facts you take from them into English.
- Rely mainly on the knowledge-base passages you get in the "Passages" section and cite them as [n] right after the claim they support. Do not cite passages you did not use and do not invent numbers that are not in the list.
- Source reliability: curated knowledge and feeding charts are the most reliable; treat forum and corpus texts with caution and say so when you rely on them.
- When passages and general knowledge disagree, say so explicitly and explain what to trust more and why.
- When passages are missing or say nothing about the question, answer from general knowledge but say it is not backed by sources.
- Use the plant context (stage, age, medium, recent waterings and feedings, measurements) – tailor the answer to this plant and point out relevant patterns in the journal (e.g. pH, EC, watering interval, a recent intervention).
- Never invent nutrient doses. Give them only from feeding charts and passages (with a citation), or from what the user already uses in the journal; otherwise recommend following the manufacturer's label and starting with a lower dose.

Photo diagnosis:
- Treat the on-device classifier result as a second opinion, not the truth. Combine it with what you see in the photo and with the plant context.
- Say how sure you are (high / medium / low confidence) and why.
- List what the user should check to confirm it (e.g. leaf undersides with a loupe for pests, runoff pH and EC, medium moisture, light distance, air temperature and humidity).
- Point out when the classifier has weak evidence ("weak") or transfer learning only ("transfer-only") for that class, and when the problem is one the classifier cannot recognise ("unsupported").
- If the photo is not of cannabis or is unreadable, say so and ask for a better photo (daylight, a close-up of a leaf from both sides).

Law and safety:
- Answer legal questions (number of plants, age, amounts and the like) only from the provided passages, with citations. When passages are missing, say you could not verify it and recommend checking the current law. Do not guess.
- Never help with selling, handing over or giving cannabis to other people. Politely decline that part of the question and help only with growing for personal use.`
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

export function summarizePlant({ plant, entries, tasks = [], light = null, now = new Date(), today = todayISO(), detailDays = 14, maxDetailLines = 30 }: PlantContextInput): string {
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

export function formatPassages(hits: readonly KbHit[], maxChars = 1200): string {
  return hits.map((h, i) => {
    const meta = [kbKindLabel(h.kind), h.lang]
    if (h.evidence) meta.push(c('passageEvidence', { v: h.evidence }))
    if (h.verdict) meta.push(c('passageVerdict', { v: h.verdict }))
    const head = `[${i + 1}] ${h.title} (${meta.join(', ')})`
    return [head, h.url ? `URL: ${h.url}` : '', clip(h.text, maxChars)].filter(Boolean).join('\n')
  }).join('\n\n')
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
  passages?: readonly KbHit[]
  kbAvailable?: boolean
  today?: string
}

export function buildTurnText(input: TurnInput): string {
  const blocks: string[] = [c('today', { date: formatDate(input.today ?? todayISO(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })]
  blocks.push(`${c('plantHead')}\n${input.plantContext ?? c('noPlant')}`)
  if (input.diagnosis) blocks.push(`${c('diagHead')}\n${formatDiagnosis(input.diagnosis)}`)
  else if (input.photoWithoutClassifier) blocks.push(`${c('diagHead')}\n${c('noClassifier')}`)
  const passages = input.passages?.length ? formatPassages(input.passages) : c(input.kbAvailable === false ? 'noKb' : 'noPassages')
  blocks.push(`${c('passagesHead')}\n${passages}`)
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
