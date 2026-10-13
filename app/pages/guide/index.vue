<script setup lang="ts">
import type { Environment, Medium } from '~/guide'
import { STAGE_CHAPTER } from '~/guide/actions'

const { t, locale } = useI18n()
useHead({ title: () => t('guide.title') })

const { chapters, tr, environment, medium, setSetup, chapterProgress, overall, resume, week } = useGuide()
const { state } = useGrow()

const ENVS: Environment[] = ['indoor', 'outdoor', 'greenhouse']
const MEDIA: Medium[] = ['soil', 'coco', 'hydro']

const percent = computed(() => Math.round(overall.value.ratio * 100))
const started = computed(() => overall.value.done > 0)
const path = computed(() => chapters.map(c => ({ chapter: c, p: chapterProgress(c) })))
const problems = computed(() => chapters.find(c => c.id === 'problems'))
const resumeLink = computed(() => (resume.value ? `/guide/${resume.value.chapter.id}#${resume.value.lesson.id}` : '/guide'))

function fmtTime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
const totalTime = computed(() => fmtTime(Math.max(10, Math.round(overall.value.minutes / 10) * 10)))
const timeLeft = computed(() => fmtTime(overall.value.minutesLeft > 30 ? Math.round(overall.value.minutesLeft / 5) * 5 : overall.value.minutesLeft))

const weekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' }))
const weekText = computed(() => {
  const w = week.value
  if (!w.lessons) return resume.value ? t('guide.hub.weekQuiet', { min: resume.value.lesson.minutes }) : ''
  return w.activeDays >= 2 ? t('guide.hub.weekRhythm', { n: w.activeDays }) : t('guide.hub.weekLessons', { n: w.lessons })
})

// A chapter that matches a plant growing right now.
const forGrow = computed(() => {
  for (const plant of state.plants) {
    if (plant.archived) continue
    const chapter = chapters.find(c => c.id === STAGE_CHAPTER[plant.stage])
    if (!chapter || chapter.id === resume.value?.chapter.id || chapterProgress(chapter).complete) continue
    return { plant, chapter, stage: stageInfo(plant.stage).label.toLowerCase() }
  }
  return null
})

const TOOL_LINKS = [
  { id: 'vpd', icon: 'i-tabler-droplet-half-2' },
  { id: 'nutrients', icon: 'feed' },
  { id: 'dli', icon: 'lamp' }
]
</script>

