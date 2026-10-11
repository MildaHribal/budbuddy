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
          class="welcome-glyph"
          aria-hidden="true"
        >
          <span class="welcome-halo" />
          <GrowIcon
            name="seedling"
            draw
            glow
            :stroke-width="1.2"
          />
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
          <span class="first-lead num">{{ t('guide.hub.firstLesson') }} · {{ t('guide.chapter.minutes', { n: resume.lesson.minutes }) }}</span>
          <span class="first-title">{{ tr(resume.lesson.title) }}</span>
          <span class="btn btn-primary btn-block first-btn">
            {{ t('guide.hub.firstCta') }}
            <UIcon name="i-tabler-arrow-right" />
          </span>
        </NuxtLink>
      </section>

      <template v-else>
        <section class="hero card">
          <div class="hero-main">
            <GuideProgressRing
              :value="overall.ratio"
              :size="112"
              :label="t('guide.hub.progressLabel', { done: overall.done, total: overall.total })"
            >
              <span class="pct num">{{ percent }}<small>%</small></span>
            </GuideProgressRing>
            <div class="hero-text">
              <p class="hero-big num">
                {{ t('guide.hub.lessonsDone', { n: overall.done }) }}
              </p>
              <p class="hero-of num">
                {{ t('guide.hub.ofTotal', { total: overall.total }) }}
              </p>
              <p class="hero-left num">
                {{ overall.minutesLeft ? t('guide.hub.timeLeft', { time: timeLeft }) : t('guide.hub.allRead') }}
              </p>
            </div>
          </div>
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
            class="resume-glyph"
            :style="{ color: resume.chapter.color }"
          >
            <GrowIcon
              :name="resume.chapter.glyph"
              glow
            />
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
          class="resume card finished"
        >
          <span class="resume-glyph">
            <GrowIcon
              name="harvest"
              glow
            />
          </span>
          <span class="resume-text">
            <span class="resume-title">{{ t('guide.hub.finishedTitle') }}</span>
            <span class="resume-meta">{{ t('guide.hub.finishedText') }}</span>
          </span>
        </section>
      </template>

      <NuxtLink
        v-if="forGrow"
        :to="`/guide/${forGrow.chapter.id}`"
        class="for-grow card"
        :style="{ '--c': forGrow.chapter.color }"
      >
        <GrowIcon
          :name="forGrow.chapter.glyph"
          class="diag-glyph"
        />
        <span class="diag-text">
          <span class="for-lead">{{ t('guide.hub.forGrow') }}</span>
          <span class="diag-title">{{ tr(forGrow.chapter.title) }}</span>
          <span class="diag-sub">{{ t('guide.hub.forGrowText', { plant: forGrow.plant.name, stage: forGrow.stage }) }}</span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="stop-chev"
        />
      </NuxtLink>

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
        <ol class="journey">
          <li
            v-for="({ chapter, p }, i) in path"
            :key="chapter.id"
            class="stop"
            :class="{ complete: p.complete, current: resume?.chapter.id === chapter.id }"
            :style="{ '--c': chapter.color, '--i': i }"
          >
            <NuxtLink
              :to="`/guide/${chapter.id}`"
              class="stop-link"
            >
              <span
                class="node"
                aria-hidden="true"
              >
                <GrowIcon
                  :name="chapter.glyph"
                  :glow="p.complete"
                />
                <span
                  v-if="p.complete"
                  class="node-check"
                >
                  <UIcon name="i-tabler-check" />
                </span>
              </span>
              <div class="stop-text">
                <span class="stop-title">
                  <span class="stop-n num">{{ String(i + 1).padStart(2, '0') }}</span>
                  {{ tr(chapter.title) }}
                </span>
                <span class="stop-summary">{{ tr(chapter.summary) }}</span>
                <span class="stop-meta num">
                  <template v-if="p.complete">{{ t('guide.hub.chapterDone') }} · </template>
                  {{ t('guide.hub.chapterMeta', { done: p.done, total: p.total, min: chapter.lessons.reduce((s, l) => s + l.minutes, 0) }) }}<template v-if="p.done && !p.complete"> · {{ t('guide.hub.chapterLeft', { min: p.minutesLeft }) }}</template>
                </span>
                <div
                  v-if="p.done && !p.complete"
                  class="progress stop-progress"
                  aria-hidden="true"
                >
                  <div :style="{ width: `${(p.done / p.total) * 100}%` }" />
                </div>
              </div>
              <UIcon
                name="i-tabler-chevron-right"
                class="stop-chev"
              />
            </NuxtLink>
          </li>
        </ol>
      </section>

      <NuxtLink
        v-if="problems"
        to="/guide/problems"
        class="diagnose card"
        :style="{ '--c': problems.color }"
      >
        <GrowIcon
          :name="problems.glyph"
          class="diag-glyph"
        />
        <span class="diag-text">
          <span class="diag-title">{{ t('guide.hub.diagnose') }}</span>
          <span class="diag-sub">{{ t('guide.hub.diagnoseText') }}</span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="stop-chev"
        />
      </NuxtLink>

      <section aria-labelledby="tools-h">
        <div class="section-head">
          <h2
            id="tools-h"
            class="section-title"
          >
            <GrowIcon name="tools" />
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
.welcome {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px 18px 18px;
  background:
    radial-gradient(90% 80% at 20% 0%, rgba(155, 227, 107, 0.1), transparent 65%),
    var(--panel);
}

