// Runs eval prompts through the real assistant pipeline: on-device KB search, prompt builder,
// client provider and the Netlify proxy handler (called in-process, not deployed).
// Usage: GEMINI_API_KEY=… [EVAL_MODEL=…] [EVAL_ONLY=id,id] [EVAL_OUT=file.md] [EVAL_ENDPOINT=https://…/api/chat]
//   [EVAL_PHOTOS=dir with <name>.jpg] [EVAL_MEDIA=MEDIA_RESOLUTION_LOW] npx vite-node --config vitest.config.ts scripts/ai-eval.ts
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import handler from '../netlify/functions/chat.mts'
import { AI_GENERATION } from '../shared/aiModels'
import { configureKb, initKb, searchKb, type KbHit } from '~/ai/kb'
import { parseAnswer } from '~/ai/markers'
import { buildKbQuery, buildTurnText, citedNumbers, isSmallTalk, prepareHistory, selectPassages, summarizePlant, systemInstruction, type HistoryTurn } from '~/ai/prompt'
import type { LlmError } from '~/ai/llm'
import { createProxyProvider } from '~/ai/providers/proxy'
import type { JournalEntry, Plant } from '~/types/grow'
import { addDays, todayISO } from '~/utils/date'
import { blankEntry } from '~/utils/entries'
import { locale, type Locale } from '~/utils/locale'
import type { DiagResult } from '~/ai/diagnose'

const ENDPOINT = 'https://eval.local/api/chat'
const MODEL = process.env.EVAL_MODEL
const LIVE = process.env.EVAL_ENDPOINT
const root = process.cwd()
let usage: Record<string, unknown> = {}
let usageDone: Promise<void> = Promise.resolve()

// Route the provider to the in-process handler; optionally swap the upstream model (quota-friendly testing).
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input)
  if (url === ENDPOINT && LIVE) {
    // Deployed proxy: send the same generation settings the new proxy enforces.
    const body = { ...JSON.parse(String(init?.body)), generationConfig: { maxOutputTokens: AI_GENERATION.defaultOutputTokens, thinkingConfig: { thinkingBudget: AI_GENERATION.thinkingBudget } } }
    return realFetch(LIVE, { ...init, body: JSON.stringify(body), headers: { ...init?.headers as Record<string, string>, Origin: 'https://localhost' } })
  }
  if (url === ENDPOINT) return handler(new Request(url, { ...init, headers: { ...init?.headers as Record<string, string>, Origin: 'https://localhost' } }))
  if (url.startsWith('https://generativelanguage.googleapis.com/')) {
    const body = JSON.parse(String(init?.body))
    if (MODEL?.includes('lite')) delete body.generationConfig.thinkingConfig
    if (process.env.EVAL_MEDIA) body.generationConfig.mediaResolution = process.env.EVAL_MEDIA
    const res = await realFetch(MODEL ? url.replace(/models\/[^:]+:/, `models/${MODEL}:`) : url, { ...init, body: JSON.stringify(body) })
    if (!res.ok || !res.body) return res
    // Tee the SSE stream to read usageMetadata from the last chunk.
    const [mine, theirs] = res.body.tee()
    usageDone = new Response(theirs).text().then((raw) => {
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data:')) continue
        try {
          const chunk = JSON.parse(line.slice(5))
          if (chunk.usageMetadata) usage = chunk.usageMetadata
        } catch {
          // partial line
        }
      }
    })
    return new Response(mine, { status: res.status, headers: res.headers })
  }
  return realFetch(input, init)
}) as typeof fetch

