<script lang="ts">
</script>

<script setup lang="ts">
import type { EntryType, JournalEntry, Plant, Task } from '~/types/grow'

let settledOnce = false

const { t, locale } = useI18n()

useHead({ title: () => t('home.title') })

const grow = useGrow()
const { state } = grow
const { notify } = useNotify()

const today = useToday()

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = t(`home.greeting.${h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}`)
  const raw = state.settings.growerName.trim()
  const name = raw ? (locale.value === 'cs' ? czechVocative(raw) : raw) : t('home.greeting.defaultName')
  return name ? t('home.greeting.line', { part, name }) : part
})
const initial = computed(() => state.settings.growerName?.trim().charAt(0).toUpperCase() ?? '')

const settle = !settledOnce
onMounted(() => {
  settledOnce = true
})

// Quick lamp flash on the top edge when something gets logged or ticked off.
const pulse = ref(0)
function pulseLamp() {
  pulse.value++
}

const growing = computed(() => state.plants.filter(p => isGrowing(p)))
const postHarvest = computed(() => state.plants.filter(p => !p.archived && !isGrowing(p)))
const activePlants = computed(() => [...growing.value, ...postHarvest.value])

const avgHealth = computed(() => {
  const list = growing.value
  if (!list.length) return null
  return list.reduce((s, p) => s + p.health, 0) / list.length
})

const entriesThisWeek = computed(() => {
  const from = addDays(today.value, -6)
  return state.entries.filter(e => e.date >= from && e.date <= today.value).length
})

// ── Light schedule ────────────────────────────────────────────────
const PRESETS = [18, 20, 12, 24] as const
const lightOpen = ref(false)
const draftOn = ref('06:00')
const draftHours = ref<number | ''>(18)
const hoursValid = computed(() => draftHours.value !== '' && Number.isInteger(draftHours.value) && draftHours.value >= 0 && draftHours.value <= 24)
const onValid = computed(() => /^\d{2}:\d{2}$/.test(draftOn.value))

function openLight() {
  draftOn.value = state.settings.lightsOn
  draftHours.value = state.settings.lightHours
  lightOpen.value = true
}

function saveLight() {
  if (!hoursValid.value || !onValid.value) return
  grow.updateSettings({ lightsOn: draftOn.value, lightHours: Number(draftHours.value) })
  lightOpen.value = false
  pulseLamp()
  notify(t('home.light.saved'))
}

// ── Tasks ─────────────────────────────────────────────────────────
const todaysTasks = computed(() => state.tasks
  .filter(x => x.date === today.value || (x.date < today.value && !x.done))
  .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)))
const doneCount = computed(() => todaysTasks.value.filter(x => x.done).length)
const taskPct = computed(() => (todaysTasks.value.length ? Math.round((doneCount.value / todaysTasks.value.length) * 100) : 0))

const adding = ref(false)
const newTask = ref('')
const newTaskPlant = ref<string | null>(null)
const taskInput = ref<HTMLInputElement | null>(null)

async function toggleAdding() {
  adding.value = !adding.value
  if (adding.value) {
    await nextTick()
    taskInput.value?.focus()
  }
}

function addTask() {
  const title = newTask.value.trim()
  if (!title) return
  grow.addTask(title, today.value, newTaskPlant.value)
  newTask.value = ''
  taskInput.value?.focus()
}

function toggleTask(id: string, done: boolean) {
  grow.updateTask(id, { done })
  if (done) pulseLamp()
}

function removeTask(id: string) {
  const removed = grow.deleteTask(id)
  if (removed) notify(t('home.tasks.deleted'), { tone: 'info', action: { label: t('common.undo'), run: () => grow.restoreTask(removed) } })
}

const plantName = (id: string | null) => (id ? grow.getPlant(id)?.name : undefined)
const daysLabel = (n: number) => t('common.days', { n })

// ── Needs attention ───────────────────────────────────────────────
interface WaterDue {
  plant: Plant
  overdueBy: number
}

