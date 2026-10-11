import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { chapters, toMeta, type Chapter } from '../app/guide'

// Regenerate after adding/renaming lessons: UPDATE_GUIDE_META=1 npx vitest run test/guide-meta.test.ts && npx eslint --fix app/guide/meta.ts
const modules = import.meta.glob<{ default: Chapter }>('../app/guide/chapters/*.ts', { eager: true })
const metaPath = fileURLToPath(new URL('../app/guide/meta.ts', import.meta.url))

const expected = Object.entries(modules)
  .map(([path, m]) => toMeta(path.split('/').pop()!.replace(/\.ts$/, ''), m.default))
  .sort((a, b) => a.order - b.order)

describe('guide metadata', () => {
  it('app/guide/meta.ts matches the chapter files', () => {
    if (process.env.UPDATE_GUIDE_META) {
      const body = `// Generated from app/guide/chapters by test/guide-meta.test.ts (UPDATE_GUIDE_META=1). Do not edit.\nimport type { ChapterMeta } from './index'\n\nexport const CHAPTER_META: ChapterMeta[] = ${JSON.stringify(expected, null, 2)}\n`
      if (readFileSync(metaPath, 'utf8') !== body) writeFileSync(metaPath, body)
      return
    }
    expect(chapters).toEqual(expected)
  })
})