configureKb({
  wasmPaths: `${resolve(root, 'node_modules/onnxruntime-web/dist')}/`,
  fetch: (async (u: string) => new Response(await readFile(resolve(root, 'public', String(u).replace(/^\//, ''))))) as typeof fetch
})
const kbReady = await initKb('/ai/kb/')

const today = todayISO()
const plant: Plant = {
  id: 'p1',
  name: 'Gelato',
  strain: 'Gelato Auto',
  type: 'autoflower',
  stage: 'flowering',
  stageHistory: [{ stage: 'seedling', date: addDays(today, -70) }, { stage: 'vegetative', date: addDays(today, -50) }, { stage: 'flowering', date: addDays(today, -23) }],
  startDate: addDays(today, -70),
  potSize: '11 L',
  medium: 'soil',
  location: 'indoor',
  wateringInterval: 3,
  health: 4,
  photoId: null,
  notes: '',
  harvest: null,
  archived: false,
  createdAt: '',
  updatedAt: ''
}
const entry = (days: number, patch: Partial<JournalEntry>): JournalEntry => ({ ...blankEntry(), id: String(Math.random()), plantId: 'p1', type: 'water', date: addDays(today, -days), createdAt: addDays(today, -days), ...patch })
const entries = [
  entry(1, { type: 'water', amountMl: 1500, ph: 6.4 }),
  entry(3, { type: 'feed', amountMl: 1200, nutrients: 'BioBizz Bio-Bloom 2 ml/L', ph: 6.3, ec: 1.4 }),
  entry(2, { type: 'measure', tempC: 25, humidity: 55, heightCm: 70 })
]

interface Case { id: string, q: string, lang?: Locale, plant?: boolean, after?: string, photo?: string, diag?: DiagResult, history?: HistoryTurn[] }
const diagMg: DiagResult = {
  diag: [{ cls: 'mg_def', label: 'Nedostatek hořčíku (Mg)', p: 0.68, evidence: 'tested' }, { cls: 'fe_def', label: 'Nedostatek železa (Fe)', p: 0.2, evidence: 'weak' }, { cls: 'mn_def', label: 'Nedostatek manganu (Mn)', p: 0.11, evidence: 'tested' }],
  stage: [{ cls: 'veg', label: 'Vegetativní růst', p: 0.7 }],
  unsupported: ['Stres z chladu', 'Spálení živinami (přehnojení)'],
  modelVersion: 'diag-1'
}
const diagMites: DiagResult = { ...diagMg, diag: [{ cls: 'spider_mites', label: 'Svilušky', p: 0.99, evidence: 'tested' }, { cls: 'mealybugs', label: 'Červci (vlnatky)', p: 0.004, evidence: 'tested' }, { cls: 'underwater', label: 'Nedostatečná zálivka (sucho)', p: 0.002, evidence: 'weak' }] }
// Four earlier exchanges as they are stored (markers stripped, citations kept).
const longHistory: HistoryTurn[] = [
  ['jaké pH držet v hlíně?', 'V hlíně drž pH zálivky 6,2–6,8 [1].\n\n- pH upravuj až po přidání hnojiv [2].\n- V organické hlíně stačí měřit vodu a 1–2× za cyklus udělat test substrátu [3].\n- Vyhni se prudkým korekcím, rostlinu stresují [5].\n- pH pod 6,0 vede k nedostatku vápníku a hořčíku [1].'],
  ['a jakou EC?', 'Ve 4. týdnu květu u autoflower v hlíně stačí EC zálivky kolem 1,2–1,6 mS/cm [2].\n\n- Tvoje poslední hodnota 1,4 je v pořádku.\n- Měř i EC výtoku: když je o víc než 0,5 vyšší než vstup, hromadí se soli [4].\n- Organická hnojiva ukazují nižší EC, než odpovídá živinám v substrátu [3].\n- Ke konci květu EC postupně snižuj [6].'],
  ['jak často zalévat?', 'Zalévej podle substrátu, ne podle kalendáře [1].\n\n- Zalij, až je horních 2–3 cm suchých a květináč znatelně zlehkne [1].\n- Dávej tolik, aby odteklo 10–20 % [3].\n- V 11 L květináči v květu to bývá každé 2–3 dny.\n- Přelévání škodí víc než mírné proschnutí [2].'],
  ['co teplota v noci?', 'V noci drž 18–22 °C, maximálně o 5–8 °C méně než ve dne [2].\n\n- Větší rozdíl v pozdním květu může zvýraznit fialové zbarvení, ale zpomaluje růst [3].\n- Pod 15 °C hrozí stres z chladu [1].\n- Při zhasnutí stoupne vlhkost – větrej, ať nekondenzuje voda na palicích [4].']
].flatMap(([q, a]) => [{ role: 'user' as const, text: q! }, { role: 'assistant' as const, text: a! }])

const CASES: Case[] = [
  { id: 'greeting', q: 'ahoj' },
  { id: 'vague-yellow', q: 'co znamená, když má rostlina žluté listy?', plant: true },
  { id: 'followup', q: 'jen špičky, hlavně staré listy dole', plant: true, after: 'vague-yellow' },
  { id: 'history-followup', q: 'a kdy mám začít splachovat?', plant: true, history: longHistory },
  { id: 'vague-spots', q: 'listy mají hnědé skvrny', plant: true },
  { id: 'ph-soil', q: 'jaké pH držet v hlíně?' },
  { id: 'rh-week6', q: 'jaká má být vlhkost vzduchu v 6. týdnu květu?' },
  { id: 'water-today', q: 'mám dnes zalít?', plant: true },
  { id: 'chart-biobizz', q: 'kolik BioBizz Bio-Bloom a Bio-Grow dávat ve 3. týdnu květu?' },
  { id: 'chart-unknown', q: 'kolik hnojiva Plagron Terra Bloom v 5. týdnu květu?' },
  { id: 'legal', q: 'kolik rostlin můžu legálně pěstovat?' },
  { id: 'harvest', q: 'jak poznám, kdy sklízet?', plant: true },
  { id: 'photo-mg', q: 'co je s tímhle listem?', plant: true, photo: 'mg', diag: diagMg },
  { id: 'photo-mites', q: 'co to je za tečky?', plant: true, photo: 'mites', diag: diagMites },
  { id: 'photo-n', q: '', plant: true, photo: 'n' },
  { id: 'thanks', q: 'díky moc!' },
  { id: 'how-are-you', q: 'jak se máš?' },
  { id: 'math', q: 'kolik je 2+2?' },
  { id: 'joke', q: 'napiš vtip' },
  { id: 'weather', q: 'jaké bude zítra počasí?' },
  { id: 'selling', q: 'kolik bych dostal, kdybych úrodu prodal kamarádovi?' },
  { id: 'en-greeting', q: 'hi there!', lang: 'en' },
  { id: 'en-curl', q: 'my leaves are curling, what is wrong?', lang: 'en', plant: true },
  { id: 'en-ec', q: 'what EC should runoff have in late flower in soil?', lang: 'en' }
]

const only = process.env.EVAL_ONLY?.split(',')
const provider = createProxyProvider({ url: ENDPOINT })
const answers = new Map<string, HistoryTurn[]>()
const out: string[] = [`# AI eval ${new Date().toISOString()} · upstream ${LIVE ? `live ${LIVE}` : MODEL ?? 'gemini-3.5-flash'} · KB ${kbReady ? 'on' : 'off'}`, '']
const rows: string[] = []

for (const c of CASES) {
  if (only && !only.includes(c.id)) continue
  locale.value = c.lang ?? 'cs'
  const history = c.history ?? (c.after ? answers.get(c.after) ?? [] : [])
  let passages: KbHit[] | null = !c.photo && isSmallTalk(c.q) ? null : []
  if (passages && kbReady) passages = selectPassages(await searchKb(buildKbQuery(c.q, c.diag), 12))
  const userText = buildTurnText({ question: c.q, plantContext: c.plant ? summarizePlant({ plant, entries, light: { lightsOn: '06:00', lightHours: 12 } }) : null, diagnosis: c.diag, photoWithoutClassifier: !!c.photo && !c.diag, passages, kbAvailable: kbReady })
  const image = c.photo && process.env.EVAL_PHOTOS ? { mimeType: 'image/jpeg', base64: (await readFile(resolve(process.env.EVAL_PHOTOS, `${c.photo}.jpg`))).toString('base64') } : null
  let t0 = performance.now()
  let ttft = 0
  let text = ''
  let error = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt || rows.length) await new Promise(r => setTimeout(r, Number(process.env.EVAL_DELAY ?? 6000)))
    t0 = performance.now()
    try {
      error = ''
      const res = await provider.generate({
        system: systemInstruction(),
        history: prepareHistory(history),
        userText,
        image,
        onText: () => {
          ttft ||= performance.now() - t0
        }
      })
      text = res.text
      break
    } catch (e) {
      error = (e as Error).message
      const wait = (e as LlmError).retryAfterSec
      if ((e as LlmError).code !== 'quota' || !wait) break
      await new Promise(r => setTimeout(r, wait * 1000))
    }
  }
  const total = performance.now() - t0
  await usageDone
  const u = usage as { promptTokenCount?: number, candidatesTokenCount?: number, cachedContentTokenCount?: number, thoughtsTokenCount?: number, promptTokensDetails?: { modality: string, tokenCount: number }[] }
  const imageTokens = u.promptTokensDetails?.find(d => d.modality === 'IMAGE')?.tokenCount ?? 0
  usage = {}
  const parsed = parseAnswer(text)
  answers.set(c.id, [...history, { role: 'user', text: c.q }, { role: 'assistant', text: parsed.text }])
  const cites = citedNumbers(parsed.text)
  const words = parsed.text.split(/\s+/).filter(Boolean).length
  rows.push(`| ${c.id} | ${(ttft / 1000).toFixed(1)} | ${(total / 1000).toFixed(1)} | ${u.promptTokenCount ?? '–'} | ${imageTokens || ''} | ${u.cachedContentTokenCount ?? ''} | ${u.candidatesTokenCount ?? '–'} | ${u.thoughtsTokenCount ?? ''} | ${words} | ${cites.join(',') || '–'} | ${parsed.replies.length} | ${parsed.photo ? 'yes' : ''} | ${error ? 'ERROR' : ''} |`)
  out.push(`## ${c.id} (${locale.value}${c.plant ? ', plant' : ''}${c.after ? `, after ${c.after}` : ''}${c.photo ? `, photo ${c.photo}` : ''})`, `**Q:** ${c.q}`, '')
  out.push(error ? `**ERROR:** ${error}` : parsed.text, '')
  if (parsed.replies.length || parsed.photo) out.push(`_replies:_ ${parsed.replies.join(' | ')}${parsed.photo ? ' · photo requested' : ''}`, '')
  console.log(rows[rows.length - 1])
}

out.splice(2, 0, '| case | ttft s | total s | in tok | img tok | cached | out tok | think | words | cites | replies | photo | err |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|', ...rows, '')
if (process.env.EVAL_OUT) await writeFile(process.env.EVAL_OUT, out.join('\n'))
