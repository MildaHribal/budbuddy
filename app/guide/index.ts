import type { Chapter, Environment, Lesson, Medium } from './types'

export type { Block, Chapter, Environment, L10n, Lesson, Medium, QuizQuestion } from './types'

export interface LessonRef {
  chapter: Chapter
  lesson: Lesson
}

const modules = import.meta.glob<{ default?: Chapter }>('./chapters/*.ts', { eager: true })

export function sortChapters(list: Chapter[]): Chapter[] {
  return list
    .filter(c => c && typeof c.id === 'string' && Array.isArray(c.lessons))
    .sort((a, b) => a.order - b.order)
}

export const chapters: Chapter[] = sortChapters(Object.values(modules).map(m => m.default as Chapter))

export function getChapter(id: string, list = chapters): Chapter | undefined {
  return list.find(c => c.id === id)
}

export function getLesson(lessonId: string, list = chapters): LessonRef | undefined {
  for (const chapter of list) {
    const lesson = chapter.lessons.find(l => l.id === lessonId)
    if (lesson) return { chapter, lesson }
  }
  return undefined
}

export function allLessons(list = chapters): LessonRef[] {
  return list.flatMap(chapter => chapter.lessons.map(lesson => ({ chapter, lesson })))
}

/** A lesson without tags is for everyone; a null setup choice shows everything. */
export function lessonMatches(lesson: Lesson, env: Environment | null, medium: Medium | null): boolean {
  if (env && lesson.environments?.length && !lesson.environments.includes(env)) return false
  if (medium && lesson.media?.length && !lesson.media.includes(medium)) return false
  return true
}

export function lessonsFor(env: Environment | null, medium: Medium | null, list = chapters): LessonRef[] {
  return allLessons(list).filter(r => lessonMatches(r.lesson, env, medium))
}

export function chapterLessons(chapter: Chapter, env: Environment | null, medium: Medium | null): Lesson[] {
  return chapter.lessons.filter(l => lessonMatches(l, env, medium))
}

export function nextLesson(lessonId: string, env: Environment | null = null, medium: Medium | null = null, list = chapters): LessonRef | undefined {
  const all = allLessons(list)
  const i = all.findIndex(r => r.lesson.id === lessonId)
  if (i === -1) return undefined
  return all.slice(i + 1).find(r => lessonMatches(r.lesson, env, medium))
}

/** First lesson in reading order that is not done yet. */
export function firstUnfinished(done: readonly string[], env: Environment | null, medium: Medium | null, list = chapters): LessonRef | undefined {
  const set = new Set(done)
  return lessonsFor(env, medium, list).find(r => !set.has(r.lesson.id))
}
