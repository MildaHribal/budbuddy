<script setup lang="ts">
import type { EntryType, JournalEntry, Plant, StageId, Task } from '~/types/grow'
import { loadNamespaces } from '~/composables/useI18n'
import { formatDuration, lightState } from '~/utils/light'

const { t, locale } = useI18n()

useHead({ title: () => t('home.title') })

const grow = useGrow()
const { state } = grow
const { notify } = useNotify()

const today = useToday()
// community tips need the network; skipping them offline also avoids a failed chunk load
const online = useOnline()
// community tips sit below the fold and pull in supabase-js: load them only when scrolled near
const tipsAnchor = ref<HTMLElement | null>(null)
const tipsReady = ref(false)
const { stop: stopTips } = useIntersectionObserver(tipsAnchor, ([e]) => {
  if (!e?.isIntersecting) return
  stopTips()
  loadNamespaces(['tips', 'feed', 'report', 'profile']).then(() => (tipsReady.value = true), () => {})
}, { rootMargin: '200px 0px' })

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = t(`home.greeting.${h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}`)
  // greet by first name only; a full name wrapped the header over three lines
  const raw = state.settings.growerName.trim().split(/\s+/)[0] ?? ''
  const name = raw ? (locale.value === 'cs' ? czechVocative(raw) : raw) : t('home.greeting.defaultName')
  return name ? t('home.greeting.line', { part, name }) : part
})
const initial = computed(() => state.settings.growerName?.trim().charAt(0).toUpperCase() ?? '')

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

const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  clock = setInterval(() => (now.value = new Date()), 30_000)
})
onBeforeUnmount(() => clearInterval(clock))

const light = computed(() => {
  const hours = state.settings.lightHours
  const s = lightState(state.settings.lightsOn, hours, now.value)
  const span = (s.isOn ? hours : 24 - hours) * 60
  const headline = hours >= 24
    ? `${t('ring.lightsOnLead')} ${t('ring.allDay')}`
    : hours <= 0
      ? `${t('ring.lightsLead')} ${t('ring.off')}`
      : `${s.isOn ? t('ring.offIn') : t('ring.onIn')} ${formatDuration(s.minutesLeft)}`
  return {
    ...s,
    headline,
    percent: span ? Math.round((1 - s.minutesLeft / span) * 100) : 100,
    summary: t('home.light.summary', { on: hours, off: 24 - hours, from: s.onLabel, to: s.offLabel })
  }
})

function openLight() {
  draftOn.value = state.settings.lightsOn
  draftHours.value = state.settings.lightHours
  lightOpen.value = true
}

function saveLight() {
  if (!hoursValid.value || !onValid.value) return
  grow.updateSettings({ lightsOn: draftOn.value, lightHours: Number(draftHours.value) })
  lightOpen.value = false
  notify(t('home.light.saved'))
}

// ── Tasks ─────────────────────────────────────────────────────────
const todaysTasks = computed(() => state.tasks
  .filter(x => x.date === today.value || (x.date < today.value && !x.done))
  .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)))
const doneCount = computed(() => todaysTasks.value.filter(x => x.done).length)

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

// latest pH / EC logged for a plant
function lastReadings(p: Plant): string[] {
  const list = state.entries.filter(e => e.plantId === p.id && (e.ph != null || e.ec != null))
  if (!list.length) return []
  const last = list.reduce((a, b) => (b.date > a.date || (b.date === a.date && b.createdAt > a.createdAt) ? b : a))
  const out: string[] = []
  if (last.ph != null) out.push(`pH ${formatNumber(last.ph, 1)}`)
  if (last.ec != null) out.push(`EC ${formatNumber(last.ec, 1)}`)
  return out
}