const waterDue = computed<WaterDue[]>(() => activePlants.value
  .flatMap((p) => {
    const w = grow.wateringStatus(p, today.value)
    return w && w.dueIn <= 0 ? [{ plant: p, overdueBy: -w.dueIn }] : []
  })
  .sort((a, b) => b.overdueBy - a.overdueBy))

type TodayRow
  = | { kind: 'water', key: string, rank: number, water: WaterDue }
    | { kind: 'task', key: string, rank: number, task: Task }

const TODAY_CAP = 3
const todayExpanded = ref(false)
// overdue first, done last; water before tasks within a rank
const todayRows = computed<TodayRow[]>(() => [
  ...waterDue.value.map(w => ({ kind: 'water' as const, key: `w-${w.plant.id}`, rank: w.overdueBy ? 0 : 1, water: w })),
  ...todaysTasks.value.map(task => ({ kind: 'task' as const, key: task.id, rank: task.done ? 2 : task.date < today.value ? 0 : 1, task }))
].sort((a, b) => a.rank - b.rank))
const hiddenRows = computed(() => Math.max(0, todayRows.value.length - TODAY_CAP))
const visibleRows = computed(() => (todayExpanded.value ? todayRows.value : todayRows.value.slice(0, TODAY_CAP)))

const openCount = computed(() => waterDue.value.length + todaysTasks.value.length - doneCount.value)
const rowCount = computed(() => waterDue.value.length + todaysTasks.value.length)

function stageHint(p: Plant): string | null {
  if (!isGrowing(p)) return null
  const prog = stageProgress(p, today.value)
  const next = nextStage(p.stage)
  if (!next || prog.dayInStage <= prog.stageDays * 1.25) return null
  return p.stage === 'flowering' ? t('home.garden.readyHarvest') : t('home.garden.readyFor', { stage: stageInfo(next).label.toLowerCase() })
}

function harvestChip(p: Plant): { text: string, late: boolean } | null {
  const e = harvestEstimate(p, today.value)
  if (!e) return null
  if (e.status === 'past') return { text: t('home.garden.harvestLate'), late: true }
  if (e.status === 'window') return { text: t('home.garden.harvestNow'), late: false }
  const mid = Math.round((e.inMin + e.inMax) / 2)
  return mid >= 14
    ? { text: t('home.garden.harvestWeeks', { n: Math.round(mid / 7) }), late: false }
    : { text: t('home.garden.harvestDays', { n: mid }), late: false }
}

function plantRow(p: Plant) {
  const prog = stageProgress(p, today.value)
  const harvest = harvestChip(p)
  return {
    ...prog,
    week: Math.max(1, Math.ceil(prog.dayInStage / 7)),
    weeks: Math.max(1, Math.ceil(prog.stageDays / 7)),
    hint: harvest ? null : stageHint(p),
    harvest
  }
}

const sheetOpen = ref(false)
const sheetPlant = ref<string>('')
const sheetType = ref<EntryType>('water')

function quickLog(plant: Plant, type: EntryType) {
  sheetPlant.value = plant.id
  sheetType.value = type
  sheetOpen.value = true
}

// ── Recent activity ───────────────────────────────────────────────
const recent = computed<JournalEntry[]>(() => [...state.entries]
  .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  .slice(0, 4))

// ── Tip ───────────────────────────────────────────────────────────
const tips = computed(() => {
  const active = new Set(activePlants.value.map(p => p.stage))
  const all = stages()
  const fromStages = all.filter(s => active.has(s.id)).flatMap(s => s.tips.map(text => ({ stage: s, text })))
  return fromStages.length ? fromStages : all.slice(0, 4).flatMap(s => s.tips.map(text => ({ stage: s, text })))
})
const tipIndex = ref(Math.floor(Math.random() * 100))
const tip = computed(() => tips.value[tipIndex.value % tips.value.length]!)
</script>

