<script setup lang="ts">
import type { TreatmentPlan } from '~/types/grow'
import { getProblem } from '~/utils/problems'
import { CATEGORY_META, SEVERITY_TONE, TREATMENT_FOR } from '~/utils/problems/atlas'
import { photosFor } from '~/utils/problems/photos'

const { t } = useI18n()
const route = useRoute()
const grow = useGrow()

const problem = computed(() => getProblem(String(route.params.id)) ?? null)
useHead({ title: () => problem.value?.name ?? t('problems.title') })

const meta = computed(() => (problem.value ? CATEGORY_META[problem.value.category] : null))
const photos = computed(() => (problem.value ? photosFor(problem.value.id) : []))
const lookalikes = computed(() => (problem.value?.lookalikes ?? [])
  .map(l => ({ ...l, problem: getProblem(l.id) }))
  .filter(l => l.problem))
const stagesLine = computed(() => {
  const s = problem.value?.stages ?? []
  return s.length ? s.map(id => stageInfo(id).label).join(', ') : t('problems.detail.anyStage')
})
const guideLink = computed(() => {
  const g = problem.value?.guide
  if (!g) return null
  return g.startsWith('/') ? g : `/guide/${g}`
})

// confirm checklist: local to this visit
const ticked = ref(new Set<number>())
watch(() => route.params.id, () => (ticked.value = new Set()))
function toggle(i: number) {
  const next = new Set(ticked.value)
  if (!next.delete(i)) next.add(i)
  ticked.value = next
}

const plants = computed(() => grow.state.plants.filter(p => !p.archived))
const issue = computed(() => (problem.value ? TREATMENT_FOR[problem.value.id] ?? null : null))
const startOpen = ref(false)
const planOpen = ref(false)
const planId = ref<string | null>(null)
function onStarted(p: TreatmentPlan) {
  planId.value = p.id
  planOpen.value = true
}
</script>

