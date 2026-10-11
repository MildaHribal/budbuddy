import { chapterLessons, chapters, firstUnfinished, lessonsFor, type ChapterMeta, type Environment, type L10n, type Medium } from '~/guide'
import { haptic } from '~/utils/haptics'

const ACTIVITY_KEY = 'budbuddy:guide-activity'

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Per-device reading days (lesson id -> YYYY-MM-DD), only used for the weekly rhythm.
const activity = ref<Record<string, string>>({})
let activityLoaded = false

function loadActivity() {
  if (activityLoaded || typeof window === 'undefined') return
  activityLoaded = true
  try {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}')
    if (raw && typeof raw === 'object') {
      activity.value = Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === 'string'))
    }
  } catch {
    activity.value = {}
  }
}

function saveActivity() {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.value))
  } catch {
    // storage unavailable: the rhythm is a nicety
  }
}

export function useGuide() {
  const { state, updateGuide } = useGrow()
  const { locale } = useI18n()
  loadActivity()

  const guide = computed(() => state.guide)
  const environment = computed(() => state.guide.environment)
  const medium = computed(() => state.guide.medium)
  const doneSet = computed(() => new Set(state.guide.done))

  const tr = (s: L10n | undefined) => (s ? s[locale.value] || s.en : '')

  const isDone = (lessonId: string) => doneSet.value.has(lessonId)

  function setDone(lessonId: string, value = true) {
    if (value === doneSet.value.has(lessonId)) return
    const done = state.guide.done.filter(id => id !== lessonId)
    if (value) {
      done.push(lessonId)
      activity.value = { ...activity.value, [lessonId]: localDay() }
      haptic('success')
    } else {
      const { [lessonId]: _, ...rest } = activity.value
      activity.value = rest
    }
    saveActivity()
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

  function chapterProgress(chapter: ChapterMeta) {
    const lessons = chapterLessons(chapter, environment.value, medium.value)
    const done = lessons.filter(l => doneSet.value.has(l.id)).length
    const minutesLeft = lessons.filter(l => !doneSet.value.has(l.id)).reduce((s, l) => s + l.minutes, 0)
    return { done, total: lessons.length, minutesLeft, complete: lessons.length > 0 && done === lessons.length }
  }

  const overall = computed(() => {
    const lessons = lessonsFor(environment.value, medium.value)
    const done = lessons.filter(r => doneSet.value.has(r.lesson.id)).length
    const minutes = lessons.reduce((s, r) => s + r.lesson.minutes, 0)
    const minutesLeft = lessons.filter(r => !doneSet.value.has(r.lesson.id)).reduce((s, r) => s + r.lesson.minutes, 0)
    return { done, total: lessons.length, minutes, minutesLeft, ratio: lessons.length ? done / lessons.length : 0 }
  })

  const resume = computed(() => firstUnfinished(state.guide.done, environment.value, medium.value))

  /** Last 7 days, oldest first, with lessons finished per day. */
  const week = computed(() => {
    const counts = new Map<string, number>()
    for (const [id, day] of Object.entries(activity.value)) {
      if (doneSet.value.has(id)) counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = localDay(d)
      return { key, date: d, count: counts.get(key) ?? 0, today: i === 6 }
    })
    return { days, lessons: days.reduce((s, d) => s + d.count, 0), activeDays: days.filter(d => d.count).length }
  })

  return { chapters, guide, environment, medium, tr, isDone, setDone, quizBest, saveQuiz, checked, toggleCheck, setSetup, chapterProgress, overall, resume, week }
}