<template>
  <div>
    <div
      v-if="pulse"
      :key="pulse"
      class="lamp-pulse"
      aria-hidden="true"
    />

    <div
      class="page dash"
      :class="{ settle }"
    >
      <header class="dash-head">
        <div class="dash-hello">
          <p class="dash-date">
            {{ formatDate(today, { weekday: 'short', day: 'numeric', month: 'short' }) }}<template v-if="state.settings.demo">
              <span aria-hidden="true"> · </span><span class="demo-tag">{{ t('home.demo') }}</span>
            </template>
          </p>
          <h1>{{ greeting }}</h1>
        </div>
        <NuxtLink
          to="/settings"
          class="avatar"
          :aria-label="t('home.settings')"
        >
          <span v-if="initial">{{ initial }}</span>
          <UIcon
            v-else
            name="i-tabler-settings"
            class="size-5"
          />
        </NuxtLink>
      </header>

      <section :aria-label="t('home.lightCycle')">
        <button
          type="button"
          class="ring-btn"
          aria-haspopup="dialog"
          :aria-label="t('home.editLight')"
          @click="openLight"
        >
          <PhotoperiodRing
            :lights-on="state.settings.lightsOn"
            :hours="state.settings.lightHours"
            :size="148"
          />
        </button>
      </section>

      <section aria-labelledby="tasks-title">
        <div class="section-head">
          <h2
            id="tasks-title"
            class="section-title"
          >
            {{ t('common.today') }}
          </h2>
          <div class="head-side">
            <span
              v-if="rowCount"
              class="section-meta num"
            >{{ openCount ? t('home.tasks.left', { open: openCount, total: rowCount }) : t('home.tasks.allDone') }}</span>
            <button
              type="button"
              class="icon-btn accent"
              :aria-label="adding ? t('common.close') : t('home.tasks.add')"
              :aria-expanded="adding"
              @click="toggleAdding"
            >
              <UIcon
                :name="adding ? 'i-tabler-x' : 'i-tabler-plus'"
                class="size-5"
              />
            </button>
          </div>
        </div>

        <form
          v-if="adding"
          class="task-add"
          @submit.prevent="addTask"
        >
          <input
            ref="taskInput"
            v-model="newTask"
            class="input"
            :placeholder="t('home.tasks.placeholder')"
            maxlength="120"
            :aria-label="t('home.tasks.task')"
          >
          <div class="task-add-row">
            <select
              v-model="newTaskPlant"
              class="input"
              :aria-label="t('home.tasks.plantOptional')"
            >
              <option :value="null">
                {{ t('home.tasks.noPlant') }}
              </option>
              <option
                v-for="p in activePlants"
                :key="p.id"
                :value="p.id"
              >
                {{ p.name }}
              </option>
            </select>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!newTask.trim()"
            >
              {{ t('common.add') }}
            </button>
          </div>
        </form>

        <EmptyState
          v-if="!rowCount && !adding"
          icon="note"
          :title="t('home.tasks.emptyTitle')"
          :text="t('home.tasks.emptyText')"
        />

        <div
          v-else-if="rowCount"
          class="card today"
        >
          <div
            v-if="todaysTasks.length"
            class="progress today-progress"
            role="progressbar"
            :aria-label="t('home.tasks.done')"
            :aria-valuenow="taskPct"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div :style="{ width: `${taskPct}%` }" />
          </div>
          <TransitionGroup
            name="task"
            tag="ul"
            class="rows"
          >
            <template
              v-for="r in visibleRows"
              :key="r.key"
            >
              <li
                v-if="r.kind === 'water'"
                class="row"
              >
                <span class="row-lead water">
                  <GrowIcon name="water" />
                </span>
                <NuxtLink
                  :to="`/plants/${r.water.plant.id}`"
                  class="row-text"
                >
                  <span class="row-title">{{ t('home.tasks.water', { name: r.water.plant.name }) }}</span>
                  <span
                    v-if="!r.water.overdueBy"
                    class="row-meta"
                  >{{ t('home.tasks.dueToday') }}</span>
                </NuxtLink>
                <span
                  v-if="r.water.overdueBy"
                  class="badge badge-attention"
                >{{ t('home.tasks.overdueBy', { days: daysLabel(r.water.overdueBy) }) }}</span>
                <button
                  type="button"
                  class="log-btn"
                  :aria-label="t('home.tasks.logWater', { name: r.water.plant.name })"
                  @click="quickLog(r.water.plant, 'water')"
                >
                  {{ t('home.tasks.log') }}
                </button>
              </li>
              <li
                v-else
                class="row task"
                :class="{ done: r.task.done }"
              >
                <button
                  type="button"
                  class="check"
                  role="checkbox"
                  :aria-checked="r.task.done"
                  :aria-label="r.task.title"
                  @click="toggleTask(r.task.id, !r.task.done)"
                >
                  <span class="check-dot">
                    <svg
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 6.5l2.3 2.3 4.7-5"
                        pathLength="1"
                      />
                    </svg>
                  </span>
                </button>
                <div class="row-text">
                  <span class="row-title"><span class="strike">{{ r.task.title }}</span></span>
                  <span
                    v-if="plantName(r.task.plantId)"
                    class="row-meta"
                  >{{ plantName(r.task.plantId) }}</span>
                </div>
                <span
                  v-if="r.task.date < today && !r.task.done"
                  class="badge badge-attention"
                >{{ t('home.tasks.overdue', { when: formatRelativeDay(r.task.date) }) }}</span>
                <button
                  type="button"
                  class="row-delete"
                  :aria-label="t('home.tasks.delete')"
                  @click="removeTask(r.task.id)"
                >
                  <UIcon
                    name="i-tabler-trash"
                    class="size-4"
                  />
                </button>
              </li>
            </template>
          </TransitionGroup>
          <button
            v-if="hiddenRows"
            type="button"
            class="more-rows"
            :aria-expanded="todayExpanded"
            @click="todayExpanded = !todayExpanded"
          >
            {{ todayExpanded ? t('home.tasks.less') : t('home.tasks.more', { n: hiddenRows }) }}
            <UIcon
              :name="todayExpanded ? 'i-tabler-chevron-up' : 'i-tabler-chevron-down'"
              class="size-4"
            />
          </button>
        </div>
      </section>

      <section aria-labelledby="plants-title">
        <div class="section-head">
          <h2
            id="plants-title"
            class="section-title"
          >
            {{ t('home.garden.title') }}
          </h2>
          <div class="head-side">
            <span
              v-if="activePlants.length"
              class="section-meta num"
            >{{ t('common.plants', { n: activePlants.length }) }}</span>
            <NuxtLink
              to="/plants"
              class="link"
            >
              {{ t('common.viewAll') }} <UIcon
                name="i-tabler-chevron-right"
                class="size-4"
              />
            </NuxtLink>
          </div>
        </div>

        <EmptyState
          v-if="!activePlants.length"
          icon="seedling"
          :title="t('home.garden.emptyTitle')"
          :text="t('home.garden.emptyText')"
        >
          <NuxtLink
            to="/plants/new"
            class="btn btn-soft"
          >
            <UIcon
              name="i-tabler-plus"
              class="size-4"
            /> {{ t('home.garden.addPlant') }}
          </NuxtLink>
        </EmptyState>

        <div
          v-else
          class="garden"
        >
          <NuxtLink
            v-for="p in activePlants"
            :key="p.id"
            :to="`/plants/${p.id}`"
            class="card plant"
          >
            <span class="plant-photo">
              <PlantPhoto
                :photo-id="p.photoId"
                :stage="p.stage"
                :alt="p.name"
              />
            </span>
            <span class="plant-body">
              <span class="plant-name">{{ p.name }}</span>
              <span class="plant-sub">
                {{ stageInfo(p.stage).label }} · {{ t('home.garden.day', { n: plantRow(p).age }) }}<template v-if="p.strain"> · {{ p.strain }}</template>
              </span>
              <span
                v-if="plantRow(p).hint"
                class="plant-hint"
              >
                <GrowIcon :name="stageInfo(nextStage(p.stage) ?? p.stage).glyph" />
                {{ plantRow(p).hint }}
              </span>
              <span class="progress plant-bar">
                <span
                  class="bar-fill"
                  :style="{ width: `${plantRow(p).percent}%` }"
                />
              </span>
              <span class="plant-meta num">
                <span>{{ t('home.garden.week', { week: plantRow(p).week, weeks: plantRow(p).weeks }) }}</span>
                <span
                  v-if="plantRow(p).harvest"
                  class="eta-chip"
                  :class="{ late: plantRow(p).harvest!.late }"
                >
                  <GrowIcon name="harvest" />{{ plantRow(p).harvest!.text }}
                </span>
                <span v-else>{{ plantRow(p).percent }}%</span>
              </span>
            </span>
          </NuxtLink>
          <NuxtLink
            to="/plants/new"
            class="add-plant"
          >
            <UIcon
              name="i-tabler-plus"
              class="size-5"
            />
            {{ t('home.garden.addPlant') }}
          </NuxtLink>
        </div>
      </section>

      <NuxtLink
        to="/stats"
        class="card week"
        :aria-label="t('home.stats.open')"
      >
        <span class="week-cell">
          <strong class="num">{{ growing.length }}</strong>
          <span>{{ t('home.stats.growing') }}</span>
        </span>
        <span class="week-cell">
          <strong>
            <i
              v-if="avgHealth"
              class="health-dot"
              :style="{ background: healthInfo(avgHealth).color }"
            />{{ avgHealth ? healthInfo(avgHealth).label : '–' }}
          </strong>
          <span>{{ t('home.stats.avgHealth') }}</span>
        </span>
        <span class="week-cell">
          <strong class="num">{{ entriesThisWeek }}</strong>
          <span>{{ t('home.stats.logs') }}</span>
        </span>
        <span class="week-go">
          {{ t('home.stats.go') }}
          <UIcon
            name="i-tabler-chevron-right"
            class="size-4"
          />
        </span>
      </NuxtLink>

      <section
        v-if="recent.length"
        aria-labelledby="recent-title"
      >
        <div class="section-head">
          <h2
            id="recent-title"
            class="section-title"
          >
            {{ t('home.recent.title') }}
          </h2>
        </div>
        <div class="card recent">
          <NuxtLink
            v-for="e in recent"
            :key="e.id"
            :to="`/plants/${e.plantId}`"
            class="recent-item"
          >
            <GrowIcon
              :name="entryInfo(e.type).glyph"
              class="recent-glyph"
              :style="{ color: entryInfo(e.type).color }"
            />
            <span class="recent-text">
              <strong>{{ e.type === 'stage' && e.stage ? t('home.recent.movedTo', { stage: stageInfo(e.stage).label }) : entryInfo(e.type).verb }}</strong>
              <span>{{ plantName(e.plantId) }}<template v-if="entrySummary(e)"> · {{ entrySummary(e) }}</template></span>
            </span>
            <span class="recent-date">{{ formatRelativeDay(e.date) }}</span>
          </NuxtLink>
        </div>
      </section>

      <button
        type="button"
        class="tip"
        @click="tipIndex++"
      >
        <GrowIcon
          name="lamp"
          class="tip-glyph"
        />
        <span class="tip-body">
          <span class="tip-head">
            <span class="tip-title">{{ t('home.tip.title') }}</span>
            <span
              class="tip-stage"
              :style="{ color: tip.stage.color }"
            >{{ tip.stage.label }}</span>
          </span>
          <span class="tip-text">{{ tip.text }}</span>
          <span class="tip-next">{{ t('home.tip.next') }}</span>
        </span>
      </button>
    </div>

    <EntrySheet
      v-if="sheetPlant"
      v-model:open="sheetOpen"
      :plant-id="sheetPlant"
      :type="sheetType"
      :date="today"
      @saved="pulseLamp"
    />

    <BottomSheet
      v-model:open="lightOpen"
      :title="t('home.light.title')"
    >
      <form
        id="light-form"
        class="form-stack"
        @submit.prevent="saveLight"
      >
        <PhotoperiodRing
          :lights-on="onValid ? draftOn : '00:00'"
          :hours="hoursValid ? Number(draftHours) : 0"
          :size="128"
        />
        <div
          class="chips presets"
          role="group"
          :aria-label="t('home.light.presets')"
        >
          <button
            v-for="h in PRESETS"
            :key="h"
            type="button"
            class="chip num"
            :aria-pressed="draftHours === h"
            @click="draftHours = h"
          >
            {{ h }}/{{ 24 - h }}
          </button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('home.light.on') }}</span>
            <input
              v-model="draftOn"
              type="time"
              class="input num"
              :class="{ invalid: !onValid }"
              required
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('home.light.hours') }}</span>
            <input
              v-model.number="draftHours"
              type="number"
              inputmode="numeric"
              min="0"
              max="24"
              step="1"
              class="input num"
              :class="{ invalid: !hoursValid }"
              :aria-invalid="!hoursValid"
            >
            <span
              v-if="!hoursValid"
              class="field-error"
            >{{ t('home.light.hoursError') }}</span>
          </label>
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="lightOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="light-form"
          class="btn btn-primary"
          :disabled="!hoursValid || !onValid"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
