import type { Chapter, Environment, Lesson, Medium } from './types'
import { CHAPTER_META } from './meta'

export type { Block, Chapter, Environment, L10n, Lesson, Medium, QuizQuestion } from './types'

/** Lesson without its content blocks. `quiz` marks lessons that end in a quiz. */
export type LessonMeta = Omit<Lesson, 'blocks'> & { quiz?: true }
/** Chapter metadata, small enough for the hub. `file` is the chapter module name. */
export type ChapterMeta = Omit<Chapter, 'lessons'> & { file: string, lessons: LessonMeta[] }

interface LessonLike { id: string, minutes: number, environments?: Environment[], media?: Medium[] }
interface ChapterLike { id: string, order: number, lessons: LessonLike[] }

export interface LessonRef<C extends ChapterLike = ChapterMeta> {
  chapter: C
  lesson: C['lessons'][number]
}

export function sortChapters<C extends ChapterLike>(list: C[]): C[] {
  return list
    .filter(c => c && typeof c.id === 'string' && Array.isArray(c.lessons))
    .sort((a, b) => a.order - b.order)
}

export function toMeta(file: string, chapter: Chapter): ChapterMeta {
  const { lessons, ...rest } = chapter
  return {
    ...rest,
    file,
    lessons: lessons.map(({ blocks, ...l }) => (blocks.some(b => b.type === 'quiz') ? { ...l, quiz: true as const } : l))
  }
}

export const chapters: ChapterMeta[] = sortChapters([...CHAPTER_META])

const loaders = import.meta.glob<{ default?: Chapter }>('./chapters/*.ts')
const loaded = new Map<string, Chapter>()

/** Full chapter content, loaded on demand (one chunk per chapter). */
export async function loadChapter(id: string): Promise<Chapter | undefined> {
  const cached = loaded.get(id)
  if (cached) return cached
  const meta = chapters.find(c => c.id === id)
  const load = meta && loaders[`./chapters/${meta.file}.ts`]
  if (!load) return undefined
  const chapter = (await load()).default
  if (!chapter || !Array.isArray(chapter.lessons)) return undefined
  loaded.set(id, chapter)
  return chapter
}

const all = chapters as unknown as ChapterLike[]

export function getChapter<C extends ChapterLike = ChapterMeta>(id: string, list: C[] = all as C[]): C | undefined {
  return list.find(c => c.id === id)
}

export function getLesson<C extends ChapterLike = ChapterMeta>(lessonId: string, list: C[] = all as C[]): LessonRef<C> | undefined {
  for (const chapter of list) {
    const lesson = chapter.lessons.find(l => l.id === lessonId)
    if (lesson) return { chapter, lesson }
  }
  return undefined
}

export function allLessons<C extends ChapterLike = ChapterMeta>(list: C[] = all as C[]): LessonRef<C>[] {
  return list.flatMap(chapter => chapter.lessons.map(lesson => ({ chapter, lesson })))
}

/** A lesson without tags is for everyone; a null setup choice shows everything. */
export function lessonMatches(lesson: LessonLike, env: Environment | null, medium: Medium | null): boolean {
  if (env && lesson.environments?.length && !lesson.environments.includes(env)) return false
  if (medium && lesson.media?.length && !lesson.media.includes(medium)) return false
  return true
}

export function lessonsFor<C extends ChapterLike = ChapterMeta>(env: Environment | null, medium: Medium | null, list: C[] = all as C[]): LessonRef<C>[] {
  return allLessons(list).filter(r => lessonMatches(r.lesson, env, medium))
}

export function chapterLessons<L extends LessonLike>(chapter: { lessons: L[] }, env: Environment | null, medium: Medium | null): L[] {
  return chapter.lessons.filter(l => lessonMatches(l, env, medium))
}

export function nextLesson<C extends ChapterLike = ChapterMeta>(lessonId: string, env: Environment | null = null, medium: Medium | null = null, list: C[] = all as C[]): LessonRef<C> | undefined {
  const lessons = allLessons(list)
  const i = lessons.findIndex(r => r.lesson.id === lessonId)
  if (i === -1) return undefined
  return lessons.slice(i + 1).find(r => lessonMatches(r.lesson, env, medium))
}

/** First lesson in reading order that is not done yet. */
export function firstUnfinished<C extends ChapterLike = ChapterMeta>(done: readonly string[], env: Environment | null, medium: Medium | null, list: C[] = all as C[]): LessonRef<C> | undefined {
  const set = new Set(done)
  return lessonsFor(env, medium, list).find(r => !set.has(r.lesson.id))
}
