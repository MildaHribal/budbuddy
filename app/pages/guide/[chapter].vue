<script setup lang="ts">
import { chapterLessons, getChapter, type Lesson } from '~/guide'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { chapters, tr, environment, medium, isDone, setDone, chapterProgress } = useGuide()

const chapter = computed(() => getChapter(String(route.params.chapter)))
useHead({ title: () => (chapter.value ? tr(chapter.value.title) : t('guide.chapter.notFound')) })

const showAll = ref(false)
const filtered = computed(() => (chapter.value ? chapterLessons(chapter.value, environment.value, medium.value) : []))
const lessons = computed<Lesson[]>(() => (chapter.value ? (showAll.value ? chapter.value.lessons : filtered.value) : []))
const hiddenCount = computed(() => (chapter.value ? chapter.value.lessons.length - filtered.value.length : 0))
const progress = computed(() => (chapter.value ? chapterProgress(chapter.value) : { done: 0, total: 0, minutesLeft: 0, complete: false }))
const totalMinutes = computed(() => lessons.value.reduce((s, l) => s + l.minutes, 0))

const position = computed(() => chapters.findIndex(c => c.id === chapter.value?.id))
const prevChapter = computed(() => (position.value > 0 ? chapters[position.value - 1] : undefined))
const nextChapter = computed(() => (position.value >= 0 ? chapters[position.value + 1] : undefined))

const celebrateKey = ref(0)
const finale = ref<HTMLElement | null>(null)

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function scrollToId(id: string, smooth = true) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: smooth && !reduceMotion() ? 'smooth' : 'auto', block: 'start' })
}

function revealHash(smooth: boolean) {
  const id = decodeURIComponent(route.hash.replace(/^#/, ''))
  if (!id || !chapter.value) return
  if (!lessons.value.some(l => l.id === id) && chapter.value.lessons.some(l => l.id === id)) showAll.value = true
  nextTick(() => scrollToId(id, smooth))
}

watch(() => route.params.chapter, () => {
  showAll.value = false
  celebrateKey.value = 0
})
onMounted(() => setTimeout(() => revealHash(false), 60))
watch(() => route.hash, () => revealHash(true))

function nextInChapter(lesson: Lesson): Lesson | undefined {
  const i = lessons.value.findIndex(l => l.id === lesson.id)
  return i >= 0 ? lessons.value[i + 1] : undefined
}

function toggleDone(lesson: Lesson) {
  const wasComplete = progress.value.complete
  setDone(lesson.id, !isDone(lesson.id))
  if (!wasComplete && progress.value.complete) {
    celebrateKey.value++
    nextTick(() => finale.value?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }))
  }
}

function goTo(id: string) {
  router.replace({ hash: `#${id}` })
  if (route.hash === `#${id}`) scrollToId(id)
}
</script>

<template>
  <div>
    <AppHeader
      :title="chapter ? tr(chapter.title) : t('guide.chapter.notFound')"
      :subtitle="chapter ? t('guide.chapter.progress', { done: progress.done, total: progress.total }) : undefined"
      back
    >
      <template
        v-if="chapter && progress.total"
        #actions
      >
        <GuideProgressRing
          :value="progress.total ? progress.done / progress.total : 0"
          :size="44"
          :stroke="10"
          :label="t('guide.chapter.progress', { done: progress.done, total: progress.total })"
        >
          <span class="mini num">{{ progress.done }}</span>
        </GuideProgressRing>
      </template>
    </AppHeader>

    <div
      v-if="!chapter"
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
      :style="{ '--c': chapter.color }"
    >
      <header class="intro rise">
        <span
          class="intro-glyph"
          aria-hidden="true"
        >
          <GrowIcon
            :name="chapter.glyph"
            draw
            glow
            :stroke-width="1.3"
          />
        </span>
        <p class="intro-summary">
          {{ tr(chapter.summary) }}
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
              :class="{ done: isDone(lesson.id) }"
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
        <div class="blocks">
          <GuideBlock
            v-for="(block, j) in lesson.blocks"
            :key="j"
            :block="block"
            :lesson-id="lesson.id"
          />
        </div>
        <footer class="lesson-foot">
          <button
            type="button"
            class="btn btn-block"
            :class="isDone(lesson.id) ? 'btn-soft is-done' : 'btn-primary'"
            :aria-pressed="isDone(lesson.id)"
            @click="toggleDone(lesson)"
          >
            <UIcon :name="isDone(lesson.id) ? 'i-tabler-circle-check' : 'i-tabler-check'" />
            {{ isDone(lesson.id) ? t('guide.chapter.done') : t('guide.chapter.markDone') }}
          </button>
          <button
            v-if="isDone(lesson.id) && nextInChapter(lesson)"
            type="button"
            class="btn btn-ghost btn-block next-lesson"
            @click="goTo(nextInChapter(lesson)!.id)"
          >
            <span class="next-label">{{ t('guide.chapter.nextLesson', { title: tr(nextInChapter(lesson)!.title) }) }}</span>
            <UIcon name="i-tabler-arrow-down" />
          </button>
        </footer>
      </article>

      <section
        v-if="progress.complete"
        ref="finale"
        :key="celebrateKey"
        class="finale"
        :class="{ fresh: celebrateKey > 0 }"
        aria-live="polite"
      >
        <span
          class="finale-glyph"
          aria-hidden="true"
        >
          <span class="halo" />
          <GrowIcon
            :name="chapter.glyph"
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
        <NuxtLink
          v-if="nextChapter"
          :to="`/guide/${nextChapter.id}`"
          class="pager-link next"
        >
          <span>
            <span class="pager-lead">{{ t('guide.chapter.next') }}</span>
            <span class="pager-title">{{ tr(nextChapter.title) }}</span>
          </span>
          <UIcon name="i-tabler-chevron-right" />
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.mini {
  font-size: 13px;
  font-weight: 500;
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
}

.lesson-foot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 24px;
}

.is-done {
  color: var(--leaf);
}

.next-lesson {
  justify-content: space-between;
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

.pager-link.next {
  grid-column: 2;
  justify-content: flex-end;
  text-align: right;
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

@media (prefers-reduced-motion: reduce) {
  .fresh .halo,
  .fresh .finale-glyph .grow-icon {
    animation: none;
  }
}
</style>
