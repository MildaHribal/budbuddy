import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Block, Chapter, L10n } from '../app/guide/types'
import { componentKey } from '../app/guide/resolve'

const modules = import.meta.glob<{ default: Chapter }>('../app/guide/chapters/*.ts', { eager: true })
const chapters = Object.values(modules).map(m => m.default)
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const keys = (p: string) => new Set(readdirSync(dir(p)).filter(f => f.endsWith('.vue')).map(componentKey))

const illustrations = keys('../app/components/guide/illustrations')
const widgets = keys('../app/components/guide/widgets')
const lessonIds = new Set(chapters.flatMap(c => c.lessons.map(l => l.id)))
const chapterIds = new Set(chapters.map(c => c.id))

function texts(b: Block): L10n[] {
  switch (b.type) {
    case 'text': return [b.md]
    case 'callout': return [b.md, ...(b.title ? [b.title] : [])]
    case 'steps': return b.items.flatMap(i => [i.title, i.md])
    case 'compare': return b.columns.flatMap(c => [c.title, ...c.points])
    case 'table': return [...b.head, ...b.rows.flat()]
    case 'figure': return [b.caption]
    case 'interactive': return b.caption ? [b.caption] : []
    case 'quiz': return b.questions.flatMap(q => [q.q, q.explain, ...q.options])
    case 'checklist': return b.items
  }
}

const each = chapters.flatMap(c => c.lessons.flatMap(l => l.blocks.map(b => ({ where: `${c.id}/${l.id}`, b }))))

describe('guide content', () => {
  it('every lesson has content', () => {
    for (const c of chapters) {
      expect(c.lessons.length, c.id).toBeGreaterThan(0)
      for (const l of c.lessons) expect(l.blocks.length, l.id).toBeGreaterThan(0)
    }
  })

  it('no empty English strings', () => {
    for (const { where, b } of each) {
      for (const s of texts(b)) expect(s.en.trim(), where).not.toBe('')
    }
  })

  it('figures and widgets resolve', () => {
    for (const { where, b } of each) {
      if (b.type === 'figure') {
        if (b.illustration) expect(illustrations.has(componentKey(b.illustration)), `${where} ${b.illustration}`).toBe(true)
        if (b.photo) expect(existsSync(dir(`../app/assets/guide/${b.photo}`)), `${where} ${b.photo}`).toBe(true)
        expect(b.illustration || b.photo, where).toBeTruthy()
      }
      if (b.type === 'interactive') expect(widgets.has(componentKey(b.widget)), `${where} ${b.widget}`).toBe(true)
    }
  })

  it('internal links point to real chapters and lessons', () => {
    for (const { where, b } of each) {
      for (const s of texts(b)) {
        for (const [, path, hash] of s.en.matchAll(/\]\(\/guide\/?([^\s)#]*)(?:#([^\s)]+))?\)/g)) {
          if (path) expect(chapterIds.has(path), `${where} -> ${path}`).toBe(true)
          if (hash) expect(lessonIds.has(hash), `${where} -> #${hash}`).toBe(true)
        }
      }
    }
  })
})