/* Authored entrance: sections settle into the light after the lamp comes on */
.settle > * {
  animation: settle 480ms var(--ease-out) both;
  animation-delay: 160ms;
}

.settle > :nth-child(2) { animation-delay: 220ms; }
.settle > :nth-child(3) { animation-delay: 290ms; }
.settle > :nth-child(4) { animation-delay: 360ms; }
.settle > :nth-child(n + 5) { animation-delay: 420ms; }

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: brightness(0.45);
  }
}

.lamp-pulse {
  position: fixed;
  top: 0;
  left: 50%;
  z-index: 61;
  width: 260px;
  height: 140px;
  margin-left: -130px;
  background: radial-gradient(50% 60% at 50% 0%, rgba(255, 226, 170, 0.5) 0%, rgba(255, 210, 138, 0.16) 45%, transparent 80%);
  pointer-events: none;
  opacity: 0;
  transform-origin: top;
  animation: lamp-pulse 620ms var(--ease-out) forwards;
}

@keyframes lamp-pulse {
  0% { opacity: 0; transform: scaleY(0.5); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: scaleY(1.1); }
}

.dash {
  padding-top: calc(18px + var(--safe-top));
}

/* Header */
.dash-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: -8px;
}

.dash-hello {
  min-width: 0;
}

.dash-date {
  margin: 0 0 2px;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--text-3);
}

