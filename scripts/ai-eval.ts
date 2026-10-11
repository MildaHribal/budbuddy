// Runs eval prompts through the real assistant pipeline: on-device KB search, prompt builder,
// client provider and the Netlify proxy handler (called in-process, not deployed).
// Usage: GEMINI_API_KEY=… [EVAL_MODEL=gemini-2.5-flash] [EVAL_ONLY=id,id] [EVAL_OUT=file.md] [EVAL_ENDPOINT=https://…/api/chat] \
//   npx vite-node --config vitest.config.ts scripts/ai-eval.ts
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

const ENDPOINT = 'https://eval.local/api/chat'
const MODEL = process.env.EVAL_MODEL
const LIVE = process.env.EVAL_ENDPOINT
const root = process.cwd()

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
  if (MODEL && url.startsWith('https://generativelanguage.googleapis.com/')) {
    const body = JSON.parse(String(init?.body))
    if (MODEL.includes('lite')) delete body.generationConfig.thinkingConfig
    return realFetch(url.replace(/models\/[^:]+:/, `models/${MODEL}:`), { ...init, body: JSON.stringify(body) })
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

interface Case { id: string, q: string, lang?: Locale, plant?: boolean, after?: string }
const CASES: Case[] = [
  { id: 'vague-yellow', q: 'co znamená, když má rostlina žluté listy?', plant: true },
  { id: 'followup', q: 'jen špičky, hlavně staré listy dole', plant: true, after: 'vague-yellow' },
  { id: 'vague-spots', q: 'listy mají hnědé skvrny', plant: true },
  { id: 'ph-soil', q: 'jaké pH držet v hlíně?' },
  { id: 'rh-week6', q: 'jaká má být vlhkost vzduchu v 6. týdnu květu?' },
  { id: 'water-today', q: 'mám dnes zalít?', plant: true },
  { id: 'chart-biobizz', q: 'kolik BioBizz Bio-Bloom a Bio-Grow dávat ve 3. týdnu květu?' },
  { id: 'chart-unknown', q: 'kolik hnojiva Plagron Terra Bloom v 5. týdnu květu?' },
  { id: 'legal', q: 'kolik rostlin můžu legálně pěstovat?' },
  { id: 'harvest', q: 'jak poznám, kdy sklízet?', plant: true },
  { id: 'greeting', q: 'ahoj' },
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
  if (only && !only.includes(c.id) && !only.includes(c.after ?? '')) continue
  locale.value = c.lang ?? 'cs'
  const history = c.after ? answers.get(c.after) ?? [] : []
  let passages: KbHit[] | null = isSmallTalk(c.q) ? null : []
  if (passages && kbReady) passages = selectPassages(await searchKb(buildKbQuery(c.q), 12))
  const userText = buildTurnText({ question: c.q, plantContext: c.plant ? summarizePlant({ plant, entries, light: { lightsOn: '06:00', lightHours: 12 } }) : null, passages, kbAvailable: kbReady })
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
  const parsed = parseAnswer(text)
  answers.set(c.id, [...history, { role: 'user', text: c.q }, { role: 'assistant', text: parsed.text }])
  const cites = citedNumbers(parsed.text)
  const words = parsed.text.split(/\s+/).filter(Boolean).length
  rows.push(`| ${c.id} | ${(ttft / 1000).toFixed(1)} | ${(total / 1000).toFixed(1)} | ${userText.length} | ${words} | ${cites.join(',') || '–'} | ${parsed.replies.length} | ${parsed.photo ? 'yes' : ''} | ${error ? 'ERROR' : ''} |`)
  out.push(`## ${c.id} (${locale.value}${c.plant ? ', plant' : ''}${c.after ? `, after ${c.after}` : ''})`, `**Q:** ${c.q}`, '')
  out.push(error ? `**ERROR:** ${error}` : parsed.text, '')
  if (parsed.replies.length || parsed.photo) out.push(`_replies:_ ${parsed.replies.join(' | ')}${parsed.photo ? ' · photo requested' : ''}`, '')
  console.log(rows[rows.length - 1])
}

out.splice(2, 0, '| case | ttft s | total s | input chars | words | cites | replies | photo | err |', '|---|---|---|---|---|---|---|---|---|', ...rows, '')
if (process.env.EVAL_OUT) await writeFile(process.env.EVAL_OUT, out.join('\n'))
