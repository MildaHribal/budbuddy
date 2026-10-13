<script setup lang="ts">
import type { StageId } from '~/types/grow'
import { PROBLEMS } from '~/utils/problems'
import { CHECK_AREAS, CHECK_STAGES, matchProblems } from '~/utils/problems/atlas'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const FIRST = 5

// answers live in the query, so coming back from a problem keeps the result
const areaId = computed(() => CHECK_AREAS.find(a => a.id === route.query.area)?.id ?? null)
const stage = computed<StageId | 'any' | null>(() => {
  const s = route.query.stage
  return s === 'any' || CHECK_STAGES.includes(s as StageId) ? s as StageId | 'any' : null
})
const step = computed(() => (!areaId.value ? 1 : !stage.value ? 2 : 3))

function answer(q: { area?: string | null, stage?: string | null }) {
  const query = Object.fromEntries(Object.entries({ ...route.query, ...q }).filter(([, v]) => v))
  router.replace({ query })
  showAll.value = false
}

const results = computed(() => {
  const area = CHECK_AREAS.find(a => a.id === areaId.value)
  if (!area || !stage.value) return []
  return matchProblems(PROBLEMS, area.areas, stage.value === 'any' ? null : stage.value)
})
const showAll = ref(false)
const visible = computed(() => (showAll.value ? results.value : results.value.slice(0, FIRST)))

const stageLabel = (s: StageId) => stageInfo(s).label
const answerLine = computed(() => [
  areaId.value ? t(`problems.checker.areas.${areaId.value}`) : '',
  stage.value === 'any' ? t('problems.checker.anyStage') : stage.value ? stageLabel(stage.value) : ''
].filter(Boolean).join(' · '))
</script>

<template>
  <section
    class="checker card"
    aria-labelledby="checker-h"
  >
    <header class="head">
      <span
        class="tile"
        aria-hidden="true"
      >
        <UIcon name="i-tabler-stethoscope" />
      </span>
      <span class="head-text">
        <h2
          id="checker-h"
          class="title"
        >
          {{ t('problems.checker.title') }}
        </h2>
        <span class="lead">{{ step < 3 ? t('problems.checker.lead') : answerLine }}</span>
      </span>
      <span
        v-if="step < 3"
        class="step num"
      >{{ t('problems.checker.step', { n: step }) }}</span>
    </header>

    <div
      v-if="step === 1"
      class="body"
    >
      <p
        id="checker-q1"
        class="q"
      >
        {{ t('problems.checker.where') }}
      </p>
      <div
        class="areas"
        role="group"
        aria-labelledby="checker-q1"
      >
        <button
          v-for="a in CHECK_AREAS"
          :key="a.id"
          type="button"
          class="area"
          @click="answer({ area: a.id })"
        >
          {{ t(`problems.checker.areas.${a.id}`) }}
        </button>
      </div>
    </div>

    <div
      v-else-if="step === 2"
      class="body"
    >
      <p
        id="checker-q2"
        class="q"
      >
        {{ t('problems.checker.stage') }}
      </p>
      <p class="picked">
        {{ answerLine }}
      </p>
      <div
        class="stages"
        role="group"
        aria-labelledby="checker-q2"
      >
        <button
          v-for="s in CHECK_STAGES"
          :key="s"
          type="button"
          class="chip stage-chip"
          @click="answer({ stage: s })"
        >
          <GrowIcon
            :name="stageInfo(s).glyph"
            :style="{ color: stageInfo(s).color }"
          />
          {{ stageLabel(s) }}
        </button>
        <button
          type="button"
          class="chip stage-chip"
          @click="answer({ stage: 'any' })"
        >
          {{ t('problems.checker.anyStage') }}
        </button>
      </div>
      <div class="nav">
        <button
          type="button"
          class="link"
          @click="answer({ area: null })"
        >
          <UIcon
            name="i-tabler-chevron-left"
            class="size-4"
          />
          {{ t('problems.checker.back') }}
        </button>
      </div>
    </div>

    <div
      v-else
      class="body"
    >
      <div class="results-head">
        <p class="q">
          {{ t('problems.checker.results') }}
        </p>
        <span class="count num">{{ t('problems.checker.matches', { n: results.length }) }}</span>
      </div>
      <p
        v-if="!results.length"
        class="none"
      >
        {{ t('problems.checker.none') }}
      </p>
      <div
        v-else
        class="results"
      >
        <ProblemsProblemCard
          v-for="p in visible"
          :key="p.id"
          :problem="p"
          flat
        />
      </div>
      <div class="nav">
        <button
          type="button"
          class="link"
          @click="answer({ stage: null })"
        >
          <UIcon
            name="i-tabler-chevron-left"
            class="size-4"
          />
          {{ t('problems.checker.back') }}
        </button>
        <button
          v-if="!showAll && results.length > FIRST"
          type="button"
          class="link"
          @click="showAll = true"
        >
          {{ t('problems.checker.showAll', { n: results.length - FIRST }) }}
        </button>
        <button
          type="button"
          class="link"
          @click="answer({ area: null, stage: null })"
        >
          <UIcon
            name="i-tabler-refresh"
            class="size-4"
          />
          {{ t('problems.checker.restart') }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.checker {
  padding: 14px;
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 22px;
}

.head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.lead {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-2);
}

.step {
  flex: none;
  align-self: flex-start;
  font-size: 12px;
  color: var(--text-3);
}

.body {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.q {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
}

.picked {
  margin: -6px 0 12px;
  font-size: 13px;
  color: var(--text-3);
}

.areas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.area {
  min-height: 52px;
  padding: 8px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out);
}

.area:active {
  transform: scale(0.97);
}

.stages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stage-chip {
  min-height: 44px;
  color: var(--text);
}

.stage-chip .grow-icon {
  font-size: 18px;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-top: 10px;
}

.results-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.results-head .q {
  margin: 0;
}

.count {
  font-size: 13px;
  color: var(--text-3);
}

.none {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.results {
  margin-top: 2px;
}
</style>
