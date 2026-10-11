import { describe, expect, it } from 'vitest'
import { allLessons, chapterLessons, firstUnfinished, getChapter, getLesson, lessonsFor, nextLesson, sortChapters } from '../app/guide'
import { renderGuideMarkdown } from '../app/guide/markdown'
import type { Chapter, Lesson } from '../app/guide/types'
import { emptyData, normalizeData, normalizeGuide } from '../app/utils/schema'

const l = (id: string, extra: Partial<Lesson> = {}): Lesson => ({ id, title: { en: id, cs: id }, minutes: 3, blocks: [], ...extra })
const ch = (id: string, order: number, lessons: Lesson[]): Chapter => ({ id, order, title: { en: id, cs: id }, summary: { en: '', cs: '' }, glyph: 'note', color: '#fff', lessons })

const list = sortChapters([
  ch('media', 3, [l('media-soil', { media: ['soil'] }), l('media-coco', { media: ['coco'] }), l('media-water')]),
  ch('start', 1, [l('start-legal'), l('start-indoor', { environments: ['indoor'] })])
])

describe('guide registry', () => {
  it('sorts chapters by order', () => {
    expect(list.map(c => c.id)).toEqual(['start', 'media'])
  })

  it('finds chapters and lessons', () => {
    expect(getChapter('media', list)?.lessons).toHaveLength(3)
    expect(getLesson('media-coco', list)?.chapter.id).toBe('media')
    expect(getLesson('nope', list)).toBeUndefined()
    expect(allLessons(list).map(r => r.lesson.id)).toEqual(['start-legal', 'start-indoor', 'media-soil', 'media-coco', 'media-water'])
  })

  it('filters by setup, null shows everything', () => {
    expect(lessonsFor(null, null, list)).toHaveLength(5)
    expect(lessonsFor('outdoor', 'coco', list).map(r => r.lesson.id)).toEqual(['start-legal', 'media-coco', 'media-water'])
    expect(chapterLessons(list[1]!, 'indoor', 'soil').map(x => x.id)).toEqual(['media-soil', 'media-water'])
  })

  it('walks to the next matching lesson across chapters', () => {
    expect(nextLesson('start-legal', 'outdoor', 'coco', list)?.lesson.id).toBe('media-coco')
    expect(nextLesson('start-indoor', null, null, list)?.lesson.id).toBe('media-soil')
    expect(nextLesson('media-water', null, null, list)).toBeUndefined()
    expect(firstUnfinished(['start-legal', 'start-indoor'], null, 'hydro', list)?.lesson.id).toBe('media-water')
  })
})

describe('guide markdown', () => {
  it('escapes html and renders internal links, lists and emphasis', () => {
    const html = renderGuideMarkdown('<b>x</b> **bold** *it* [soil](/guide/media#media-soil)\n\n- a\n- b')
    expect(html).toContain('&lt;b&gt;')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>it</em>')
    expect(html).toContain('<a href="/guide/media#media-soil" data-internal>soil</a>')
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(renderGuideMarkdown('[x](javascript:alert(1))')).not.toContain('<a')
    expect(renderGuideMarkdown('**FIM** (F*** I Missed) cut **75 %** \\*x')).toBe('<p><strong>FIM</strong> (F*** I Missed) cut <strong>75 %</strong> *x</p>')
  })
})

describe('guide progress schema', () => {
  it('defaults for old data', () => {
    expect(emptyData().guide).toEqual({ done: [], quiz: {}, checks: {}, environment: null, medium: null })
    expect(normalizeData({ plants: [] }).guide).toEqual(emptyData().guide)
  })

  it('keeps valid values and drops junk', () => {
    const g = normalizeGuide({ done: ['a', 'a', 3, 'b'], quiz: { a: 4, b: 'x', c: -1 }, checks: { k: [0, 2, 2, -1, 'x'], z: 'no' }, environment: 'greenhouse', medium: 'other' })
    expect(g).toEqual({ done: ['a', 'b'], quiz: { a: 4 }, checks: { k: [0, 2] }, environment: 'greenhouse', medium: null })
    expect(normalizeData({ guide: { medium: 'coco', environment: 'mars' } }).guide.medium).toBe('coco')
  })
})
