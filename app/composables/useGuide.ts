import { chapterLessons, chapters, firstUnfinished, lessonsFor, type Chapter, type Environment, type L10n, type Medium } from '~/guide'

export function useGuide() {
  const { state, updateGuide } = useGrow()
  const { locale } = useI18n()

  const guide = computed(() => state.guide)
  const environment = computed(() => state.guide.environment)
  const medium = computed(() => state.guide.medium)
  const doneSet = computed(() => new Set(state.guide.done))

  const tr = (s: L10n | undefined) => (s ? s[locale.value] || s.en : '')

  const isDone = (lessonId: string) => doneSet.value.has(lessonId)

  function setDone(lessonId: string, value = true) {
    const done = state.guide.done.filter(id => id !== lessonId)
    if (value) done.push(lessonId)
    updateGuide({ done })
  }

  const quizBest = (key: string): number | null => state.guide.quiz[key] ?? null

  function saveQuiz(key: string, score: number) {
    const prev = state.guide.quiz[key]
    if (prev != null && prev >= score) return
    updateGuide({ quiz: { ...state.guide.quiz, [key]: score } })
  }

  const checked = (id: string): readonly number[] => state.guide.checks[id] ?? []

  function toggleCheck(id: string, index: number) {
    const cur = state.guide.checks[id] ?? []
    const next = cur.includes(index) ? cur.filter(i => i !== index) : [...cur, index].sort((a, b) => a - b)
    updateGuide({ checks: { ...state.guide.checks, [id]: next } })
  }

  function setSetup(patch: { environment?: Environment | null, medium?: Medium | null }) {
    updateGuide(patch)
  }

  function chapterProgress(chapter: Chapter) {
    const lessons = chapterLessons(chapter, environment.value, medium.value)
    const done = lessons.filter(l => doneSet.value.has(l.id)).length
    const minutesLeft = lessons.filter(l => !doneSet.value.has(l.id)).reduce((s, l) => s + l.minutes, 0)
    return { done, total: lessons.length, minutesLeft, complete: lessons.length > 0 && done === lessons.length }
  }

  const overall = computed(() => {
    const lessons = lessonsFor(environment.value, medium.value)
    const done = lessons.filter(r => doneSet.value.has(r.lesson.id)).length
    const minutesLeft = lessons.filter(r => !doneSet.value.has(r.lesson.id)).reduce((s, r) => s + r.lesson.minutes, 0)
    return { done, total: lessons.length, minutesLeft, ratio: lessons.length ? done / lessons.length : 0 }
  })

  const resume = computed(() => firstUnfinished(state.guide.done, environment.value, medium.value))

  return { chapters, guide, environment, medium, tr, isDone, setDone, quizBest, saveQuiz, checked, toggleCheck, setSetup, chapterProgress, overall, resume }
}