.demo-tag {
  color: var(--lamp);
  font-weight: 500;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight);
  color: var(--lamp);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.avatar:active {
  transform: scale(0.94);
}

/* Ring */
.ring-btn {
  position: relative;
  display: block;
  width: 100%;
  margin-bottom: -14px;
  padding: 4px 0;
  border: 0;
  border-radius: var(--radius);
  background: none;
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out);
}

.ring-btn:active {
  transform: scale(0.985);
}

/* Section heads */
.head-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-head:has(.icon-btn) {
  align-items: center;
}

/* Today */
.task-add {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.task-add-row {
  display: flex;
  gap: 8px;
}

.task-add-row select {
  flex: 1;
}

.today {
  position: relative;
  overflow: hidden;
}

.today-progress {
  height: 2px;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.today-progress > div {
  box-shadow: var(--glow-leaf);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rows + .rows {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 48px;
  padding: 0 6px 0 4px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row-lead,
.check {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.row-lead {
  font-size: 22px;
}

.row-lead.water {
  color: var(--info);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 4px;
  color: inherit;
  text-decoration: none;
}

.row-title {
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.row-meta {
  font-size: 12px;
  color: var(--text-3);
}

.log-btn {
  position: relative;
  min-width: 56px;
  height: 36px;
  margin: 4px 0;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--accent-line);
  background: var(--accent-soft);
  color: var(--leaf);
  font-size: 13px;
  font-weight: 600;
  transition: transform var(--dur-fast) var(--ease-out);
}

/* keeps a 44px hit area around the compact pill */
.log-btn::after {
  content: '';
  position: absolute;
  inset: -4px 0;
}

.log-btn:active {
  transform: scale(0.95);
}

.badge-attention {
  flex-shrink: 0;
}

.check {
  border: 0;
  background: none;
  padding: 0;
}

.check-dot {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid #5a6358;
  transition: background var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.check-dot svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--on-accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.check-dot path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset var(--dur-fast) ease;
}

.check:active .check-dot {
  transform: scale(0.88);
}

.done .check-dot {
  background: var(--leaf);
  border-color: var(--leaf);
  box-shadow: var(--glow-leaf);
  animation: check-pop 300ms var(--ease-out);
}

.done .check-dot path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 260ms 90ms var(--ease-out);
}

@keyframes check-pop {
  40% { transform: scale(1.14); }
}

.strike {
  background: linear-gradient(var(--text-3), var(--text-3)) 0 55% / 0 1px no-repeat;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  transition: color var(--dur) ease, background-size var(--dur) var(--ease-out);
}

.done .strike {
  color: var(--text-3);
  background-size: 100% 1px;
  transition-delay: 0s, 80ms;
}

.more-rows {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
}

.more-rows:active {
  color: var(--text);
}

.row-delete {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-3);
}

.row-delete:active {
  color: var(--danger);
}

.task-move {
  transition: transform var(--dur-slow) var(--ease-out);
}

.task-enter-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.task-leave-active {
  transition: opacity var(--dur-fast) ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.task-leave-to {
  opacity: 0;
}

/* Garden */
.garden {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plant {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant:active {
  transform: scale(0.985);
}

.plant-photo {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--line);
}

.plant-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.plant-name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-sub {
  margin: 2px 0 9px;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 0 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lamp);
}

.plant-bar {
  display: block;
  height: 5px;
}

.bar-fill {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--leaf-deep), var(--leaf));
  transform-origin: left;
  animation: progress-fill 0.9s 0.45s var(--ease-out) both;
}

.plant-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-3);
}

