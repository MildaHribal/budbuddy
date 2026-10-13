// Exports the app's own content (problem atlas + guide lessons) as a knowledge corpus for scripts/kb-ingest.mjs.
// Usage: node_modules/.bin/vite-node --config vitest.config.ts scripts/kb-export-app.ts [out.jsonl]
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Block, Chapter, L10n } from '../app/guide/types'
import { PROBLEMS } from '../app/utils/problems'
import type { Problem } from '../app/utils/problems/types'

export interface CorpusDoc { id: string, title: string, text: string, topic: string, source: string, license: string, url: string | null, lang: string }

const SOURCE = 'BudBuddy'
const LICENSE = 'BudBuddy original'

/** Light guide markdown to plain text. */
export const plain = (md: string) => md
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
  .replace(/[ \t]+\n/g, '\n')
  .trim()

const section = (head: string, items: string[]) => (items.length ? `${head}:\n${items.map(i => `- ${i}`).join('\n')}` : '')

export function problemDoc(p: Problem, names: Map<string, string>): CorpusDoc {
  const text = [
    p.aka?.length ? `${p.summary} Also called: ${p.aka.join(', ')}.` : p.summary,
    section('Symptoms', p.symptoms),
    section('How to confirm', p.confirm),
    section('Look-alikes', p.lookalikes.map(l => `${names.get(l.id) ?? l.id}: ${l.howToTell}`)),
    section('Causes', p.causes),
    section('Fix', p.fix),
    section('Prevention', p.prevent)
  ].filter(Boolean).join('\n\n')
  return { id: `app-problem-${p.id}`, title: p.name, text, topic: `problem-${p.category}`, source: SOURCE, license: LICENSE, url: `/problems/${p.id}`, lang: 'en' }
}

function blockText(b: Block, lang: keyof L10n): string {
  const l = (v: L10n) => plain(v[lang])
  switch (b.type) {
    case 'text': return l(b.md)
    case 'callout': return [b.title ? l(b.title) : '', l(b.md)].filter(Boolean).join(': ')
    case 'steps': return b.items.map((s, i) => `${i + 1}. ${l(s.title)}: ${l(s.md)}`).join('\n')
    case 'compare': return b.columns.map(c => `${l(c.title)}: ${c.points.map(l).join('; ')}`).join('\n')
    case 'table': return [b.head.map(l).join(' | '), ...b.rows.map(r => r.map(l).join(' | '))].join('\n')
    case 'checklist': return b.items.map(i => `- ${l(i)}`).join('\n')
    case 'quiz': return b.questions.map(q => `${l(q.q)} ${l(q.options[q.correct]!)}. ${l(q.explain)}`).join('\n')
    default: return ''
  }
}

export function lessonDocs(chapter: Chapter): CorpusDoc[] {
  return chapter.lessons.flatMap(lesson => (['en', 'cs'] as const).map(lang => ({
    id: `app-guide-${lesson.id}-${lang}`,
    title: `${chapter.title[lang]}: ${lesson.title[lang]}`,
    text: lesson.blocks.map(b => blockText(b, lang)).filter(Boolean).join('\n\n'),
    topic: `guide-${chapter.id}`,
    source: SOURCE,
    license: LICENSE,
    url: `/guide/${chapter.id}#${lesson.id}`,
    lang
  }))).filter(d => d.text.length > 40)
}

async function main() {
  const out = resolve(process.argv[2] ?? join(homedir(), '.cache/budbuddy-kb/corpus/app.jsonl'))
  const names = new Map(PROBLEMS.map(p => [p.id, p.name]))
  const docs = PROBLEMS.map(p => problemDoc(p, names))
  const dir = resolve(import.meta.dirname, '../app/guide/chapters')
  for (const file of (await readdir(dir)).filter(f => f.endsWith('.ts')).sort()) {
    const chapter = (await import(pathToFileURL(join(dir, file)).href) as { default: Chapter }).default
    docs.push(...lessonDocs(chapter))
  }
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, docs.map(d => JSON.stringify(d)).join('\n') + '\n')
  console.log(`${docs.length} docs (${PROBLEMS.length} problems) -> ${out}`)
}

if (!process.env.VITEST) await main()
