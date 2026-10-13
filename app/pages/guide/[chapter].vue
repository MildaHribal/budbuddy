<script setup lang="ts">
import { chapterLessons, getChapter, loadChapter, type Chapter, type Lesson, type LessonMeta } from '~/guide'
import { lessonActions, type GuideAction } from '~/guide/actions'
import type { EntryType } from '~/types/grow'
import { todayISO } from '~/utils/date'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { chapters, tr, environment, medium, isDone, setDone, chapterProgress } = useGuide()
const { state } = useGrow()

const meta = computed(() => getChapter(String(route.params.chapter)))
useHead({ title: () => (meta.value ? tr(meta.value.title) : t('guide.chapter.notFound')) })

const showAll = ref(false)
const filtered = computed(() => (meta.value ? chapterLessons(meta.value, environment.value, medium.value) : []))
const lessons = computed<LessonMeta[]>(() => (meta.value ? (showAll.value ? meta.value.lessons : filtered.value) : []))
const hiddenCount = computed(() => (meta.value ? meta.value.lessons.length - filtered.value.length : 0))
const progress = computed(() => (meta.value ? chapterProgress(meta.value) : { done: 0, total: 0, minutesLeft: 0, complete: false }))
const totalMinutes = computed(() => lessons.value.reduce((s, l) => s + l.minutes, 0))

const position = computed(() => chapters.findIndex(c => c.id === meta.value?.id))
const prevChapter = computed(() => (position.value > 0 ? chapters[position.value - 1] : undefined))
const nextChapter = computed(() => (position.value >= 0 ? chapters[position.value + 1] : undefined))

// ── Content: one chunk per chapter, loaded on demand ─────────────
const content = shallowRef<Chapter | null>(null)
const loadFailed = ref(false)
const bodies = computed(() => new Map<string, Lesson>(content.value?.lessons.map(l => [l.id, l]) ?? []))

async function load() {
  const id = meta.value?.id
  content.value = null
  loadFailed.value = false
  if (!id) return
  try {
    const c = await loadChapter(id)
    if (meta.value?.id !== id) return
    content.value = c ?? null
    loadFailed.value = !c
  } catch {
    loadFailed.value = true
  }
}

// ── Lazy lessons: render a lesson body only when it comes near the viewport ──
const rendered = ref(new Set<string>())
const scrollRoot = ref<HTMLElement | null>(null)
const pageEl = ref<HTMLElement | null>(null)
let nearObserver: IntersectionObserver | null = null
let endObserver: IntersectionObserver | null = null

function render(...ids: string[]) {
  const next = new Set(rendered.value)
  let changed = false
  for (const id of ids) {
    if (!next.has(id)) {
      next.add(id)
      changed = true
    }
  }
  if (changed) rendered.value = next
}

const isRendered = (id: string) => rendered.value.has(id) && bodies.value.has(id)

function observeAll() {
  const root = pageEl.value
  if (!root) return
  root.querySelectorAll<HTMLElement>('.lesson-pending').forEach(el => nearObserver?.observe(el))
  root.querySelectorAll<HTMLElement>('.lesson-end').forEach(el => endObserver?.observe(el))
  measure()
}

// ── Auto-complete: reaching the end of a lesson after reading it for a while ──
const firstSeen = new Map<string, number>()
const endVisible = new Set<string>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const justDone = ref<string | null>(null)
const celebrateKey = ref(0)

const dwellMs = (l: LessonMeta) => Math.min(40_000, Math.max(15_000, l.minutes * 8_000))

function complete(id: string) {
  if (isDone(id)) return
  const wasComplete = progress.value.complete
  setDone(id, true)
  justDone.value = id
  if (!wasComplete && progress.value.complete) celebrateKey.value++
}

function tryAutoComplete(id: string) {
  const lesson = lessons.value.find(l => l.id === id)
  if (!lesson || lesson.quiz || isDone(id) || !endVisible.has(id)) return
  const seen = firstSeen.get(id)
  if (seen == null) return
  const wait = dwellMs(lesson) - (Date.now() - seen)
  if (wait <= 0) {
    complete(id)
    return
  }
  if (!timers.has(id)) {
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      tryAutoComplete(id)
    }, wait + 50))
  }
}

function onQuizFinished(lesson: LessonMeta, score: number, total: number) {
  if (total && score / total >= 0.6) complete(lesson.id)
}

