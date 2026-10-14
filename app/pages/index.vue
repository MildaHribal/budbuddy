<script setup lang="ts">
import type { LightboxItem } from '~/components/PhotoLightbox.vue'
import type { EntryType, JournalEntry, Plant, StageId, Task } from '~/types/grow'
import { loadNamespaces } from '~/composables/useI18n'
import { formatDuration, lightState } from '~/utils/light'
import { milestones, repeatDates } from '~/utils/upcoming'

const { t, locale } = useI18n()

useHead({ title: '' })

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

const summary = computed(() => {
  const parts: string[] = []
  if (growing.value.length) parts.push(t('home.summary.growing', { n: growing.value.length }))
  if (postHarvest.value.length) parts.push(t('home.summary.after', { n: postHarvest.value.length }))
  const tents = (state.spaces ?? []).length
  if (tents) parts.push(t('home.summary.tents', { n: tents }))
  return parts.join(' · ')
})

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

// tents carry their own schedule; the global one stays for plants without a lit tent
const hasLitSpaces = computed(() => (state.spaces ?? []).some(s => s.lightHours !== null))
const showGlobalLight = computed(() => needsGlobalLight(state.plants, state.spaces ?? []))

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
  /** learned interval when the plant is on smart watering */
  smart: number | null
}

const waterDue = computed<WaterDue[]>(() => activePlants.value
  .flatMap((p) => {
    const w = grow.wateringStatus(p, today.value)
    return w && w.dueIn <= 0 ? [{ plant: p, overdueBy: -w.dueIn, smart: w.smart ? w.interval : null }] : []
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
  if (p.stage === 'flowering') return t('home.garden.readyHarvest')
  if (next === 'flowering' && p.type === 'photoperiod') return t('home.plants.flipHint')
  return t('home.garden.readyFor', { stage: stageInfo(next).label.toLowerCase() })
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

const byNewest = (a: JournalEntry, b: JournalEntry) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
function keepNewest(list: JournalEntry[], e: JournalEntry, max: number) {
  if (list.length >= max && byNewest(e, list[list.length - 1]!) >= 0) return
  list.push(e)
  list.sort(byNewest)
  if (list.length > max) list.pop()
}

// one pass over the journal: newest entries, newest photo entries, each plant's last pH / EC
const journal = computed(() => {
  const plantIds = new Set(state.plants.map(p => p.id))
  const recent: JournalEntry[] = []
  const photos: JournalEntry[] = []
  const readings = new Map<string, JournalEntry>()
  for (const e of state.entries) {
    keepNewest(recent, e, 4)
    if (e.photoIds.length && plantIds.has(e.plantId)) keepNewest(photos, e, 10)
    if (e.ph != null || e.ec != null) {
      const cur = readings.get(e.plantId)
      if (!cur || byNewest(e, cur) < 0) readings.set(e.plantId, e)
    }
  }
  return { recent, photos, readings }
})

// latest pH / EC logged for a plant
function lastReadings(p: Plant): string[] {
  const last = journal.value.readings.get(p.id)
  if (!last) return []
  const out: string[] = []
  if (last.ph != null) out.push(`pH ${formatNumber(last.ph, 1)}`)
  if (last.ec != null) out.push(`EC ${formatNumber(last.ec, 1)}`)
  return out
}

const POST_HARVEST: StageId[] = ['drying', 'curing']

// photo card per active plant: lifecycle rail, stage week and the harvest countdown
const cards = computed(() => activePlants.value.map((p) => {
  const prog = stageProgress(p, today.value)
  const harvest = harvestChip(p)
  const rail = isGrowing(p) ? GROWING_STAGES : POST_HARVEST
  const at = rail.indexOf(p.stage)
  return {
    plant: p,
    ...prog,
    growing: isGrowing(p),
    week: Math.max(1, Math.ceil(prog.dayInStage / 7)),
    weeks: Math.max(1, Math.ceil(prog.stageDays / 7)),
    hint: harvest ? null : stageHint(p),
    harvest,
    readings: lastReadings(p),
    rail: rail.map((id, i) => ({ id, color: stageInfo(id).color, fill: i < at ? 100 : i === at ? Math.max(4, prog.percent) : 0, past: i < at }))
  }
}))

const sheetOpen = ref(false)
const sheetPlant = ref<string>('')
const sheetType = ref<EntryType>('water')

function quickLog(plant: Plant, type: EntryType) {
  sheetPlant.value = plant.id
  sheetType.value = type
  sheetOpen.value = true
}

// ── Coming up ─────────────────────────────────────────────────────
const feeding = useFeeding()
const NuxtLink = resolveComponent('NuxtLink')
const UPCOMING_DAYS = 7
type UpKind = 'water' | 'feed' | 'task'
interface UpEvent { key: string, date: string, kind: UpKind, plant: Plant | null, task: Task | null, sub: string }
const UP_ORDER: Record<UpKind, number> = { feed: 0, water: 1, task: 2 }
const UP_COLOR: Record<UpKind, string> = { water: entryInfo('water').color, feed: entryInfo('feed').color, task: 'var(--green)' }

const upcoming = computed<UpEvent[]>(() => {
  const out: UpEvent[] = []
  const end = addDays(today.value, UPCOMING_DAYS)
  for (const p of growing.value) {
    const feedDays = new Set<string>()
    const f = feeding.feedingFor(p, today.value)
    if (f?.current) {
      const last = grow.lastEntryOf(p.id, ['feed'])
      const next = last ? addDays(last.date, 7) : today.value
      for (const d of repeatDates(next, 7, today.value, UPCOMING_DAYS)) {
        feedDays.add(d)
        out.push({ key: `f-${p.id}-${d}`, date: d, kind: 'feed', plant: p, task: null, sub: feedWeekLabel(f.current.week.phase, f.current.week.n) })
      }
    }
    const w = grow.wateringStatus(p, today.value)
    if (w) {
      for (const d of repeatDates(w.nextDate, w.interval, today.value, UPCOMING_DAYS)) {
        // a feed is a watering too
        if (!feedDays.has(d)) out.push({ key: `w-${p.id}-${d}`, date: d, kind: 'water', plant: p, task: null, sub: '' })
      }
    }
  }
  for (const task of state.tasks) {
    if (task.done || task.date <= today.value || task.date > end) continue
    out.push({ key: task.id, date: task.date, kind: 'task', plant: task.plantId ? grow.getPlant(task.plantId) ?? null : null, task, sub: '' })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || UP_ORDER[a.kind] - UP_ORDER[b.kind])
})

const strip = computed(() => Array.from({ length: UPCOMING_DAYS }, (_, i) => {
  const date = addDays(today.value, i + 1)
  const events = upcoming.value.filter(e => e.date === date)
  return { date, events, kinds: [...new Set(events.map(e => e.kind))] }
}))
const pickedDay = ref<string | null>(null)
const selectedDay = computed(() => strip.value.find(d => d.date === pickedDay.value) ?? strip.value.find(d => d.events.length) ?? strip.value[0]!)

const nextMilestones = computed(() => milestones(activePlants.value, today.value).slice(0, 4).map((m) => {
  const plant = grow.getPlant(m.plantId)!
  const title = m.kind === 'harvest'
    ? t('home.upcoming.harvest')
    : m.stage === 'flowering' && plant.type === 'photoperiod'
      ? t('home.upcoming.flip')
      : t('home.upcoming.stage', { stage: stageInfo(m.stage).label.toLowerCase() })
  const when = m.inDays >= 14 ? t('home.upcoming.inWeeks', { n: Math.round(m.inDays / 7) }) : t('home.upcoming.inDays', { n: m.inDays })
  return { ...m, plant, title, when, glyph: m.kind === 'harvest' ? 'harvest' as const : stageInfo(m.stage).glyph, color: m.kind === 'harvest' ? 'var(--amber)' : stageInfo(m.stage).color }
}))

// ── Recent photos ─────────────────────────────────────────────────
const recentPhotos = computed<(LightboxItem & { key: string, plant: Plant, label: string })[]>(() => journal.value.photos
  .flatMap((e) => {
    const plant = grow.getPlant(e.plantId)
    if (!plant) return []
    const day = t('home.photos.day', { n: Math.max(0, daysBetween(plant.startDate, e.date)) })
    return e.photoIds.map(id => ({
      key: `${e.id}-${id}`,
      photoId: id,
      plant,
      label: `${day} · ${formatRelativeDay(e.date)}`,
      title: plant.name,
      subtitle: `${formatDate(e.date)} · ${day}${e.note ? ` · ${e.note}` : ''}`,
      to: `/plants/${plant.id}`
    }))
  })
  .slice(0, 10))
const photoIndex = ref<number | null>(null)
const photoOrigin = ref<DOMRect | null>(null)
function openPhoto(i: number, ev: MouseEvent) {
  photoOrigin.value = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  photoIndex.value = i
}

// ── Recent activity ───────────────────────────────────────────────
const recent = computed<JournalEntry[]>(() => journal.value.recent)

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
  <div class="home">
    <div class="page dash rise">
      <header class="dash-head">
        <div class="dash-hello">
          <p class="dash-date">
            {{ formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' }) }}<template v-if="state.settings.demo">
              <span aria-hidden="true"> · </span><span class="demo-tag">{{ t('home.demo') }}</span>
            </template>
          </p>
          <h1>{{ greeting }}</h1>
          <p
            v-if="summary"
            class="dash-summary num"
          >
            {{ summary }}
          </p>
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

      <!-- alerts only show when relevant -->
      <EnvironmentHomeAlert />
      <KitLegalWatch />

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
          :class="{ single: cards.length === 1 }"
        >
          <NuxtLink
            v-for="c in cards"
            :key="c.plant.id"
            :to="`/plants/${c.plant.id}`"
            class="card plant"
          >
            <span class="plant-photo">
              <PlantPhoto
                :photo-id="c.plant.photoId"
                :stage="c.plant.stage"
                :alt="c.plant.name"
                size="full"
              />
              <StageBadge
                :stage="c.plant.stage"
                class="photo-badge"
              />
              <span class="photo-day num">{{ t('home.plants.day', { n: c.age }) }}</span>
            </span>
            <span class="plant-body">
              <span class="plant-top">
                <span class="plant-lines">
                  <span class="plant-name">{{ c.plant.name }}</span>
                  <span class="plant-sub num">{{ [c.plant.strain, ...c.readings].filter(Boolean).join(' · ') || stageInfo(c.plant.stage).label }}</span>
                </span>
                <button
                  v-if="c.growing"
                  type="button"
                  class="plant-log"
                  :aria-label="t('home.tasks.logWater', { name: c.plant.name })"
                  @click.prevent.stop="quickLog(c.plant, 'water')"
                >
                  <GrowIcon name="water" />
                </button>
              </span>
              <span
                class="rail"
                aria-hidden="true"
              >
                <span
                  v-for="seg in c.rail"
                  :key="seg.id"
                  class="rail-seg"
                  :class="{ past: seg.past }"
                  :style="{ '--seg': seg.color }"
                >
                  <span
                    class="rail-fill"
                    :style="{ width: `${seg.fill}%` }"
                  />
                </span>
              </span>
              <span class="plant-foot">
                <span class="plant-week num">{{ t('home.plants.weekOf', { stage: stageInfo(c.plant.stage).short, week: c.week, weeks: c.weeks }) }}</span>
                <span
                  v-if="c.hint || c.harvest"
                  class="plant-hint"
                  :class="{ late: c.harvest?.late }"
                >
                  <GrowIcon :name="c.harvest ? 'harvest' : stageInfo(nextStage(c.plant.stage) ?? c.plant.stage).glyph" />
                  {{ c.harvest ? c.harvest.text : c.hint }}
                </span>
              </span>
            </span>
          </NuxtLink>
        </div>
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
                  <span class="row-thumb">
                    <PlantPhoto
                      :photo-id="r.water.plant.photoId"
                      :stage="r.water.plant.stage"
                    />
                    <span class="row-thumb-glyph">
                      <GrowIcon name="water" />
                    </span>
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
                  >{{ r.water.overdueBy ? t('home.tasks.overdueBy', { days: daysLabel(r.water.overdueBy) }) : t('home.tasks.dueToday') }}<template v-if="r.water.smart"> · {{ t('organize.water.smartMeta', { n: r.water.smart }) }}</template></span>
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

      <KitFeedingWeek />

      <section
        v-if="hasLitSpaces || showGlobalLight"
        aria-labelledby="tents-title"
      >
        <div class="section-head">
          <h2
            id="tents-title"
            class="section-title"
          >
            {{ hasLitSpaces ? t('home.tents.title') : t('home.tents.light') }}
          </h2>
          <NuxtLink
            v-if="hasLitSpaces"
            to="/spaces"
            class="link"
          >
            {{ t('home.tents.manage') }} <UIcon
              name="i-tabler-chevron-right"
              class="size-4"
            />
          </NuxtLink>
        </div>
        <div class="tents">
          <SpacesHomeLights v-if="hasLitSpaces" />
          <button
            v-if="showGlobalLight"
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
        </div>
      </section>

      <section
        v-if="upcoming.length || nextMilestones.length"
        aria-labelledby="upcoming-title"
      >
        <div class="section-head">
          <h2
            id="upcoming-title"
            class="section-title"
          >
            {{ t('home.upcoming.title') }}
          </h2>
        </div>
        <div class="upcoming-stack">
          <div
            v-if="upcoming.length"
            class="card upcoming"
          >
            <div
              class="days"
              role="group"
              :aria-label="t('home.upcoming.title')"
            >
              <button
                v-for="d in strip"
                :key="d.date"
                type="button"
                class="day"
                :aria-pressed="d.date === selectedDay.date"
                :aria-label="t('home.upcoming.dayLabel', { day: formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' }), n: d.events.length })"
                @click="pickedDay = d.date"
              >
                <span class="day-name">{{ weekdayShort(d.date) }}</span>
                <span class="day-num num">{{ formatDate(d.date, { day: 'numeric' }) }}</span>
                <span
                  class="day-dots"
                  aria-hidden="true"
                >
                  <i
                    v-for="k in d.kinds"
                    :key="k"
                    :style="{ background: UP_COLOR[k] }"
                  />
                </span>
              </button>
            </div>
            <ul class="up-list">
              <li
                v-if="!selectedDay.events.length"
                class="up-empty"
              >
                {{ t('home.upcoming.nothing') }}
              </li>
              <li
                v-for="e in selectedDay.events"
                :key="e.key"
              >
                <component
                  :is="e.plant ? NuxtLink : 'div'"
                  :to="e.plant ? `/plants/${e.plant.id}` : undefined"
                  class="up-row"
                >
                  <span
                    v-if="e.plant"
                    class="up-thumb"
                  >
                    <PlantPhoto
                      :photo-id="e.plant.photoId"
                      :stage="e.plant.stage"
                    />
                  </span>
                  <span
                    v-else
                    class="up-thumb up-tile"
                  >
                    <GrowIcon name="note" />
                  </span>
                  <span class="up-text">
                    <strong>
                      <GrowIcon
                        v-if="e.kind !== 'task'"
                        :name="e.kind"
                        :style="{ color: UP_COLOR[e.kind] }"
                      />
                      {{ e.kind === 'task' ? e.task!.title : t(`home.upcoming.${e.kind}`) }}
                    </strong>
                    <span>{{ [e.plant?.name, e.sub].filter(Boolean).join(' · ') }}</span>
                  </span>
                </component>
              </li>
            </ul>
          </div>

          <template v-if="nextMilestones.length">
            <p class="sub-head">
              {{ t('home.upcoming.milestones') }}
            </p>
            <div class="card milestones">
              <NuxtLink
                v-for="m in nextMilestones"
                :key="m.plantId"
                :to="`/plants/${m.plantId}`"
                class="up-row"
              >
                <span class="up-thumb">
                  <PlantPhoto
                    :photo-id="m.plant.photoId"
                    :stage="m.plant.stage"
                  />
                </span>
                <span class="up-text">
                  <strong>
                    <GrowIcon
                      :name="m.glyph"
                      :style="{ color: m.color }"
                    />
                    {{ m.title }}
                  </strong>
                  <span>{{ m.plant.name }}</span>
                </span>
                <span class="up-when">
                  <strong class="num">{{ m.when }}</strong>
                  <span class="num">{{ formatDate(m.date, { day: 'numeric', month: 'short' }) }}</span>
                </span>
              </NuxtLink>
            </div>
          </template>
        </div>
      </section>

      <section
        v-if="recentPhotos.length"
        aria-labelledby="photos-title"
      >
        <div class="section-head">
          <h2
            id="photos-title"
            class="section-title"
          >
            {{ t('home.photos.title') }}
          </h2>
          <NuxtLink
            to="/gallery"
            class="link"
          >
            {{ t('home.photos.all') }} <UIcon
              name="i-tabler-chevron-right"
              class="size-4"
            />
          </NuxtLink>
        </div>
        <ul class="photos">
          <li
            v-for="(ph, i) in recentPhotos"
            :key="ph.key"
          >
            <button
              type="button"
              class="photo"
              :aria-label="t('home.photos.open', { name: ph.plant.name })"
              @click="openPhoto(i, $event)"
            >
              <span class="photo-img">
                <PlantPhoto
                  :photo-id="ph.photoId"
                  :stage="ph.plant.stage"
                />
              </span>
              <span class="photo-name">{{ ph.plant.name }}</span>
              <span class="photo-meta num">{{ ph.label }}</span>
            </button>
          </li>
        </ul>
      </section>

      <LazyGameEntryCard variant="home" />

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
              <span class="tip-title">{{ t('home.tip.title') }}</span>
              <span class="tip-stage badge">{{ tip.stage.label }}</span>
            </span>
            <span class="tip-text">{{ tip.text }}</span>
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

      <div
        ref="tipsAnchor"
        class="tips-anchor"
      >
        <LazyCommunityTopTips v-if="online && tipsReady" />
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

      <NuxtLink
        v-if="state.plants.length"
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

    <PhotoLightbox
      v-model:index="photoIndex"
      :items="recentPhotos"
      :origin="photoOrigin"
      readonly
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
  container: home / inline-size;
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

.dash-summary {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
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

.row-thumb {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.row-thumb-glyph {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--surface);
  color: var(--blue);
  font-size: 13px;
}

.check:active .row-thumb {
  transform: scale(0.94);
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

/* Garden: photo cards, a swipeable row on a phone, a grid when there is room */
.garden {
  display: flex;
  gap: 12px;
  margin: 0 -16px;
  padding: 0 16px 2px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 16px;
  scrollbar-width: none;
}

.garden::-webkit-scrollbar {
  display: none;
}

.plant {
  flex: 0 0 82%;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.garden.single .plant {
  flex-basis: 100%;
}

@container home (min-width: 640px) {
  .garden {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    margin: 0;
    padding: 0;
    overflow: visible;
  }
}

.plant:active {
  transform: scale(0.985);
}

.plant-photo {
  position: relative;
  display: block;
  aspect-ratio: 3 / 2;
  min-height: 0;
  overflow: hidden;
  background: var(--surface-2);
}

.photo-badge {
  position: absolute;
  top: 10px;
  left: 10px;
}

.photo-day {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

.plant-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 14px 14px;
}

.plant-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plant-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plant-name {
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

.plant-log {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--blue) 14%, transparent);
  color: var(--blue);
  font-size: 22px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.plant-log:active {
  transform: scale(0.92);
}

/* lifecycle rail: one segment per stage, the current one fills */
.rail {
  display: flex;
  gap: 3px;
}

.rail-seg {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

.rail-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--seg);
  transition: width var(--dur-slow) var(--ease-out);
}

.rail-seg.past .rail-fill {
  background: color-mix(in srgb, var(--seg) 70%, var(--track));
}

.plant-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 18px;
}

.plant-week {
  min-width: 0;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--amber);
  white-space: nowrap;
}

.plant-hint.late {
  color: var(--red);
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

.tents {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Coming up */
.upcoming-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upcoming {
  overflow: hidden;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--line);
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 64px;
  padding: 6px 0 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  transition: transform var(--dur-fast) var(--ease-out);
}

.day:active {
  transform: scale(0.94);
}

.day[aria-pressed="true"] {
  background: var(--accent-soft);
  color: var(--green);
}

.day-name {
  font-size: 11px;
  font-weight: 600;
}

.day-num {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.day[aria-pressed="true"] .day-num {
  color: var(--green);
}

.day-dots {
  display: flex;
  gap: 3px;
  height: 5px;
}

.day-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.up-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.up-list li + li {
  border-top: 1px solid var(--line);
}

.up-empty {
  padding: 18px 14px;
  font-size: 13px;
  color: var(--text-3);
}

.up-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 8px 14px 8px 12px;
  color: inherit;
  text-decoration: none;
}

.milestones .up-row + .up-row {
  border-top: 1px solid var(--line);
}

.up-thumb {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.up-tile {
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--green);
  font-size: 20px;
}

.up-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.up-text strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.up-text strong :deep(svg) {
  flex-shrink: 0;
}

.up-text > span {
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.up-when {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-3);
}

.up-when strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.sub-head {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

/* Recent photos */
.photos {
  display: flex;
  gap: 10px;
  list-style: none;
  margin: 0 -16px;
  padding: 0 16px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding: 0 16px;
  scrollbar-width: none;
}

.photos::-webkit-scrollbar {
  display: none;
}

.photos li {
  flex: 0 0 128px;
  scroll-snap-align: start;
}

.photo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out);
}

.photo:active {
  transform: scale(0.97);
}

.photo-img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 5;
  margin-bottom: 6px;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.photo-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-meta {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
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
  flex: 1.2;
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

.tip-title {
  font-size: 13px;
  font-weight: 600;
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
