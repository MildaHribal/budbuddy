<script setup lang="ts">
import type { Plant, TreatmentPlan } from '~/types/grow'
import { addDays } from '~/utils/date'
import { guessIssue, issueTemplate, planProgress, type IssueId } from '~/utils/treatment'

const props = withDefaults(defineProps<{
  /** limit to one plant (plant page); omit to list every plant (tools page) */
  plant?: Plant | null
  /** issue / plant preselected from a deep link */
  startIssue?: IssueId | null
}>(), { plant: null, startIssue: null })

const { t } = useI18n()
const grow = useGrow()
const care = useCare()
const today = useToday()

const all = computed(() => (grow.state.treatments ?? []).filter(p => grow.getPlant(p.plantId) && (!props.plant || p.plantId === props.plant.id)))
const active = computed(() => all.value.filter(p => p.status === 'active').sort((a, b) => b.startDate.localeCompare(a.startDate)))
const finished = computed(() => all.value.filter(p => p.status !== 'active').sort((a, b) => (b.closedDate ?? '').localeCompare(a.closedDate ?? '')))

// a recent pest entry (or poor health) without a plan → suggest one
const suggestion = computed(() => {
  const p = props.plant
  if (!p || p.archived || active.value.length) return null
  const pest = grow.entriesFor(p.id).find(e => e.type === 'pest' && e.date >= addDays(today.value, -14))
  if (pest && !all.value.some(x => x.sourceEntryId === pest.id)) return { entry: pest, issue: guessIssue(`${pest.product} ${pest.note}`) }
  if (p.health <= 2) return { entry: null, issue: null }
  return null
})

const startOpen = ref(false)
const startPreset = ref<{ issue: IssueId | null, entryId: string | null }>({ issue: null, entryId: null })
function start(issue: IssueId | null = null, entryId: string | null = null) {
  startPreset.value = { issue, entryId }
  startOpen.value = true
}

watch(() => props.startIssue, (v) => {
  if (v) start(v)
}, { immediate: true })

const planOpen = ref(false)
const planId = ref<string | null>(null)
function openPlan(p: TreatmentPlan) {
  planId.value = p.id
  planOpen.value = true
}

function onStarted(p: TreatmentPlan) {
  openPlan(p)
}

const row = (p: TreatmentPlan) => ({
  plan: p,
  issue: issueTemplate(p.issue)!,
  progress: planProgress(p, today.value),
  plantName: grow.getPlant(p.plantId)?.name ?? ''
})

defineExpose({ start })
</script>