function toggleDone(lesson: LessonMeta) {
  if (isDone(lesson.id)) {
    setDone(lesson.id, false)
    if (justDone.value === lesson.id) justDone.value = null
  } else {
    complete(lesson.id)
  }
}

// ── Where the reader is ──────────────────────────────────────────
const current = ref<number>(-1)
let raf = 0

function measure() {
  raf = 0
  const root = scrollRoot.value
  const page = pageEl.value
  if (!root || !page) return
  const top = root.getBoundingClientRect().top
  const bottom = top + root.clientHeight
  const line = top + root.clientHeight * 0.35
  const now = Date.now()
  let idx = -1
  page.querySelectorAll<HTMLElement>('.lesson').forEach((el, i) => {
    const r = el.getBoundingClientRect()
    if (r.top <= line) idx = i
    if (r.top < bottom && r.bottom > top && !firstSeen.has(el.id) && isRendered(el.id)) firstSeen.set(el.id, now)
  })
  current.value = idx
}

const onScroll = () => {
  if (!raf) raf = requestAnimationFrame(measure)
}

const subtitle = computed(() => {
  if (!meta.value) return undefined
  const lesson = lessons.value[current.value]
  if (lesson) return t('guide.chapter.reading', { n: current.value + 1, total: lessons.value.length, title: tr(lesson.title) })
  return t('guide.chapter.progress', { done: progress.value.done, total: progress.value.total })
})

// ── Navigation ───────────────────────────────────────────────────
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function scrollToId(id: string, smooth = true) {
  document.getElementById(id)?.scrollIntoView({ behavior: smooth && !reduceMotion() ? 'smooth' : 'auto', block: 'start' })
}

