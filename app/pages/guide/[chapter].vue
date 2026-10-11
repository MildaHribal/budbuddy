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
  nextTick(() => requestAnimationFrame(() => scrollToId(id, smooth)))
}

function goTo(id: string) {
  render(id)
  router.replace({ hash: `#${id}` })
  if (route.hash === `#${id}`) nextTick(() => scrollToId(id))
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
  if (a.kind === 'tool') return a.tool === 'vpd' ? 'i-tabler-droplet-half-2' : a.tool === 'nutrients' ? 'feed' : a.tool === 'dli' ? 'lamp' : 'measure'
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

// Finale blooms when it scrolls into view, not offscreen.
const finale = ref<HTMLElement | null>(null)
const finaleSeen = ref(false)
let finaleObserver: IntersectionObserver | null = null
watch(finale, (el) => {
  finaleObserver?.disconnect()
  finaleSeen.value = false
  if (!el) return
  finaleObserver = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) {
      finaleSeen.value = true
      finaleObserver?.disconnect()
    }
  }, { root: scrollRoot.value, threshold: 0.4 })
  finaleObserver.observe(el)
})
onBeforeUnmount(() => finaleObserver?.disconnect())
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
      <header class="intro rise">
        <span
          class="intro-glyph"
          aria-hidden="true"
        >
          <GrowIcon
            :name="meta.glyph"
            draw
            glow
            :stroke-width="1.3"
          />
        </span>
        <p class="intro-summary">
          {{ tr(meta.summary) }}
        </p>
        <p class="intro-meta num">
          {{ t('guide.hub.chapterMeta', { done: progress.done, total: progress.total, min: totalMinutes }) }}
        </p>
        <div
          class="progress"
          aria-hidden="true"
        >
          <div :style="{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }" />
        </div>
      </header>

      <nav
        class="toc"
        :aria-label="t('guide.chapter.lessons')"
      >
        <h2 class="section-title toc-title">
          {{ t('guide.chapter.lessons') }}
        </h2>
        <ol>
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
          <p class="lesson-count num">
            {{ t('guide.chapter.lessonOf', { n: i + 1, total: lessons.length }) }} · {{ t('guide.chapter.minutes', { n: lesson.minutes }) }}
          </p>
          <h2
            :id="`${lesson.id}-h`"
            class="lesson-title"
          >
            {{ tr(lesson.title) }}
          </h2>
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
              class="use"
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
                :class="{ on: isDone(lesson.id), fresh: justDone === lesson.id }"
                :aria-pressed="isDone(lesson.id)"
                :title="isDone(lesson.id) ? t('guide.chapter.undo') : undefined"
                @click="toggleDone(lesson)"
              >
                <span
                  class="done-mark"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                    />
                    <path d="M7.5 12.5l3 3 6-6.5" />
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
        ref="finale"
        :key="celebrateKey"
        class="finale"
        :class="{ fresh: celebrateKey > 0 && finaleSeen }"
        aria-live="polite"
      >
        <span
          class="finale-glyph"
          aria-hidden="true"
        >
          <span class="halo" />
          <GrowIcon
            :name="meta.glyph"
            draw
            glow
            :stroke-width="1.2"
          />
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
          class="pager-link prev"
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
  font-size: 13px;
  font-weight: 500;
}

.mini span {
  font-size: 11px;
  color: var(--text-3);
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.intro-glyph {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin-bottom: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c) 16%, transparent), transparent 70%);
  color: var(--c);
  font-size: 56px;
}

.intro-summary {
  margin: 0;
  max-width: 65ch;
  font-size: 16px;
  line-height: 1.55;
  color: var(--text);
}

.intro-meta {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.intro .progress {
  margin-top: 4px;
}

.toc-title {
  margin-bottom: 8px;
}

.toc ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 6px 0;
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--line);
}

.toc li:last-child .toc-item {
  border-bottom: 0;
}

.toc-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line-strong);
  font-size: 12px;
  color: var(--text-3);
  transition: background var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
}

.toc-item.here .toc-mark {
  box-shadow: inset 0 0 0 1.5px var(--leaf);
  color: var(--text);
}