.eta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--lamp);
  font-weight: 500;
}

.eta-chip.late {
  color: var(--pink);
}

.add-plant {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  border-radius: var(--radius);
  border: 1px dashed var(--accent-line);
  color: var(--leaf);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

/* Week strip */
.week {
  display: flex;
  align-items: stretch;
  padding: 14px 4px 14px 0;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.week:active {
  transform: scale(0.985);
}

.week-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 14px;
}

.week-cell + .week-cell {
  border-left: 1px solid var(--line);
}

.week-cell strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
  font-weight: 300;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-cell:nth-child(2) strong {
  font-size: 15px;
  font-weight: 500;
  min-height: 29px;
}

.health-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.week-cell > span {
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
}

.week-go {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--leaf);
}

/* Recent */
.recent {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 10px 14px;
  color: inherit;
  text-decoration: none;
}

.recent-item + .recent-item {
  border-top: 1px solid var(--line);
}

.recent-glyph {
  font-size: 22px;
}

.recent-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.recent-text strong {
  font-weight: 500;
}

.recent-text span {
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-date {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

/* Tip */
.tip {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}

.tip-glyph {
  margin-top: 2px;
  font-size: 24px;
  color: var(--lamp);
}

.tip-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.tip-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--lamp);
}

.tip-stage {
  font-size: 12px;
  font-weight: 600;
}

.tip-text {
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-2);
}

.tip-next {
  font-size: 12px;
  color: var(--text-3);
}

/* Light sheet */
.presets {
  overflow: visible;
  flex-wrap: wrap;
}

.presets .chip {
  flex: 1;
  justify-content: center;
  min-height: 44px;
}

@media (prefers-reduced-motion: reduce) {
  .settle > *,
  .bar-fill,
  .done .check-dot {
    animation: none;
  }

  .lamp-pulse {
    display: none;
  }
}
</style>