function revealHash(smooth: boolean) {
  const id = decodeURIComponent(route.hash.replace(/^#/, ''))
  if (!id || !meta.value) return
  if (!lessons.value.some(l => l.id === id) && meta.value.lessons.some(l => l.id === id)) showAll.value = true
  render(id)
  nextTick(() => requestAnimationFrame(() => landOn(id, smooth)))
}

// Lessons around the target render late and shift it, so keep correcting until the layout settles or the reader takes over.
function landOn(id: string, smooth = true) {
  const root = scrollRoot.value
  scrollToId(id, smooth)
  if (!root) return
  let stopped = false
  const stop = () => (stopped = true)
  const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
  events.forEach(e => window.addEventListener(e, stop, { passive: true, capture: true }))
  const start = Date.now()
  let settling = !smooth
  if (smooth) {
    root.addEventListener('scrollend', () => (settling = true), { once: true })
  }
  const tick = () => {
    const el = document.getElementById(id)
    const elapsed = Date.now() - start
    if (stopped || !el || elapsed > 2500) {
      events.forEach(e => window.removeEventListener(e, stop, { capture: true }))
      return
    }
    if (settling || elapsed > 1000) {
      const want = root.getBoundingClientRect().top + parseFloat(getComputedStyle(el).scrollMarginTop || '0')
      if (Math.abs(el.getBoundingClientRect().top - want) > 2) el.scrollIntoView({ block: 'start' })
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function goTo(id: string) {
  render(id)
  router.replace({ hash: `#${id}` })
  if (route.hash === `#${id}`) nextTick(() => landOn(id))
}

function nextInChapter(lesson: LessonMeta): LessonMeta | undefined {
  const i = lessons.value.findIndex(l => l.id === lesson.id)
  return i >= 0 ? lessons.value[i + 1] : undefined
}

function resetReader() {
  showAll.value = false
  celebrateKey.value = 0
  justDone.value = null
  current.value = -1
  firstSeen.clear()
  endVisible.clear()
  timers.forEach(clearTimeout)
  timers.clear()
  const first = meta.value?.lessons[0]?.id
  rendered.value = new Set(first ? [first] : [])
}

let mounted = false

watch(() => meta.value?.id, async () => {
  resetReader()
  await load()
  if (mounted) revealHash(false)
}, { immediate: true })

watch(() => route.hash, () => revealHash(true))
watch(lessons, (list) => {
  if (list[0]) render(list[0].id)
})
watch([rendered, content, lessons], () => nextTick(observeAll), { flush: 'post' })

onMounted(() => {
  mounted = true
  scrollRoot.value = pageEl.value?.closest<HTMLElement>('.app-scroll') ?? null
  const root = scrollRoot.value
  nearObserver = new IntersectionObserver((entries) => {
    const ids = entries.filter(e => e.isIntersecting).map(e => (e.target as HTMLElement).dataset.lesson!).filter(Boolean)
    if (ids.length) render(...ids)
  }, { root, rootMargin: '900px 0px' })
  endObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const id = (e.target as HTMLElement).dataset.end!
      if (e.isIntersecting) {
        endVisible.add(id)
        tryAutoComplete(id)
      } else {
        endVisible.delete(id)
      }
    }
  }, { root })
  root?.addEventListener('scroll', onScroll, { passive: true })
  observeAll()
  if (content.value) revealHash(false)
})

onBeforeUnmount(() => {
  nearObserver?.disconnect()
  endObserver?.disconnect()
  scrollRoot.value?.removeEventListener('scroll', onScroll)
  timers.forEach(clearTimeout)
  if (raf) cancelAnimationFrame(raf)
})

// ── Guide ↔ journal ──────────────────────────────────────────────
const activePlants = computed(() => state.plants.filter(p => !p.archived))
const pickOpen = ref(false)
const pending = ref<GuideAction | null>(null)
const logPlant = ref('')
const logType = ref<EntryType>('note')
const logOpen = ref(false)

const actionLabel = (a: GuideAction) => t(`guide.chapter.actions.${a.kind === 'tool' ? a.tool : a.kind === 'log' ? a.entry : a.kind}`)
const actionGlyph = (a: GuideAction) => {
  if (a.kind === 'tool') return a.tool === 'vpd' ? 'i-tabler-droplet-half-2' : a.tool === 'nutrients' ? 'feed' : a.tool === 'dli' ? 'lamp' : a.tool === 'curing' ? 'curing' : a.tool === 'treatment' ? 'pest' : 'measure'
  if (a.kind === 'log') return entryInfo(a.entry).glyph
  return a.kind === 'plant' ? 'plants' : 'stage'
}

function runFor(a: GuideAction, plantId: string) {
  if (a.kind === 'log') {
    logPlant.value = plantId
    logType.value = a.entry
    nextTick(() => (logOpen.value = true))
  } else if (a.kind === 'stage') {
    navigateTo(`/plants/${plantId}`)
  }
}

function runAction(a: GuideAction) {
  if (!activePlants.value.length) {
    navigateTo('/plants/new')
    return
  }
  if (activePlants.value.length === 1) {
    runFor(a, activePlants.value[0]!.id)
    return
  }
  pending.value = a
  pickOpen.value = true
}

function pickPlant(id: string) {
  pickOpen.value = false
  if (pending.value) runFor(pending.value, id)
  pending.value = null
}
</script>

<template>
  <div ref="pageEl">
    <AppHeader
      :title="meta ? tr(meta.title) : t('guide.chapter.notFound')"
      :subtitle="subtitle"
      back
    >
      <template
        v-if="meta && progress.total"
        #actions
      >
        <GuideProgressRing
          :value="progress.done / progress.total"
          :size="44"
          :stroke="9"
          :label="t('guide.chapter.progress', { done: progress.done, total: progress.total })"
        >
          <span class="mini num">{{ progress.done }}<span>/{{ progress.total }}</span></span>
        </GuideProgressRing>
      </template>
    </AppHeader>

    <div
      v-if="!meta"
      class="page"
    >
      <EmptyState
        icon="guide"
        :title="t('guide.chapter.notFound')"
        :text="t('guide.chapter.notFoundText')"
      >
        <NuxtLink
          to="/guide"
          class="btn btn-soft"
        >
          {{ t('guide.chapter.backToGuide') }}
        </NuxtLink>
      </EmptyState>
    </div>

    <div
      v-else
      class="page"
      :style="{ '--c': meta.color }"
    >
      <header class="intro card">
        <GuideCover
          :chapter="meta.id"
          :glyph="meta.glyph"
          :color="meta.color"
          class="intro-art"
        />
        <div class="intro-body">
          <p class="intro-n num">
            {{ t('guide.hub.chapterN', { n: position + 1 }) }} · {{ t('guide.hub.chapterLessons', { n: lessons.length, min: totalMinutes }) }}
          </p>
          <p class="intro-summary">
            {{ tr(meta.summary) }}
          </p>
        </div>
      </header>

      <nav
        class="toc"
        :aria-label="t('guide.chapter.lessons')"
      >
        <div class="section-head">
          <h2 class="section-title">
            {{ t('guide.chapter.lessons') }}
          </h2>
        </div>
        <ol class="card">
          <li
            v-for="(lesson, i) in lessons"
            :key="lesson.id"
          >
            <a
              :href="`#${lesson.id}`"
              class="toc-item"
              :class="{ done: isDone(lesson.id), here: current === i }"
              @click.prevent="goTo(lesson.id)"
            >
              <span
                class="toc-mark num"
                aria-hidden="true"
              >
                <UIcon
                  v-if="isDone(lesson.id)"
                  name="i-tabler-check"
                />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="toc-name">{{ tr(lesson.title) }}</span>
              <span class="toc-min num">{{ t('guide.chapter.minutes', { n: lesson.minutes }) }}</span>
              <span
                v-if="isDone(lesson.id)"
                class="sr-only"
              >{{ t('guide.chapter.done') }}</span>
            </a>
          </li>
        </ol>
        <p
          v-if="hiddenCount"
          class="hidden-note"
        >
          <span>{{ showAll ? '' : t('guide.chapter.hidden', { n: hiddenCount }) }}</span>
          <button
            type="button"
            class="link"
            @click="showAll = !showAll"
          >
            {{ showAll ? t('guide.chapter.showFiltered') : t('guide.chapter.showAll') }}
          </button>
        </p>
      </nav>

      <div
        v-if="loadFailed"
        class="load-error"
        role="alert"
      >
        <p>{{ t('guide.chapter.loadError') }}</p>
        <button
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" />
          {{ t('guide.chapter.retry') }}
        </button>
      </div>

      <article
        v-for="(lesson, i) in lessons"
        :id="lesson.id"
        :key="lesson.id"
        class="lesson"
        :aria-labelledby="`${lesson.id}-h`"
      >
        <header class="lesson-head">
          <h2
            :id="`${lesson.id}-h`"
            class="lesson-title"
          >
            {{ tr(lesson.title) }}
          </h2>
          <p class="lesson-count num">
            {{ t('guide.chapter.lessonOf', { n: i + 1, total: lessons.length }) }} · {{ t('guide.chapter.minutes', { n: lesson.minutes }) }}
          </p>
        </header>

        <template v-if="isRendered(lesson.id)">
          <div class="blocks">
            <GuideBlock
              v-for="(block, j) in bodies.get(lesson.id)!.blocks"
              :key="j"
              :block="block"
              :lesson-id="lesson.id"
              @quiz-finished="(score, total) => onQuizFinished(lesson, score, total)"
            />
          </div>

          <footer class="lesson-foot">
            <section
              v-if="lessonActions(lesson.id).length"
              class="use card"
              :aria-label="t('guide.chapter.putToUse')"
            >
              <h3 class="use-title">
                {{ t('guide.chapter.putToUse') }}
              </h3>
              <template
                v-for="(a, k) in lessonActions(lesson.id)"
                :key="k"
              >
                <NuxtLink
                  v-if="a.kind === 'tool' || a.kind === 'plant'"
                  :to="a.kind === 'tool' ? { path: '/tools', query: { t: a.tool } } : '/plants/new'"
                  class="use-item"
                >
                  <GrowIcon :name="actionGlyph(a)" />
                  <span>{{ actionLabel(a) }}</span>
                  <UIcon
                    name="i-tabler-chevron-right"
                    class="use-chev"
                  />
                </NuxtLink>
                <button
                  v-else
                  type="button"
                  class="use-item"
                  @click="runAction(a)"
                >
                  <GrowIcon :name="actionGlyph(a)" />
                  <span>{{ actionLabel(a) }}</span>
                  <UIcon
                    name="i-tabler-chevron-right"
                    class="use-chev"
                  />
                </button>
              </template>
            </section>

            <div
              class="lesson-end"
              :data-end="lesson.id"
            >
              <button
                type="button"
                class="done-toggle"
                :class="{ on: isDone(lesson.id) }"
                :aria-pressed="isDone(lesson.id)"
                :title="isDone(lesson.id) ? t('guide.chapter.undo') : undefined"
                @click="toggleDone(lesson)"
              >
                <span
                  class="done-mark"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 12 12">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                  </svg>
                </span>
                {{ isDone(lesson.id) ? t('guide.chapter.done') : t('guide.chapter.markRead') }}
              </button>
              <p
                v-if="lesson.quiz && !isDone(lesson.id)"
                class="end-hint"
              >
                {{ t('guide.chapter.quizToFinish') }}
              </p>
              <p
                class="sr-only"
                aria-live="polite"
              >
                {{ justDone === lesson.id ? t('guide.chapter.justDone') : '' }}
              </p>
            </div>

            <button
              v-if="nextInChapter(lesson)"
              type="button"
              class="btn btn-block next-btn"
              :class="isDone(lesson.id) ? 'btn-primary' : 'btn-ghost'"
              @click="goTo(nextInChapter(lesson)!.id)"
            >
              <span class="next-label">{{ t('guide.chapter.nextLesson', { title: tr(nextInChapter(lesson)!.title) }) }}</span>
              <UIcon name="i-tabler-arrow-down" />
            </button>
            <NuxtLink
              v-else-if="nextChapter && !progress.complete"
              :to="`/guide/${nextChapter.id}`"
              class="btn btn-block next-btn"
              :class="isDone(lesson.id) ? 'btn-primary' : 'btn-ghost'"
            >
              <span class="next-label">{{ t('guide.chapter.nextChapter', { title: tr(nextChapter.title) }) }}</span>
              <UIcon name="i-tabler-arrow-right" />
            </NuxtLink>
          </footer>
        </template>

        <div
          v-else
          class="lesson-pending"
          :class="{ shimmer: !content && !loadFailed && i === 0 }"
          :data-lesson="lesson.id"
          :style="{ minHeight: `${lesson.minutes * 280}px` }"
          :aria-busy="!content"
        >
          <span
            v-if="!content && !loadFailed && i === 0"
            class="sr-only"
          >{{ t('guide.chapter.loading') }}</span>
        </div>
      </article>

      <section
        v-if="progress.complete && content"
        :key="celebrateKey"
        class="finale"
        aria-live="polite"
      >
        <span
          class="tile finale-tile"
          aria-hidden="true"
        >
          <GrowIcon :name="meta.glyph" />
        </span>
        <h2 class="finale-title">
          {{ t('guide.chapter.completeTitle') }}
        </h2>
        <p class="finale-text">
          {{ t('guide.chapter.completeText') }}
        </p>
        <NuxtLink
          v-if="nextChapter"
          :to="`/guide/${nextChapter.id}`"
          class="btn btn-primary btn-block"
        >
          {{ t('guide.chapter.nextChapter', { title: tr(nextChapter.title) }) }}
        </NuxtLink>
        <NuxtLink
          to="/guide"
          class="btn btn-ghost btn-block"
        >
          {{ t('guide.chapter.backToHub') }}
        </NuxtLink>
      </section>

      <nav
        v-if="prevChapter"
        class="pager"
        :aria-label="t('guide.title')"
      >
        <NuxtLink
          v-if="prevChapter"
          :to="`/guide/${prevChapter.id}`"
          class="pager-link card"
        >
          <UIcon name="i-tabler-chevron-left" />
          <span>
            <span class="pager-lead">{{ t('guide.chapter.prev') }}</span>
            <span class="pager-title">{{ tr(prevChapter.title) }}</span>
          </span>
        </NuxtLink>
      </nav>
    </div>

    <BottomSheet
      v-model:open="pickOpen"
      :title="t('guide.chapter.pickPlant')"
    >
      <div class="pick-list">
        <button
          v-for="p in activePlants"
          :key="p.id"
          type="button"
          class="pick-item"
          @click="pickPlant(p.id)"
        >
          <GrowIcon
            :name="stageInfo(p.stage).glyph"
            :style="{ color: stageInfo(p.stage).color }"
            class="pick-glyph"
          />
          <span class="pick-text">
            <span class="pick-name">{{ p.name }}</span>
            <span class="pick-meta">{{ [p.strain, stageInfo(p.stage).label].filter(Boolean).join(' · ') }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="use-chev"
          />
        </button>
      </div>
    </BottomSheet>

    <EntrySheet
      v-if="logPlant"
      v-model:open="logOpen"
      :plant-id="logPlant"
      :type="logType"
      :date="todayISO()"
    />
  </div>
</template>

<style scoped>
.mini {
  font-size: 12px;
  font-weight: 600;
}

.mini span {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
}

.tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
  font-size: 24px;
}

/* Chapter intro */
.intro {
  overflow: hidden;
}

.intro-art {
  aspect-ratio: 2 / 1;
  border-bottom: 1px solid var(--line);
}

.intro-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
}

.intro-n {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.intro-summary {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
}

/* Table of contents */
.toc ol {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: none;
}

.toc li + li {
  border-top: 1px solid var(--line);
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 8px 14px 8px 0;
  color: var(--text);
  text-decoration: none;
}

.toc-item:active {
  background: var(--surface-2);
}

.toc-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface-3);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  transition: background var(--dur) ease, color var(--dur) ease;
}