.toc-item.done .toc-mark {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-line);
  color: var(--leaf);
  font-size: 15px;
}

.toc-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
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
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 14px;
  color: var(--text-2);
}

.load-error p {
  margin: 0;
}

.lesson {
  scroll-margin-top: calc(84px + var(--safe-top));
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.lesson-count {
  margin: 12px 0 4px;
  font-size: 12px;
  color: var(--text-3);
}

.lesson-title {
  margin: 0 0 16px;
  max-width: 24ch;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.025em;
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* skip layout/paint of offscreen lessons; padding keeps card shadows unclipped */
  margin: -16px -20px;
  padding: 16px 20px;
  content-visibility: auto;
  contain-intrinsic-size: auto 1200px;
}

.lesson-pending.shimmer {
  border-radius: var(--radius);
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.035), transparent) 0 0 / 60% 100% no-repeat,
    repeating-linear-gradient(180deg, var(--surface) 0 14px, transparent 14px 30px) 0 0 / 100% 210px no-repeat;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: -60% 0, 0 0;
  }

  to {
    background-position: 160% 0, 0 0;
  }
}

.lesson-foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 28px;
}

.use {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: var(--panel-shadow);
  overflow: hidden;
}

.use-title {
  margin: 0;
  padding: 14px 16px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.use-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 10px 16px;
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  transition: background var(--dur-fast) var(--ease-out);
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
  font-size: 20px;
  color: var(--leaf);
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
  gap: 10px;
  min-height: 44px;
  padding: 6px 14px 6px 8px;
  margin-left: -8px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--text-2);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  transition: color var(--dur) var(--ease-out), background var(--dur) var(--ease-out);
}

.done-toggle:active {
  background: var(--surface);
}

.done-toggle.on {
  color: var(--leaf);
}

.done-mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
}

.done-mark svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.done-mark circle {
  stroke: var(--line-strong);
  stroke-width: 1.5;
  transition: stroke var(--dur) var(--ease-out), fill var(--dur) var(--ease-out);
}

.done-mark path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: 16;
  stroke-dashoffset: 16;
  transition: stroke-dashoffset var(--dur-slow) var(--ease-out);
}

.on .done-mark circle {
  stroke: var(--accent-line);
  fill: var(--accent-soft);
}

.on .done-mark path {
  stroke-dashoffset: 0;
}

.fresh .done-mark {
  animation: done-pop 620ms var(--ease-out);
}

.fresh .done-mark svg {
  animation: done-glow 1.4s var(--ease-out);
}

@keyframes done-pop {
  0% {
    transform: scale(0.7);
  }

  55% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes done-glow {
  30% {
    filter: drop-shadow(0 0 8px rgba(155, 227, 107, 0.7));
  }
}

.end-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-3);
}

.next-btn {
  justify-content: space-between;
  transition: background var(--dur) var(--ease-out), color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
}

.next-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.finale {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 4px 4px;
  text-align: center;
  scroll-margin: 96px;
}

.finale-glyph {
  position: relative;
  display: grid;
  place-items: center;
  width: 120px;
  height: 120px;
  font-size: 72px;
  color: var(--c);
}

.halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(155, 227, 107, 0.28), rgba(155, 227, 107, 0.08) 45%, transparent 70%);
}

.fresh .halo {
  animation: halo-bloom 1.6s var(--ease-out) both;
}

.fresh .finale-glyph .grow-icon {
  animation: leaf-glow 1.8s 0.6s var(--ease-out) both;
}

@keyframes halo-bloom {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }

  45% {
    opacity: 1;
    transform: scale(1.15);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes leaf-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 55%, transparent));
  }

  40% {
    filter: drop-shadow(0 0 18px color-mix(in srgb, currentColor 80%, transparent));
  }
}

.finale-title {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
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
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
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
  min-height: 60px;
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
  .fresh .halo,
  .fresh .finale-glyph .grow-icon,
  .fresh .done-mark,
  .fresh .done-mark svg,
  .lesson-pending.shimmer {
    animation: none;
  }
}
</style>