<template>
  <div>
    <AppHeader
      :title="t('guide.title')"
      :subtitle="t('guide.subtitle')"
    />

    <div
      v-if="!chapters.length"
      class="page"
    >
      <EmptyState
        icon="guide"
        :title="t('guide.hub.empty')"
        :text="t('guide.hub.emptyText')"
      />
    </div>

    <div
      v-else
      class="page rise"
    >
      <section
        v-if="!started && resume"
        class="welcome card"
        aria-labelledby="welcome-h"
      >
        <span
          class="tile welcome-tile"
          aria-hidden="true"
        >
          <GrowIcon name="seedling" />
        </span>
        <h2
          id="welcome-h"
          class="welcome-title"
        >
          {{ t('guide.hub.welcomeTitle') }}
        </h2>
        <p class="welcome-text num">
          {{ t('guide.hub.welcomeText', { n: overall.total, time: totalTime }) }}
        </p>
        <NuxtLink
          :to="resumeLink"
          class="first"
        >
          <span class="first-title">{{ tr(resume.lesson.title) }}</span>
          <span class="first-lead num">{{ t('guide.hub.firstLesson') }} · {{ t('guide.chapter.minutes', { n: resume.lesson.minutes }) }}</span>
          <span class="btn btn-primary btn-block first-btn">
            {{ t('guide.hub.firstCta') }}
            <UIcon name="i-tabler-arrow-right" />
          </span>
        </NuxtLink>
      </section>

      <template v-else>
        <section
          class="hero card"
          :aria-label="t('guide.hub.progressLabel', { done: overall.done, total: overall.total })"
        >
          <div class="hero-row">
            <p class="hero-big num">
              {{ t('guide.hub.lessonsDone', { n: overall.done }) }}
              <span class="hero-of">{{ t('guide.hub.ofTotal', { total: overall.total }) }}</span>
            </p>
            <span class="hero-pct num">{{ percent }} %</span>
          </div>
          <div
            class="progress"
            aria-hidden="true"
          >
            <div :style="{ width: `${percent}%` }" />
          </div>
          <p class="hero-left num">
            {{ overall.minutesLeft ? t('guide.hub.timeLeft', { time: timeLeft }) : t('guide.hub.allRead') }}
          </p>
          <div
            v-if="weekText"
            class="week"
          >
            <div
              class="week-days"
              role="img"
              :aria-label="`${t('guide.hub.weekLabel')}: ${week.lessons}`"
            >
              <span
                v-for="d in week.days"
                :key="d.key"
                class="day"
                :class="{ on: d.count > 0, today: d.today }"
              >
                <i />
                <small>{{ weekday.format(d.date) }}</small>
              </span>
            </div>
            <p class="week-text">
              {{ weekText }}
            </p>
          </div>
        </section>

        <NuxtLink
          v-if="resume"
          :to="resumeLink"
          class="resume card"
        >
          <span
            class="tile"
            :style="{ color: resume.chapter.color }"
            aria-hidden="true"
          >
            <GrowIcon :name="resume.chapter.glyph" />
          </span>
          <span class="resume-text">
            <span class="resume-lead">{{ t('guide.hub.continue') }}</span>
            <span class="resume-title">{{ tr(resume.lesson.title) }}</span>
            <span class="resume-meta num">{{ tr(resume.chapter.title) }} · {{ t('guide.chapter.minutes', { n: resume.lesson.minutes }) }}</span>
          </span>
          <span class="btn btn-primary resume-btn">
            {{ t('guide.hub.continueBtn') }}
            <UIcon name="i-tabler-arrow-right" />
          </span>
        </NuxtLink>
        <section
          v-else
          class="resume card"
        >
          <span
            class="tile amber"
            aria-hidden="true"
          >
            <GrowIcon name="harvest" />
          </span>
          <span class="resume-text">
            <span class="resume-title">{{ t('guide.hub.finishedTitle') }}</span>
            <span class="resume-meta">{{ t('guide.hub.finishedText') }}</span>
          </span>
        </section>
      </template>

      <section
        v-if="forGrow"
        aria-labelledby="for-grow-title"
      >
        <div class="section-head">
          <h2
            id="for-grow-title"
            class="section-title"
          >
            {{ t('guide.hub.forGrow') }}
          </h2>
        </div>
        <NuxtLink
          :to="`/guide/${forGrow.chapter.id}`"
          class="row-card card"
        >
          <span
            class="tile"
            :style="{ color: forGrow.chapter.color }"
            aria-hidden="true"
          >
            <GrowIcon :name="forGrow.chapter.glyph" />
          </span>
          <span class="row-text">
            <span class="row-title">{{ tr(forGrow.chapter.title) }}</span>
            <span class="row-sub">{{ t('guide.hub.forGrowText', { plant: forGrow.plant.name, stage: forGrow.stage }) }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="chev"
          />
        </NuxtLink>
      </section>

      <section aria-labelledby="setup-h">
        <div class="section-head">
          <h2
            id="setup-h"
            class="section-title"
          >
            {{ t('guide.hub.setup') }}
          </h2>
        </div>
        <p class="hint">
          {{ t('guide.hub.setupHint') }}
        </p>
        <div
          class="setup-row"
          role="group"
          :aria-label="t('guide.hub.environment')"
        >
          <span class="setup-label">{{ t('guide.hub.environment') }}</span>
          <div class="chips">
            <button
              v-for="e in ENVS"
              :key="e"
              type="button"
              class="chip"
              :aria-pressed="environment === e"
              @click="setSetup({ environment: environment === e ? null : e })"
            >
              {{ t(`guide.env.${e}`) }}
            </button>
          </div>
        </div>
        <div
          class="setup-row"
          role="group"
          :aria-label="t('guide.hub.medium')"
        >
          <span class="setup-label">{{ t('guide.hub.medium') }}</span>
          <div class="chips">
            <button
              v-for="m in MEDIA"
              :key="m"
              type="button"
              class="chip"
              :aria-pressed="medium === m"
              @click="setSetup({ medium: medium === m ? null : m })"
            >
              {{ t(`guide.media.${m}`) }}
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="path-h">
        <div class="section-head">
          <h2
            id="path-h"
            class="section-title"
          >
            {{ t('guide.hub.path') }}
          </h2>
        </div>
        <ol class="chapters card">
          <li
            v-for="({ chapter, p }, i) in path"
            :key="chapter.id"
            class="stop"
            :class="{ complete: p.complete, current: resume?.chapter.id === chapter.id }"
          >
            <NuxtLink
              :to="`/guide/${chapter.id}`"
              class="stop-link"
            >
              <span
                class="node num"
                aria-hidden="true"
              >
                <UIcon
                  v-if="p.complete"
                  name="i-tabler-check"
                />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="stop-text">
                <span class="stop-title">{{ tr(chapter.title) }}</span>
                <span class="stop-meta num">
                  <template v-if="p.complete">{{ t('guide.hub.chapterDone') }} · </template>
                  {{ t('guide.hub.chapterMeta', { done: p.done, total: p.total, min: chapter.lessons.reduce((s, l) => s + l.minutes, 0) }) }}<template v-if="p.done && !p.complete"> · {{ t('guide.hub.chapterLeft', { min: p.minutesLeft }) }}</template>
                </span>
                <span
                  v-if="p.done && !p.complete"
                  class="progress stop-progress"
                  aria-hidden="true"
                >
                  <span :style="{ width: `${(p.done / p.total) * 100}%` }" />
                </span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="chev"
              />
            </NuxtLink>
          </li>
        </ol>
      </section>

      <NuxtLink
        v-if="problems"
        to="/guide/problems"
        class="row-card card"
      >
        <span
          class="tile"
          :style="{ color: problems.color }"
          aria-hidden="true"
        >
          <GrowIcon :name="problems.glyph" />
        </span>
        <span class="row-text">
          <span class="row-title">{{ t('guide.hub.diagnose') }}</span>
          <span class="row-sub">{{ t('guide.hub.diagnoseText') }}</span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="chev"
        />
      </NuxtLink>

      <section aria-labelledby="tools-h">
        <div class="section-head">
          <h2
            id="tools-h"
            class="section-title"
          >
            {{ t('guide.hub.tools') }}
          </h2>
          <NuxtLink
            to="/tools"
            class="link"
          >
            {{ t('common.viewAll') }} <UIcon
              name="i-tabler-chevron-right"
              class="size-4"
            />
          </NuxtLink>
        </div>
        <div class="chips">
          <NuxtLink
            v-for="l in TOOL_LINKS"
            :key="l.id"
            :to="{ path: '/tools', query: { t: l.id } }"
            class="chip tool-chip"
          >
            <GrowIcon :name="l.icon" />
            {{ t(`guide.toolLinks.${l.id}`) }}
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Icon tile: tinted by currentColor */
.tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, currentColor 14%, transparent);
  color: var(--green);
  font-size: 24px;
}