<template>
  <div>
    <AppHeader
      :title="problem?.name ?? t('problems.detail.notFoundTitle')"
      :subtitle="problem ? t(`problems.categories.${problem.category}`) : undefined"
      back
    />

    <div
      v-if="!problem || !meta"
      class="page"
    >
      <EmptyState
        icon="pest"
        :title="t('problems.detail.notFoundTitle')"
        :text="t('problems.detail.notFoundText')"
      >
        <NuxtLink
          to="/problems"
          class="btn btn-soft"
        >
          {{ t('problems.detail.backToAtlas') }}
        </NuxtLink>
      </EmptyState>
    </div>

    <div
      v-else
      :key="problem.id"
      class="page rise"
    >
      <ProblemsProblemGallery
        v-if="photos.length"
        :photos="photos"
      />

      <section class="intro">
        <div class="tags">
          <span
            class="badge"
            :style="{ color: meta.tone }"
          >
            <GrowIcon
              :name="meta.glyph"
              class="text-[14px]"
            />
            {{ t(`problems.categories.${problem.category}`) }}
          </span>
          <span
            class="badge"
            :style="{ color: SEVERITY_TONE[problem.severity] }"
          >{{ t(`problems.severity.${problem.severity}`) }}</span>
          <span class="stages">{{ stagesLine }}</span>
        </div>
        <p class="summary">
          {{ problem.summary }}
        </p>
        <p
          v-if="problem.aka?.length"
          class="aka"
        >
          {{ t('problems.detail.aka', { list: problem.aka.join(', ') }) }}
        </p>
      </section>

      <section
        v-if="problem.symptoms.length"
        aria-labelledby="symptoms-h"
      >
        <div class="section-head">
          <h2
            id="symptoms-h"
            class="section-title"
          >
            {{ t('problems.detail.symptoms') }}
          </h2>
        </div>
        <ul class="card rows">
          <li
            v-for="(s, i) in problem.symptoms"
            :key="i"
            class="row"
          >
            <span
              class="dot"
              aria-hidden="true"
            />
            <span>{{ s }}</span>
          </li>
        </ul>
      </section>

      <section
        v-if="problem.confirm.length"
        aria-labelledby="confirm-h"
      >
        <div class="section-head">
          <h2
            id="confirm-h"
            class="section-title"
          >
            {{ t('problems.detail.confirm') }}
          </h2>
          <span class="section-meta num">{{ t('problems.detail.confirmed', { done: ticked.size, total: problem.confirm.length }) }}</span>
        </div>
        <p class="hint">
          {{ t('problems.detail.confirmHint') }}
        </p>
        <ul class="card rows">
          <li
            v-for="(c, i) in problem.confirm"
            :key="i"
          >
            <button
              type="button"
              class="check"
              role="checkbox"
              :aria-checked="ticked.has(i)"
              @click="toggle(i)"
            >
              <span
                class="box"
                aria-hidden="true"
              >
                <svg viewBox="0 0 12 12">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                </svg>
              </span>
              <span>{{ c }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="lookalikes.length"
        aria-labelledby="similar-h"
      >
        <div class="section-head">
          <h2
            id="similar-h"
            class="section-title"
          >
            {{ t('problems.detail.lookalikes') }}
          </h2>
        </div>
        <div class="similar">
          <NuxtLink
            v-for="l in lookalikes"
            :key="l.id"
            :to="`/problems/${l.id}`"
            class="card similar-card"
          >
            <span class="similar-text">
              <span class="similar-name">{{ l.problem!.name }}</span>
              <span class="similar-tell">{{ l.howToTell }}</span>
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="chev"
            />
          </NuxtLink>
        </div>
      </section>

      <section
        v-if="problem.causes.length"
        aria-labelledby="causes-h"
      >
        <div class="section-head">
          <h2
            id="causes-h"
            class="section-title"
          >
            {{ t('problems.detail.causes') }}
          </h2>
        </div>
        <ul class="card rows">
          <li
            v-for="(c, i) in problem.causes"
            :key="i"
            class="row"
          >
            <span
              class="dot"
              aria-hidden="true"
            />
            <span>{{ c }}</span>
          </li>
        </ul>
      </section>

      <section
        v-if="problem.fix.length"
        aria-labelledby="fix-h"
      >
        <div class="section-head">
          <h2
            id="fix-h"
            class="section-title"
          >
            {{ t('problems.detail.fix') }}
          </h2>
        </div>
        <ol class="card rows steps">
          <li
            v-for="(f, i) in problem.fix"
            :key="i"
            class="row"
          >
            <span
              class="n num"
              aria-hidden="true"
            >{{ i + 1 }}</span>
            <span>{{ f }}</span>
          </li>
        </ol>
      </section>

      <template v-if="plants.length">
        <button
          v-if="issue"
          type="button"
          class="card action"
          @click="startOpen = true"
        >
          <span
            class="action-tile"
            aria-hidden="true"
          >
            <UIcon name="i-tabler-list-check" />
          </span>
          <span class="action-text">
            <span class="action-title">{{ t('problems.detail.treatTitle') }}</span>
            <span class="action-sub">{{ t('problems.detail.treatText') }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="chev"
          />
        </button>
        <div
          v-else
          class="card action note"
        >
          <span
            class="action-tile"
            aria-hidden="true"
          >
            <GrowIcon name="note" />
          </span>
          <span class="action-text">
            <span class="action-title">{{ t('problems.detail.noteTitle') }}</span>
            <span class="action-sub">{{ t('problems.detail.noteText') }}</span>
            <span class="chips plant-chips">
              <NuxtLink
                v-for="p in plants"
                :key="p.id"
                :to="`/plants/${p.id}`"
                class="chip"
              >{{ p.name }}</NuxtLink>
            </span>
          </span>
        </div>
      </template>

      <section
        v-if="problem.prevent.length"
        aria-labelledby="prevent-h"
      >
        <div class="section-head">
          <h2
            id="prevent-h"
            class="section-title"
          >
            {{ t('problems.detail.prevent') }}
          </h2>
        </div>
        <ul class="card rows">
          <li
            v-for="(p, i) in problem.prevent"
            :key="i"
            class="row"
          >
            <span
              class="dot"
              aria-hidden="true"
            />
            <span>{{ p }}</span>
          </li>
        </ul>
      </section>

      <NuxtLink
        v-if="guideLink"
        :to="guideLink"
        class="card guide"
      >
        <span
          class="guide-tile"
          aria-hidden="true"
        >
          <GrowIcon name="guide" />
        </span>
        <span class="action-title">{{ t('problems.detail.guide') }}</span>
        <UIcon
          name="i-tabler-chevron-right"
          class="chev"
        />
      </NuxtLink>
    </div>

    <CareTreatmentStartSheet
      v-if="issue"
      v-model:open="startOpen"
      :issue="issue"
      @started="onStarted"
    />
    <CareTreatmentPlanSheet
      v-model:open="planOpen"
      :plan-id="planId"
    />
  </div>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.stages {
  font-size: 12px;
  color: var(--text-3);
}

.summary {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
}

.aka {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}

.hint {
  margin: -4px 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-3);
}

.rows {
  margin: 0;
  padding: 0 14px;
  list-style: none;
}

.rows > li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  font-size: 15px;
  line-height: 1.45;
}

.dot {
  flex: none;
  width: 6px;
  height: 6px;
  margin: 8px 4px 0 2px;
  border-radius: 50%;
  background: var(--text-3);
}

.steps .n {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--green);
  font-size: 13px;
  font-weight: 600;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 13px 0;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 15px;
  line-height: 1.45;
  text-align: left;
}

.box {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--line-strong);
  transition: background var(--dur) ease, border-color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.box svg {
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

.check:active .box {
  transform: scale(0.9);
}

.check[aria-checked="true"] .box {
  background: var(--green);
  border-color: var(--green);
}

.check[aria-checked="true"] .box svg {
  opacity: 1;
}

.similar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.similar-card,
.action,
.guide {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.similar-card:active,
button.action:active,
.guide:active {
  transform: scale(0.985);
}

.similar-text,
.action-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.similar-name,
.action-title {
  font-size: 15px;
  font-weight: 600;
}

.similar-tell,
.action-sub {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.chev {
  flex: none;
  font-size: 18px;
  color: var(--text-3);
}

.action {
  width: 100%;
  font: inherit;
  text-align: left;
}

button.action {
  border-color: var(--accent-line);
}

.action.note {
  align-items: flex-start;
}

.action-tile,
.guide-tile {
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

.plant-chips {
  flex-wrap: wrap;
  margin-top: 10px;
  overflow: visible;
}

.guide {
  min-height: 68px;
}

.guide .action-title {
  flex: 1;
}
</style>