.welcome-glyph {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  font-size: 48px;
  color: var(--leaf);
}

.welcome-halo {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(155, 227, 107, 0.2), transparent 70%);
  animation: welcome-breathe 4.2s ease-in-out 3 both;
}

@keyframes welcome-breathe {
  50% {
    opacity: 0.55;
    transform: scale(0.92);
  }
}

.welcome-title {
  margin: 6px 0 0;
  max-width: 20ch;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.025em;
}

.welcome-text {
  margin: 0;
  max-width: 40ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-2);
}

.first {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: inherit;
  text-decoration: none;
}

.first-lead {
  font-size: 12px;
  color: var(--lamp);
}

.first-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.first-btn {
  margin-top: 12px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.first:active .first-btn {
  transform: scale(0.985);
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  background:
    radial-gradient(90% 120% at 15% 0%, rgba(155, 227, 107, 0.08), transparent 60%),
    var(--panel);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 20px;
}

.week {
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
  background: var(--surface-3);
}

.day.on i {
  background: var(--leaf);
  box-shadow: 0 0 10px rgba(155, 227, 107, 0.35);
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

.pct {
  font-size: 34px;
  font-weight: 300;
  letter-spacing: -0.04em;
  line-height: 1;
}

.pct small {
  font-size: 16px;
  color: var(--text-3);
  margin-left: 1px;
}

.hero-text {
  min-width: 0;
}

.hero-big {
  margin: 0;
  font-size: 20px;
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.hero-of {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.hero-left {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--lamp);
}

.resume {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 14px;
  padding: 16px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.resume:active {
  transform: scale(0.985);
}

.resume-glyph {
  grid-row: span 1;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  font-size: 30px;
  color: var(--leaf);
}

.resume-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
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
  margin-top: 12px;
}

.finished .resume-glyph {
  color: var(--lamp);
}

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
  font-size: 12px;
  color: var(--text-3);
}

.setup-row .chips {
  min-width: 0;
}

.journey {
  margin: 0;
  padding: 0;
  list-style: none;
}

.stop {
  position: relative;
}

.stop:not(:last-child)::before,
.stop:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 23px;
  top: 52px;
  bottom: -6px;
  width: 2px;
  border-radius: 2px;
  background: var(--surface-3);
}

.stop.complete:not(:last-child)::after {
  background: linear-gradient(180deg, var(--leaf), color-mix(in srgb, var(--leaf) 40%, transparent));
  box-shadow: 0 0 10px rgba(155, 227, 107, 0.45);
  transform-origin: top;
  animation: rail-light 0.6s var(--ease-out) both;
  animation-delay: calc(300ms + var(--i) * 90ms);
}

@keyframes rail-light {
  from {
    transform: scaleY(0);
  }
}

.stop-link {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 6px 0 14px;
  color: inherit;
  text-decoration: none;
}

.stop-link:active .node {
  transform: scale(0.94);
}

.node {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, var(--surface-3), var(--surface));
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  box-shadow: inset 0 1px 0 var(--highlight);
  color: var(--c);
  font-size: 24px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.complete .node {
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--c) 22%, var(--surface-2)), var(--surface));
  border-color: color-mix(in srgb, var(--c) 60%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--c) 28%, transparent), inset 0 1px 0 var(--highlight);
}

.current .node {
  border-color: var(--leaf);
  box-shadow: 0 0 0 3px var(--accent-soft), inset 0 1px 0 var(--highlight);
}

.node-check {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--leaf);
  color: var(--on-accent);
  font-size: 12px;
  box-shadow: 0 0 0 2px var(--bg);
}

.stop-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 3px;
}

.stop-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.stop-n {
  margin-right: 4px;
  font-weight: 400;
  color: var(--text-3);
}

.stop-summary {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stop-meta {
  font-size: 12px;
  color: var(--text-3);
}

.complete .stop-meta {
  color: var(--leaf);
}

.stop-progress {
  height: 4px;
  margin-top: 6px;
  max-width: 160px;
}

.stop-chev {
  flex: none;
  align-self: center;
  font-size: 18px;
  color: var(--text-3);
}

.for-lead {
  font-size: 12px;
  color: var(--text-3);
}

.diagnose,
.for-grow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  min-height: 72px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.diagnose:active,
.for-grow:active {
  transform: scale(0.985);
}

.diag-glyph {
  flex: none;
  font-size: 30px;
  color: var(--c);
}

.diag-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.diag-title {
  font-size: 15px;
  font-weight: 600;
}

.diag-sub {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.tool-chip {
  min-height: 44px;
  text-decoration: none;
}

.tool-chip .grow-icon,
.tool-chip .iconify {
  font-size: 17px;
  color: var(--leaf);
}

@media (prefers-reduced-motion: reduce) {
  .stop.complete:not(:last-child)::after,
  .welcome-halo {
    animation: none;
  }
}
</style>