.tile.amber {
  color: var(--amber);
}

.chev {
  flex: none;
  font-size: 18px;
  color: var(--text-3);
}

/* First visit */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
}

.welcome-tile {
  margin-bottom: 4px;
}

.welcome-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.welcome-text {
  margin: 0;
  max-width: 44ch;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.first {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: inherit;
  text-decoration: none;
}

.first-lead {
  font-size: 12px;
  color: var(--text-3);
}

.first-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.first-btn {
  margin-top: 12px;
}

.first:active .first-btn {
  transform: scale(0.98);
}

/* Progress */
.hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.hero-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.hero-big {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.hero-of {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-3);
}

.hero-pct {
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
}

.hero-left {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.week {
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.week-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.day i {
  width: 100%;
  max-width: 30px;
  height: 6px;
  border-radius: 3px;
  background: var(--track);
}

.day.on i {
  background: var(--green);
}

.day small {
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
}

.day.today small {
  color: var(--text);
  font-weight: 600;
}

.week-text {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

/* Continue */
.resume {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  padding: 14px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.resume:active {
  transform: scale(0.985);
}

.resume-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  align-self: center;
}

.resume-lead {
  font-size: 12px;
  color: var(--text-3);
}

.resume-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.resume-meta {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.resume-btn {
  grid-column: 1 / -1;
  margin-top: 10px;
}

/* Single-row link cards */
.row-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 12px 12px 14px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.row-card:active {
  transform: scale(0.985);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-lead {
  font-size: 12px;
  color: var(--text-3);
}

.row-title {
  font-size: 15px;
  font-weight: 600;
}

.row-sub {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

/* Setup */
.hint {
  margin: -4px 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-3);
}

.setup-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setup-row + .setup-row {
  margin-top: 8px;
}

.setup-label {
  flex: none;
  width: 64px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.setup-row .chips {
  min-width: 0;
}

/* Chapters */
.chapters {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: none;
}

.stop + .stop {
  border-top: 1px solid var(--line);
}

.stop-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px 10px 0;
  color: inherit;
  text-decoration: none;
}

.stop-link:active {
  background: var(--surface-2);
}

.node {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 14px;
  font-weight: 600;
}

.complete .node {
  background: var(--accent-soft);
  color: var(--green);
  font-size: 18px;
}

.current .node {
  background: var(--green);
  color: var(--on-accent);
}

.stop-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stop-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.stop-meta {
  font-size: 12px;
  color: var(--text-3);
}

.complete .stop-meta {
  color: var(--green);
}

.stop-progress {
  display: block;
  height: 4px;
  margin-top: 4px;
  max-width: 160px;
}

.stop-progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--green);
}

.tool-chip {
  min-height: 44px;
  text-decoration: none;
}

.tool-chip .grow-icon,
.tool-chip .iconify {
  font-size: 17px;
  color: var(--green);
}
</style>