function plantRow(p: Plant) {
  const prog = stageProgress(p, today.value)
  const harvest = harvestChip(p)
  return {
    ...prog,
    week: Math.max(1, Math.ceil(prog.dayInStage / 7)),
    weeks: Math.max(1, Math.ceil(prog.stageDays / 7)),
    hint: harvest ? null : stageHint(p),
    harvest,
    readings: lastReadings(p)
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
// tip stage → the guide chapter that covers it
const GUIDE_CHAPTER: Record<StageId, string> = {
  germination: 'germination',
  seedling: 'germination',
  vegetative: 'vegetative',
  flowering: 'flowering',
  drying: 'harvest',
  curing: 'harvest'
}
const tipIndex = ref(Math.floor(Math.random() * 100))
const tip = computed(() => tips.value[tipIndex.value % tips.value.length]!)
</script>

<template>
  <div>
    <div class="page dash rise">
      <header class="dash-head">
        <div class="dash-hello">
          <p class="dash-date">
            {{ formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' }) }}<template v-if="state.settings.demo">
              <span aria-hidden="true"> · </span><span class="demo-tag">{{ t('home.demo') }}</span>
            </template>
          </p>
          <h1>{{ greeting }}</h1>
        </div>
        <NuxtLink
          to="/tools"
          class="icon-btn"
          :aria-label="t('common.nav.tools')"
        >
          <GrowIcon name="tools" />
        </NuxtLink>
        <NuxtLink
          to="/settings"
          prefetch-on="interaction"
          class="icon-btn dash-me"
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
              v-if="todaysTasks.length"
              class="section-meta num"
            >{{ t('home.tasks.doneOf', { done: doneCount, total: todaysTasks.length }) }}</span>
            <VoiceLogButton v-if="activePlants.length" />
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
                <button
                  type="button"
                  class="check"
                  :aria-label="t('home.tasks.logWater', { name: r.water.plant.name })"
                  @click="quickLog(r.water.plant, 'water')"
                >
                  <span class="check-box water">
                    <GrowIcon name="water" />
                  </span>
                </button>
                <NuxtLink
                  :to="`/plants/${r.water.plant.id}`"
                  class="row-text"
                >
                  <span class="row-title">{{ t('home.tasks.water', { name: r.water.plant.name }) }}</span>
                  <span
                    class="row-meta"
                    :class="{ late: r.water.overdueBy }"
                  >{{ r.water.overdueBy ? t('home.tasks.overdueBy', { days: daysLabel(r.water.overdueBy) }) : t('home.tasks.dueToday') }}</span>
                </NuxtLink>
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
                  <span class="check-box">
                    <svg
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                    >
                      <path d="M2.5 6.5l2.3 2.3 4.7-5" />
                    </svg>
                  </span>
                </button>
                <div class="row-text">
                  <span class="row-title">{{ r.task.title }}</span>
                  <span
                    v-if="plantName(r.task.plantId) || (r.task.date < today && !r.task.done)"
                    class="row-meta"
                    :class="{ late: r.task.date < today && !r.task.done }"
                  >{{ r.task.date < today && !r.task.done ? t('home.tasks.overdue', { when: formatRelativeDay(r.task.date) }) : plantName(r.task.plantId) }}</span>
                </div>
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

      <button
        type="button"
        class="card light"
        aria-haspopup="dialog"
        :aria-label="`${t('home.editLight')}. ${light.summary}. ${light.headline}`"
        @click="openLight"
      >
        <span
          class="light-icon"
          :class="{ dark: !light.isOn }"
        >
          <GrowIcon name="lamp" />
        </span>
        <span class="light-body">
          <span class="light-sub">{{ light.summary }}</span>
          <strong class="light-big num">{{ light.headline }}</strong>
          <span
            class="progress light-bar"
            :class="{ dark: !light.isOn }"
          >
            <span
              class="bar-fill"
              :style="{ width: `${light.percent}%` }"
            />
          </span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 light-go"
        />
      </button>

      <section aria-labelledby="plants-title">
        <div class="section-head">
          <h2
            id="plants-title"
            class="section-title"
          >
            {{ t('home.garden.title') }}
          </h2>
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

        <EmptyState
          v-if="!activePlants.length"
          icon="seedling"
          :title="t('home.garden.emptyTitle')"
          :text="t('home.garden.emptyText')"
        >
          <NuxtLink
            to="/plants/new"
            class="btn btn-primary"
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
              <span class="plant-top">
                <span class="plant-name">{{ p.name }}</span>
                <StageBadge :stage="p.stage" />
              </span>
              <span class="plant-lower">
                <span class="plant-lines">
                  <span class="plant-sub">
                    <strong class="num">{{ t('home.garden.day', { n: plantRow(p).age }) }}</strong>
                    <span
                      v-for="r in plantRow(p).readings"
                      :key="r"
                      class="num"
                    > · {{ r }}</span>
                  </span>
                  <span
                    v-if="plantRow(p).hint || plantRow(p).harvest"
                    class="plant-hint"
                    :class="{ late: plantRow(p).harvest?.late }"
                  >
                    <GrowIcon :name="plantRow(p).harvest ? 'harvest' : stageInfo(nextStage(p.stage) ?? p.stage).glyph" />
                    {{ plantRow(p).harvest ? plantRow(p).harvest!.text : plantRow(p).hint }}
                  </span>
                  <span class="progress plant-bar">
                    <span
                      class="bar-fill"
                      :style="{ width: `${plantRow(p).percent}%` }"
                    />
                  </span>
                </span>
                <button
                  v-if="isGrowing(p)"
                  type="button"
                  class="plant-log"
                  :aria-label="t('home.tasks.logWater', { name: p.name })"
                  @click.prevent.stop="quickLog(p, 'water')"
                >
                  <GrowIcon name="water" />
                </button>
              </span>
            </span>
          </NuxtLink>
        </div>
      </section>

      <div
        ref="tipsAnchor"
        class="tips-anchor"
      >
        <LazyCommunityTopTips v-if="online && tipsReady" />
      </div>

      <NuxtLink
        to="/stats"
        class="card week"
        :aria-label="t('home.stats.open')"
      >
        <span class="week-cell">
          <strong class="num">{{ growing.length }}</strong>
          <span>{{ t('home.stats.growing') }}</span>
        </span>
        <span class="week-cell week-health">
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
        <span
          class="week-go"
          aria-hidden="true"
        >
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5"
          />
        </span>
      </NuxtLink>

      <div class="card tip">
        <button
          type="button"
          class="tip-cycle"
          :aria-label="t('home.tip.title')"
          @click="tipIndex++"
        >
          <span class="tip-icon">
            <GrowIcon :name="tip.stage.glyph" />
          </span>
          <span class="tip-body">
            <span class="tip-head">
              <span class="tip-text">{{ tip.text }}</span>
              <span class="tip-stage badge">{{ tip.stage.label }}</span>
            </span>
            <span class="tip-next">{{ t('home.tip.next') }}</span>
          </span>
        </button>
        <NuxtLink
          :to="`/guide/${GUIDE_CHAPTER[tip.stage.id]}`"
          class="link tip-guide"
        >
          {{ t('home.tip.guide') }}
          <UIcon
            name="i-tabler-chevron-right"
            class="size-4"
          />
        </NuxtLink>
      </div>

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
            <span
              class="recent-glyph"
              :style="{ color: entryInfo(e.type).color }"
            >
              <GrowIcon :name="entryInfo(e.type).glyph" />
            </span>
            <span class="recent-text">
              <strong>{{ e.type === 'stage' && e.stage ? t('home.recent.movedTo', { stage: stageInfo(e.stage).label }) : entryInfo(e.type).verb }}</strong>
              <span>{{ plantName(e.plantId) }}<template v-if="entrySummary(e)"> · {{ entrySummary(e) }}</template></span>
            </span>
            <span class="recent-date">{{ formatRelativeDay(e.date) }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>

    <NuxtLink
      v-if="activePlants.length"
      to="/plants/new"
      class="fab"
      :aria-label="t('home.garden.addPlant')"
    >
      <UIcon name="i-tabler-plus" />
    </NuxtLink>

    <EntrySheet
      v-if="sheetPlant"
      v-model:open="sheetOpen"
      :plant-id="sheetPlant"
      :type="sheetType"
      :date="today"
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
.dash {
  padding-top: calc(12px + var(--safe-top));
}

/* Header */
.dash-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
}

.dash-hello {
  flex: 1;
  min-width: 0;
}

.dash-me {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}

.dash-date {
  margin: 0 0 2px;
  font-size: 13px;
  color: var(--text-3);
}

.dash-date::first-letter {
  text-transform: uppercase;
}

.demo-tag {
  color: var(--text-2);
  font-weight: 500;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  overflow-wrap: anywhere;
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

/* Light */
.light {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 12px 14px 14px;
  text-align: left;
  color: inherit;
  transition: transform var(--dur-fast) var(--ease-out);
}

.light:active {
  transform: scale(0.985);
}

.light-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--lamp-soft);
  color: var(--amber);
  font-size: 24px;
}

.light-icon.dark {
  background: var(--surface-3);
  color: var(--text-3);
}

.light-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.light-sub {
  font-size: 13px;
  color: var(--text-2);
}

.light-big {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.light-bar {
  height: 4px;
  margin-top: 6px;
}

.light-bar .bar-fill {
  background: var(--amber);
}

.light-bar.dark .bar-fill {
  background: var(--text-3);
}

.light-go {
  flex-shrink: 0;
  color: var(--text-3);
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
  overflow: hidden;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 56px;
  padding: 0 8px 0 6px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.check {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
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
  font-size: 15px;
  font-weight: 500;
  overflow-wrap: anywhere;
  transition: color var(--dur) ease;
}

.row-meta {
  font-size: 12px;
  color: var(--text-3);
}

.row-meta.late {
  color: var(--red);
  font-weight: 600;
}

.log-btn {
  position: relative;
  min-width: 64px;
  height: 40px;
  margin: 4px 0;
  padding: 0 14px;
  border-radius: var(--radius-control);
  border: 0;
  background: var(--accent-soft);
  color: var(--green);
  font-size: 13px;
  font-weight: 600;
  transition: transform var(--dur-fast) var(--ease-out);
}

/* keeps a 44px hit area around the compact button */
.log-btn::after {
  content: '';
  position: absolute;
  inset: -4px 0;
}

.log-btn:active {
  transform: scale(0.95);
}

.check {
  border: 0;
  background: none;
  padding: 0;
}

.check-box {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  border: 2px solid var(--line-strong);
  transition: background var(--dur) ease, border-color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.check-box.water {
  border-color: color-mix(in srgb, var(--blue) 60%, transparent);
  color: var(--blue);
  font-size: 13px;
}

.check-box svg {
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

.check:active .check-box {
  transform: scale(0.9);
}

.done .check-box {
  background: var(--green);
  border-color: var(--green);
}

.done .check-box svg {
  opacity: 1;
}

.done .row-title {
  color: var(--text-3);
  text-decoration: line-through;
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
  font-weight: 600;
}

.row-delete {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-3);
}

.row-delete:active {
  color: var(--red);
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
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant:active {
  transform: scale(0.985);
}

.plant-photo {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  overflow: hidden;
}

.plant-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plant-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plant-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-sub {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-sub strong {
  font-weight: 600;
  color: var(--text);
}

.plant-lower {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.plant-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plant-log {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-bottom: -2px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--blue) 14%, transparent);
  color: var(--blue);
  font-size: 20px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant-log:active {
  transform: scale(0.92);
}

.plant-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--amber);
}

.plant-hint.late {
  color: var(--red);
}

.plant-bar {
  display: block;
  height: 4px;
  margin-top: 4px;
}

.bar-fill {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: var(--green);
  transition: width var(--dur-slow) var(--ease-out);
}

/* zero-size until the tips load, without adding a page gap */
.tips-anchor:empty {
  height: 0;
  margin-top: -24px;
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
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-health {
  flex: 1.4;
}

.week-cell.week-health strong {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.15;
  min-height: 29px;
  white-space: normal;
}

.health-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.week-cell > span {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.week-go {
  display: flex;
  align-items: center;
  padding: 0 6px 0 2px;
  color: var(--text-3);
}

/* Recent */
.recent {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 14px;
  color: inherit;
  text-decoration: none;
}

.recent-item + .recent-item {
  border-top: 1px solid var(--line);
}

.recent-glyph {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, transparent);
  font-size: 20px;
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
  flex-direction: column;
  padding: 14px 14px 6px;
}

.tip-cycle {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}

.tip-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 20px;
}

.tip-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tip-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tip-stage {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--text-2);
}

.tip-text {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
}

.tip-next {
  font-size: 12px;
  color: var(--text-3);
}

.tip-guide {
  min-height: 44px;
  margin-left: 48px;
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
</style>