<template>
  <section
    v-if="!plant || all.length || suggestion"
    :aria-label="t('care.treat.plans')"
  >
    <div
      v-if="plant"
      class="section-head"
    >
      <h2 class="section-title">
        <GrowIcon
          name="pest"
          class="head-glyph"
        /> {{ t('care.treat.plans') }}
      </h2>
      <button
        v-if="!plant.archived"
        type="button"
        class="link"
        @click="start()"
      >
        {{ t('care.treat.startShort') }}
      </button>
    </div>

    <button
      v-if="suggestion"
      type="button"
      class="card suggest"
      @click="start(suggestion.issue, suggestion.entry?.id ?? null)"
    >
      <span
        class="care-tile"
        style="--tone: #f0905a"
        aria-hidden="true"
      ><GrowIcon name="pest" /></span>
      <span class="suggest-text">
        <strong>{{ t('care.treat.start') }}</strong>
        <span>{{ t('care.treat.prompt') }}</span>
      </span>
      <UIcon
        name="i-tabler-chevron-right"
        class="size-5 go"
      />
    </button>

    <template v-if="!plant">
      <div class="section-head">
        <h2 class="section-title">
          {{ t('care.treat.active') }}
        </h2>
        <button
          type="button"
          class="link"
          @click="start()"
        >
          {{ t('care.treat.startShort') }}
        </button>
      </div>
      <EmptyState
        v-if="!active.length"
        icon="pest"
        :title="t('care.treat.emptyTitle')"
        :text="t('care.treat.emptyText')"
      />
    </template>

    <div
      v-if="active.length"
      class="card plans"
    >
      <button
        v-for="r in active.map(row)"
        :key="r.plan.id"
        type="button"
        class="plan-row"
        @click="openPlan(r.plan)"
      >
        <span class="plan-text">
          <strong>{{ care.issueName(r.issue.id) }}</strong>
          <span class="num">
            <template v-if="!plant">{{ r.plantName }} · </template>{{ t('care.treat.dayN', { n: r.progress.day }) }} · {{ t('care.treat.progress', { done: r.progress.done, total: r.progress.total }) }}
          </span>
          <span
            v-if="r.progress.checkDue"
            class="due"
          >{{ t('care.treat.checkDue') }}</span>
        </span>
        <svg
          class="plan-ring"
          viewBox="0 0 28 28"
          aria-hidden="true"
        >
          <circle
            cx="14"
            cy="14"
            r="11"
          />
          <circle
            v-if="r.progress.done"
            class="ring-fill"
            cx="14"
            cy="14"
            r="11"
            :stroke-dasharray="`${(r.progress.total ? r.progress.done / r.progress.total : 0) * 69.1} 69.1`"
          />
        </svg>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 go"
        />
      </button>
    </div>

    <template v-if="finished.length">
      <h3 class="sub-title">
        {{ t('care.treat.history') }}
      </h3>
      <div class="card plans">
        <button
          v-for="r in finished.map(row)"
          :key="r.plan.id"
          type="button"
          class="plan-row"
          @click="openPlan(r.plan)"
        >
          <span class="plan-text">
            <strong>{{ care.issueName(r.issue.id) }}</strong>
            <span class="num">
              <template v-if="!plant">{{ r.plantName }} · </template>{{ r.plan.status === 'resolved' ? t('care.treat.resolved') : t('care.treat.stopped') }}<template v-if="r.plan.closedDate"> · {{ formatDate(r.plan.closedDate, { day: 'numeric', month: 'short' }) }}</template>
            </span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 go"
          />
        </button>
      </div>
    </template>

    <CareTreatmentStartSheet
      v-model:open="startOpen"
      :plant-id="plant?.id ?? null"
      :issue="startPreset.issue"
      :source-entry-id="startPreset.entryId"
      @started="onStarted"
    />
    <CareTreatmentPlanSheet
      v-model:open="planOpen"
      :plan-id="planId"
    />
  </section>
</template>

<style scoped src="./care.css"></style>

<style scoped>
.head-glyph {
  color: #f0905a;
}

.suggest {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  color: var(--text);
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out);
}

.suggest:active {
  transform: scale(0.985);
}

.suggest-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggest-text strong {
  font-size: 15px;
  font-weight: 600;
}

.suggest-text span {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-2);
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}

.plans {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.suggest + .plans,
.empty + .plans {
  margin-top: 10px;
}

.plan-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 10px 12px 10px 14px;
  border: 0;
  background: none;
  color: var(--text);
  text-align: left;
  transition: background var(--dur-fast) ease;
}

.plan-row + .plan-row {
  border-top: 1px solid var(--line);
}

.plan-row:active {
  background: var(--surface-2);
}

.plan-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plan-text strong {
  font-size: 15px;
  font-weight: 600;
}

.plan-text span {
  font-size: 12px;
  color: var(--text-3);
}

.plan-text .due {
  font-weight: 600;
  color: var(--amber);
}

.plan-ring {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  transform: rotate(-90deg);
}

.plan-ring circle {
  fill: none;
  stroke: var(--track);
  stroke-width: 3;
}

.plan-ring .ring-fill {
  stroke: var(--green);
  stroke-linecap: round;
  transition: stroke-dasharray var(--dur-slow) var(--ease-out);
}

.sub-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}
</style>