.toc-item.here .toc-mark {
  background: var(--green);
  color: var(--on-accent);
}

.toc-item.done .toc-mark {
  background: var(--accent-soft);
  color: var(--green);
  font-size: 15px;
}

.toc-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
}

.toc-item.done .toc-name {
  color: var(--text-2);
}

.toc-min {
  flex: none;
  font-size: 12px;
  color: var(--text-3);
}

.hidden-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.hidden-note .link {
  min-height: 44px;
}

.load-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: 14px;
  color: var(--text-2);
}

.load-error p {
  margin: 0;
}

/* Lessons */
.lesson {
  scroll-margin-top: calc(84px + var(--safe-top));
  padding-top: 28px;
  border-top: 1px solid var(--line);
}

.lesson-head {
  margin-bottom: 18px;
}

.lesson-title {
  margin: 0;
  max-width: 30ch;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.lesson-count {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 20px;
  content-visibility: auto;
  contain-intrinsic-size: auto 1200px;
}

.lesson-pending.shimmer {
  border-radius: var(--radius);
  background: var(--surface);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

.lesson-foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.use {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.use-title {
  margin: 0;
  padding: 12px 14px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.use-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px 8px 14px;
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  transition: background var(--dur-fast) ease;
}

.use-title + .use-item {
  border-top: 0;
}

.use-item:active {
  background: var(--surface-2);
}

.use-item > span {
  flex: 1;
  min-width: 0;
}

.use-item .grow-icon,
.use-item > .iconify:first-child {
  flex: none;
  font-size: 22px;
  color: var(--green);
}

.use-chev {
  flex: none;
  font-size: 18px;
  color: var(--text-3);
}

.lesson-end {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.done-toggle {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 6px 12px 6px 8px;
  margin-left: -8px;
  border: 0;
  border-radius: var(--radius-control);
  background: none;
  color: var(--text-2);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  transition: color var(--dur) ease, background var(--dur) ease;
}

.done-toggle:active {
  background: var(--surface);
}

.done-toggle.on {
  color: var(--text);
}

.done-mark {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--line-strong);
  transition: background var(--dur) ease, border-color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.done-mark svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--on-accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transition: opacity var(--dur-fast) ease;
}

.done-toggle:active .done-mark {
  transform: scale(0.9);
}

.on .done-mark {
  background: var(--green);
  border-color: var(--green);
}

.on .done-mark svg {
  opacity: 1;
}

.end-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-3);
}

.next-btn {
  justify-content: space-between;
}

.next-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Chapter complete */
.finale {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 4px 4px;
  text-align: center;
  scroll-margin: 96px;
}

.finale-tile {
  width: 56px;
  height: 56px;
  font-size: 32px;
}

.finale-title {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.finale-text {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-2);
}

.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pager-link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 10px 12px;
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
}

.pager-link > span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pager-lead {
  font-size: 11px;
  color: var(--text-3);
}

.pager-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pager .iconify {
  flex: none;
  font-size: 18px;
  color: var(--text-3);
}

.pick-list {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}

.pick-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 10px 4px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
}

.pick-item:last-child {
  border-bottom: 0;
}

.pick-glyph {
  flex: none;
  font-size: 26px;
}

.pick-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pick-name {
  font-size: 15px;
  font-weight: 600;
}

.pick-meta {
  font-size: 13px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .lesson-pending.shimmer {
    animation: none;
  }
}
</style>
