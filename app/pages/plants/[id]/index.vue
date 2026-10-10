<script setup lang="ts">
import type { EntryType, JournalEntry, StageId } from '~/types/grow'
import type { LightboxItem } from '~/components/PhotoLightbox.vue'

definePageMeta({ alias: ['/my_trees/:id'] })

const route = useRoute()
const grow = useGrow()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { $goBack } = useNuxtApp()

const today = useToday()
const plantId = computed(() => String(route.params.id))
const plant = computed(() => grow.getPlant(plantId.value))
useHead({ title: () => plant.value?.name ?? 'Plant' })

const entries = computed(() => grow.entriesFor(plantId.value))
const progress = computed(() => (plant.value ? stageProgress(plant.value) : null))
const stage = computed(() => stageInfo(plant.value?.stage))
const watering = computed(() => (plant.value ? grow.wateringStatus(plant.value) : null))

type Tab = 'journal' | 'history' | 'info' | 'photos'
const tabs: { id: Tab, label: string, icon: string }[] = [
  { id: 'journal', label: 'Journal', icon: 'i-tabler-notebook' },
  { id: 'history', label: 'History', icon: 'i-tabler-list-details' },
  { id: 'info', label: 'Info', icon: 'i-tabler-info-circle' },
  { id: 'photos', label: 'Photos', icon: 'i-tabler-photo' }
]
const tab = ref<Tab>((route.query.tab as Tab) || 'journal')
watch(tab, t => navigateTo({ query: { ...route.query, tab: t === 'journal' ? undefined : t } }, { replace: true }))

// ── Journal ───────────────────────────────────────────────────────
const selectedDate = ref(today.value)
// Follow the calendar when the app is resumed on a new day.
watch(today, (t, prev) => {
  if (selectedDate.value === prev) selectedDate.value = t
})
const markedDays = computed(() => new Set(entries.value.map(e => e.date)))
const dayEntries = computed(() => entries.value.filter(e => e.date === selectedDate.value))
const loggable = ENTRY_TYPES.filter(t => t.loggable)

const sheetOpen = ref(false)
const sheetType = ref<EntryType>('water')
const editing = ref<JournalEntry | null>(null)

function log(type: EntryType) {
  editing.value = null
  sheetType.value = type
  sheetOpen.value = true
}

function edit(entry: JournalEntry) {
  editing.value = entry
  sheetType.value = entry.type
  sheetOpen.value = true
}

function onSaved(entry: JournalEntry) {
  selectedDate.value = entry.date
}

function removeEntry(entry: JournalEntry) {
  const removed = grow.deleteEntry(entry.id)
  if (removed) {
    notify(`${entryInfo(removed.type).verb} entry deleted`, {
      tone: 'info',
      action: { label: 'Undo', run: () => grow.restoreEntry(removed) }
    })
  }
}

// ── History ───────────────────────────────────────────────────────
const historyFilter = ref<EntryType | null>(null)
const historyTypes = computed(() => ENTRY_TYPES.filter(t => entries.value.some(e => e.type === t.type)))
const historyGroups = computed(() => {
  const groups: { date: string, items: JournalEntry[] }[] = []
  for (const e of entries.value) {
    if (historyFilter.value && e.type !== historyFilter.value) continue
    const last = groups[groups.length - 1]
    if (last?.date === e.date) last.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  }
  return groups
})

// ── Info ──────────────────────────────────────────────────────────
const counts = computed(() => {
  const c: Partial<Record<EntryType, number>> = {}
  for (const e of entries.value) c[e.type] = (c[e.type] ?? 0) + 1
  return c
})

const heightPoints = computed(() => entries.value
  .filter(e => e.heightCm != null)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map(e => ({ label: formatDate(e.date, { day: 'numeric', month: 'short' }), value: e.heightCm! })))

const timeline = computed(() => {
  const p = plant.value
  if (!p) return []
  return p.stageHistory.map((h, i) => {
    const next = p.stageHistory[i + 1]
    const end = next?.date ?? todayISO()
    return { ...h, info: stageInfo(h.stage), days: daysBetween(h.date, end), current: !next }
  })
})

const lastFeed = computed(() => entries.value.find(e => e.type === 'feed'))

const details = computed(() => {
  const p = plant.value
  if (!p) return []
  return [
    { icon: 'i-tabler-dna', label: 'Strain', value: p.strain || '–' },
    { icon: p.type === 'autoflower' ? 'i-tabler-bolt' : 'i-tabler-sun', label: 'Type', value: p.type === 'autoflower' ? 'Autoflower' : 'Photoperiod' },
    { icon: 'i-tabler-calendar', label: 'Started', value: formatDate(p.startDate) },
    { icon: 'i-tabler-bucket', label: 'Pot', value: p.potSize || '–' },
    { icon: 'i-tabler-shovel', label: 'Medium', value: capitalize(p.medium) },
    { icon: 'i-tabler-home', label: 'Location', value: capitalize(p.location) },
    { icon: 'i-tabler-bulb', label: 'Light', value: stage.value.light }
  ]
})

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Photos ────────────────────────────────────────────────────────
interface PhotoRef extends LightboxItem {
  entryId: string | null
  date: string
}

const photos = computed<PhotoRef[]>(() => {
  const p = plant.value
  if (!p) return []
  const list: PhotoRef[] = []
  for (const e of entries.value) {
    for (const id of e.photoIds) {
      list.push({ photoId: id, entryId: e.id, date: e.date, title: e.note || entryInfo(e.type).verb, subtitle: `${formatDate(e.date)} · day ${daysBetween(p.startDate, e.date)}` })
    }
  }
  if (p.photoId) list.push({ photoId: p.photoId, entryId: null, date: p.startDate, title: 'Profile photo', subtitle: p.name })
  return list
})

const lightboxItems = ref<LightboxItem[]>([])
const lightboxIndex = ref<number | null>(null)

function openPhotos(items: LightboxItem[], photoId: string) {
  lightboxItems.value = items
  lightboxIndex.value = Math.max(0, items.findIndex(i => i.photoId === photoId))
}

function openEntryPhoto(entry: JournalEntry, photoId: string) {
  openPhotos(entry.photoIds.map(id => ({ photoId: id, title: entry.note || entryInfo(entry.type).verb, subtitle: formatDate(entry.date) })), photoId)
}

async function deletePhoto(item: LightboxItem) {
  const ok = await confirm({ title: 'Delete this photo?', message: 'It will be removed from the journal.', confirmLabel: 'Delete', danger: true })
  if (!ok || !plant.value) return
  if (plant.value.photoId === item.photoId) grow.updatePlant(plant.value.id, { photoId: null })
  for (const e of entries.value.filter(x => x.photoIds.includes(item.photoId))) {
    const rest = e.photoIds.filter(id => id !== item.photoId)
    if (e.type === 'photo' && !rest.length && !e.note) grow.deleteEntry(e.id)
    else grow.updateEntry(e.id, { photoIds: rest })
  }
  lightboxItems.value = lightboxItems.value.filter(i => i.photoId !== item.photoId)
  grow.cleanupPhotos()
  notify('Photo deleted', { tone: 'info' })
}

async function setProfilePhoto() {
  const file = await pickImage()
  if (!file || !plant.value) return
  try {
    grow.updatePlant(plant.value.id, { photoId: await grow.savePhoto(file) })
    notify('Profile photo updated')
  } catch {
    notify('Could not read that image', { tone: 'error' })
  }
}

// ── Stage / harvest ───────────────────────────────────────────────
const stageSheet = ref(false)
const stageChoice = ref<StageId>('seedling')
const stageDate = ref(todayISO())

const upcoming = computed(() => {
  const p = plant.value
  if (!p) return null
  const next = nextStage(p.stage)
  if (!next) return { label: 'Finish & archive', icon: 'i-tabler-archive', action: 'archive' as const }
  if (p.stage === 'flowering') return { label: 'Harvest', icon: 'i-tabler-basket', action: 'harvest' as const }
  if (p.stage === 'drying') return { label: 'Dry weight & cure', icon: 'i-tabler-scale', action: 'dry' as const }
  return { label: `Move to ${stageInfo(next).label}`, icon: 'i-tabler-arrow-big-right-lines', action: 'stage' as const }
})

function openStageSheet() {
  const p = plant.value
  if (!p) return
  const next = nextStage(p.stage)
  stageChoice.value = next && GROWING_STAGES.includes(next) ? next : p.stage
  stageDate.value = todayISO()
  stageSheet.value = true
}

function applyStage() {
  const p = plant.value
  if (!p) return
  if (stageChoice.value === p.stage || !GROWING_STAGES.includes(stageChoice.value)) {
    stageSheet.value = false
    return
  }
  if (!isValidISODate(stageDate.value) || stageDate.value > todayISO()) {
    notify('Pick a valid date', { tone: 'error' })
    return
  }
  if (stageDate.value < stageStartDate(p)) {
    notify('The date must be after the current stage started', { tone: 'error' })
    return
  }
  grow.setStage(p.id, stageChoice.value, stageDate.value)
  stageSheet.value = false
  notify(`${p.name} is now in ${stageInfo(stageChoice.value).label.toLowerCase()}`, { icon: stageInfo(stageChoice.value).icon })
}

const harvestSheet = ref(false)
const harvestForm = reactive({ date: todayISO(), wet: '' as number | '', dry: '' as number | '', notes: '' })
const harvestMode = ref<'harvest' | 'dry' | 'edit'>('harvest')

function openHarvest(mode: 'harvest' | 'dry' | 'edit') {
  const h = plant.value?.harvest
  harvestMode.value = mode
  harvestForm.date = h?.date ?? todayISO()
  harvestForm.wet = h?.wetWeight ?? ''
  harvestForm.dry = h?.dryWeight ?? ''
  harvestForm.notes = h?.notes ?? ''
  harvestSheet.value = true
}

const num = (v: number | '') => (v === '' || Number.isNaN(v) ? null : Number(v))

function saveHarvest() {
  const p = plant.value
  if (!p) return
  const wet = num(harvestForm.wet)
  const dry = num(harvestForm.dry)
  if ((wet !== null && wet < 0) || (dry !== null && dry < 0)) {
    notify('Weights must be positive', { tone: 'error' })
    return
  }
  if (wet !== null && dry !== null && dry > wet) {
    notify('Dry weight cannot be more than wet weight', { tone: 'error' })
    return
  }
  // A new harvest ends the current (flowering) stage, so it cannot be dated before that stage began.
  const minDate = harvestMode.value === 'harvest' ? stageStartDate(p) : p.startDate
  if (!isValidISODate(harvestForm.date) || harvestForm.date > todayISO() || harvestForm.date < minDate) {
    notify(`Pick a harvest date between ${formatDate(minDate)} and today`, { tone: 'error' })
    return
  }
  if (harvestMode.value === 'harvest') {
    grow.harvestPlant(p.id, { date: harvestForm.date, wetWeight: wet, dryWeight: dry, notes: harvestForm.notes.trim() })
    notify('Harvest logged – happy drying!', { icon: 'i-tabler-basket' })
  } else {
    grow.updateHarvest(p.id, { date: harvestForm.date, wetWeight: wet, dryWeight: dry, notes: harvestForm.notes.trim() })
    if (harvestMode.value === 'dry' && p.stage === 'drying') {
      grow.setStage(p.id, 'curing')
      notify('Dry weight saved, now curing', { icon: 'i-tabler-bottle' })
    } else {
      notify('Harvest updated')
    }
  }
  harvestSheet.value = false
}

async function nextStep() {
  const p = plant.value
  const u = upcoming.value
  if (!p || !u) return
  if (u.action === 'harvest') openHarvest('harvest')
  else if (u.action === 'dry') openHarvest('dry')
  else if (u.action === 'archive') {
    const ok = await confirm({ title: `Archive ${p.name}?`, message: 'The grow is finished. You can still open it from the Archive tab.', confirmLabel: 'Archive' })
    if (ok) {
      grow.setArchived(p.id, true)
      notify('Moved to archive', { icon: 'i-tabler-archive' })
    }
  } else openStageSheet()
}

// ── More menu ─────────────────────────────────────────────────────
const moreSheet = ref(false)

async function toggleArchive() {
  const p = plant.value
  if (!p) return
  grow.setArchived(p.id, !p.archived)
  moreSheet.value = false
  notify(p.archived ? 'Moved to archive' : 'Restored to active plants', { icon: 'i-tabler-archive' })
}

async function removePlant() {
  const p = plant.value
  if (!p) return
  moreSheet.value = false
  const ok = await confirm({
    title: `Delete ${p.name}?`,
    message: `This permanently removes the plant, ${entries.value.length} journal entries and its photos.`,
    confirmLabel: 'Delete',
    danger: true
  })
  if (!ok) return
  grow.deletePlant(p.id)
  notify('Plant deleted', { tone: 'info' })
  navigateTo('/plants', { replace: true })
}

function duplicate() {
  const p = plant.value
  if (!p) return
  const copy = grow.addPlant({
    name: `${p.name} (copy)`,
    strain: p.strain,
    type: p.type,
    stage: GROWING_STAGES.includes(p.stage) ? p.stage : 'seedling',
    potSize: p.potSize,
    medium: p.medium,
    location: p.location,
    wateringInterval: p.wateringInterval,
    notes: p.notes
  })
  moreSheet.value = false
  notify('Plant duplicated')
  navigateTo(`/plants/${copy.id}`)
}
</script>

<template>
  <div
    v-if="plant && progress"
    class="detail"
  >
    <section class="hero">
      <PlantPhoto
        :photo-id="plant.photoId"
        :stage="plant.stage"
        :alt="plant.name"
        class="hero-img"
      />
      <div class="hero-shade" />
      <div class="hero-bar">
        <button
          type="button"
          class="glass-btn"
          aria-label="Back"
          @click="$goBack()"
        >
          <UIcon
            name="i-tabler-arrow-left"
            class="size-5"
          />
        </button>
        <div class="hero-bar-right">
          <NuxtLink
            :to="`/plants/${plant.id}/edit`"
            class="glass-btn"
            aria-label="Edit plant"
          >
            <UIcon
              name="i-tabler-pencil"
              class="size-5"
            />
          </NuxtLink>
          <button
            type="button"
            class="glass-btn"
            aria-label="More actions"
            @click="moreSheet = true"
          >
            <UIcon
              name="i-tabler-dots-vertical"
              class="size-5"
            />
          </button>
        </div>
      </div>
      <div class="hero-info">
        <div class="hero-badges">
          <StageBadge :stage="plant.stage" />
          <span
            v-if="plant.archived"
            class="badge archived"
          ><UIcon
            name="i-tabler-archive"
            class="size-3.5"
          /> Archived</span>
          <span
            class="badge health"
            :style="{ color: healthInfo(plant.health).color }"
          >
            <UIcon
              :name="healthInfo(plant.health).icon"
              class="size-3.5"
            /> {{ healthInfo(plant.health).label }}
          </span>
        </div>
        <h1>{{ plant.name }}</h1>
        <p class="hero-strain">
          {{ plant.strain || 'Unknown strain' }} · day {{ progress.age }}
        </p>
      </div>
    </section>

    <section class="stage-card card">
      <div class="stage-top">
        <div>
          <p class="stage-label">
            {{ stage.label }} · day {{ progress.dayInStage }}
          </p>
          <p
            class="stage-sub"
            :class="{ overdue: progress.overdue && GROWING_STAGES.includes(plant.stage) }"
          >
            <template v-if="progress.overdue">
              Past the typical {{ stage.range }}
            </template>
            <template v-else>
              Typically {{ stage.range }} · {{ progress.percent }}%
            </template>
          </p>
        </div>
        <button
          v-if="upcoming && !plant.archived"
          type="button"
          class="btn btn-soft next-btn"
          @click="nextStep"
        >
          <UIcon
            :name="upcoming.icon"
            class="size-4"
          /> {{ upcoming.label }}
        </button>
      </div>
      <div class="progress">
        <div :style="{ width: `${progress.percent}%`, background: stage.color }" />
      </div>
      <p
        v-if="watering"
        class="water-line"
        :class="{ urgent: watering.dueIn <= 0 }"
      >
        <UIcon
          name="i-tabler-droplet"
          class="size-4"
        />
        <template v-if="watering.dueIn < 0">
          Watering overdue by {{ -watering.dueIn }} day{{ watering.dueIn === -1 ? '' : 's' }}
        </template>
        <template v-else-if="watering.dueIn === 0">
          Watering due today
        </template>
        <template v-else>
          Next watering {{ formatRelativeDay(watering.nextDate).toLowerCase() === 'tomorrow' ? 'tomorrow' : `in ${watering.dueIn} days` }}
        </template>
        <span
          v-if="watering.lastDate"
          class="muted"
        >· last {{ formatRelativeDay(watering.lastDate).toLowerCase() }}</span>
      </p>
    </section>

    <div
      class="tabs"
      role="tablist"
      aria-label="Plant sections"
    >
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >
        <UIcon
          :name="t.icon"
          class="size-[18px]"
        />
        {{ t.label }}
      </button>
    </div>

    <!-- Journal -->
    <div
      v-if="tab === 'journal'"
      class="tab-body"
    >
      <div class="card">
        <WeekStrip
          v-model="selectedDate"
          :marked="markedDays"
        />
      </div>

      <div
        v-if="!plant.archived"
        class="actions"
        aria-label="Log an activity"
      >
        <button
          v-for="a in loggable"
          :key="a.type"
          type="button"
          class="action"
          :style="{ '--c': a.color }"
          :disabled="selectedDate > todayISO()"
          @click="log(a.type)"
        >
          <span class="action-icon"><UIcon
            :name="a.icon"
            class="size-6"
          /></span>
          <span>{{ a.label }}</span>
        </button>
      </div>

      <div>
        <div class="section-head">
          <h2 class="section-title">
            {{ formatRelativeDay(selectedDate) }}
            <span
              v-if="selectedDate !== todayISO()"
              class="muted day-of"
            >· day {{ Math.max(0, daysBetween(plant.startDate, selectedDate)) }}</span>
          </h2>
          <span
            v-if="dayEntries.length"
            class="muted"
          >{{ dayEntries.length }} entr{{ dayEntries.length === 1 ? 'y' : 'ies' }}</span>
        </div>
        <EmptyState
          v-if="!dayEntries.length"
          icon="i-tabler-mood-empty"
          :title="selectedDate > todayISO() ? 'This day is in the future' : 'Nothing logged this day'"
          :text="selectedDate > todayISO() ? 'Pick today or an earlier day to log something.' : 'Use the buttons above to log watering, feeding, notes or photos.'"
        />
        <div
          v-else
          class="entry-list"
        >
          <EntryCard
            v-for="e in dayEntries"
            :key="e.id"
            :entry="e"
            @edit="edit"
            @delete="removeEntry"
            @photo="id => openEntryPhoto(e, id)"
          />
        </div>
      </div>
    </div>

    <!-- History -->
    <div
      v-else-if="tab === 'history'"
      class="tab-body"
    >
      <div
        v-if="historyTypes.length > 1"
        class="chips"
      >
        <button
          type="button"
          class="chip"
          :aria-pressed="historyFilter === null"
          @click="historyFilter = null"
        >
          All <span class="muted">{{ entries.length }}</span>
        </button>
        <button
          v-for="t in historyTypes"
          :key="t.type"
          type="button"
          class="chip"
          :aria-pressed="historyFilter === t.type"
          @click="historyFilter = historyFilter === t.type ? null : t.type"
        >
          <UIcon
            :name="t.icon"
            class="size-4"
            :style="{ color: t.color }"
          /> {{ t.label }}
        </button>
      </div>
      <EmptyState
        v-if="!historyGroups.length"
        icon="i-tabler-notebook-off"
        title="No entries yet"
        text="Everything you log shows up here as a timeline."
      />
      <div
        v-for="g in historyGroups"
        :key="g.date"
        class="history-day"
      >
        <h3 class="history-date">
          {{ formatDate(g.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
          <span>day {{ Math.max(0, daysBetween(plant.startDate, g.date)) }}</span>
        </h3>
        <div class="entry-list">
          <EntryCard
            v-for="e in g.items"
            :key="e.id"
            :entry="e"
            @edit="edit"
            @delete="removeEntry"
            @photo="id => openEntryPhoto(e, id)"
          />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div
      v-else-if="tab === 'info'"
      class="tab-body"
    >
      <section
        v-if="plant.harvest"
        class="harvest card"
      >
        <div class="section-head">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-basket"
              class="size-5"
            /> Harvest
          </h2>
          <button
            type="button"
            class="link"
            @click="openHarvest('edit')"
          >
            Edit
          </button>
        </div>
        <div class="harvest-grid">
          <div>
            <span>Harvested</span><strong>{{ formatDate(plant.harvest.date) }}</strong>
          </div>
          <div>
            <span>Wet</span><strong>{{ plant.harvest.wetWeight ?? '–' }} g</strong>
          </div>
          <div>
            <span>Dry</span><strong>{{ plant.harvest.dryWeight ?? '–' }} g</strong>
          </div>
          <div>
            <span>Dry ratio</span>
            <strong>{{ plant.harvest.wetWeight && plant.harvest.dryWeight ? `${Math.round((plant.harvest.dryWeight / plant.harvest.wetWeight) * 100)} %` : '–' }}</strong>
          </div>
        </div>
        <p
          v-if="plant.harvest.notes"
          class="muted harvest-notes"
        >
          {{ plant.harvest.notes }}
        </p>
      </section>

      <section class="card info-grid">
        <div
          v-for="d in details"
          :key="d.label"
          class="info-item"
        >
          <UIcon
            :name="d.icon"
            class="size-[18px] info-icon"
          />
          <span class="info-label">{{ d.label }}</span>
          <span class="info-value">{{ d.value }}</span>
        </div>
      </section>

      <section>
        <h2 class="section-title block-title">
          <UIcon
            name="i-tabler-timeline"
            class="size-5"
          /> Stage timeline
        </h2>
        <ol class="timeline card">
          <li
            v-for="(t, i) in timeline"
            :key="i"
            :class="{ current: t.current }"
            :style="{ '--c': t.info.color }"
          >
            <span class="tl-dot"><UIcon
              :name="t.info.icon"
              class="size-4"
            /></span>
            <div class="tl-text">
              <strong>{{ t.info.label }}</strong>
              <span>{{ formatDate(t.date) }} · {{ t.days }} day{{ t.days === 1 ? '' : 's' }}{{ t.current ? ' so far' : '' }}</span>
            </div>
          </li>
        </ol>
      </section>

      <section
        v-if="heightPoints.length"
        class="card chart-card"
      >
        <h2 class="section-title block-title">
          <UIcon
            name="i-tabler-ruler-measure"
            class="size-5"
          /> Height
          <span class="muted chart-latest">{{ heightPoints[heightPoints.length - 1]!.value }} cm</span>
        </h2>
        <LineChart
          :points="heightPoints"
          unit=" cm"
          color="#2dd4bf"
          :label="`Height over time, latest ${heightPoints[heightPoints.length - 1]!.value} cm`"
        />
      </section>

      <section class="counts">
        <div
          v-for="t in ENTRY_TYPES.filter(x => ['water', 'feed', 'train', 'photo'].includes(x.type))"
          :key="t.type"
          class="count card"
          :style="{ '--c': t.color }"
        >
          <UIcon
            :name="t.icon"
            class="size-5"
          />
          <strong>{{ counts[t.type] ?? 0 }}</strong>
          <span>{{ t.label }}</span>
        </div>
      </section>

      <section
        v-if="lastFeed"
        class="card last-feed"
      >
        <span class="info-label">Last feed · {{ formatRelativeDay(lastFeed.date) }}</span>
        <p>{{ entrySummary(lastFeed) || 'No details' }}</p>
      </section>

      <section class="card stage-tips">
        <h2 class="section-title block-title">
          <UIcon
            :name="stage.icon"
            class="size-5"
            :style="{ color: stage.color }"
          /> About {{ stage.label.toLowerCase() }}
        </h2>
        <p class="muted">
          {{ stage.description }}
        </p>
        <ul>
          <li
            v-for="t in stage.tips"
            :key="t"
          >
            {{ t }}
          </li>
        </ul>
      </section>

      <section
        v-if="plant.notes"
        class="card notes"
      >
        <span class="info-label">Notes</span>
        <p>{{ plant.notes }}</p>
      </section>
    </div>

    <!-- Photos -->
    <div
      v-else
      class="tab-body"
    >
      <div class="photo-actions">
        <button
          v-if="!plant.archived"
          type="button"
          class="btn btn-soft"
          @click="log('photo')"
        >
          <UIcon
            name="i-tabler-camera-plus"
            class="size-5"
          /> Add to journal
        </button>
        <button
          type="button"
          class="btn"
          @click="setProfilePhoto"
        >
          <UIcon
            name="i-tabler-user-circle"
            class="size-5"
          /> Profile photo
        </button>
      </div>
      <EmptyState
        v-if="!photos.length"
        icon="i-tabler-photo-off"
        title="No photos yet"
        text="A photo every week makes a great time-lapse of the grow."
      />
      <div
        v-else
        class="photo-grid"
      >
        <button
          v-for="ph in photos"
          :key="ph.photoId"
          type="button"
          class="photo-cell"
          @click="openPhotos(photos, ph.photoId)"
        >
          <PlantPhoto
            :photo-id="ph.photoId"
            :stage="plant.stage"
          />
          <span class="photo-date">{{ ph.entryId ? `Day ${Math.max(0, daysBetween(plant.startDate, ph.date))}` : 'Profile' }}</span>
        </button>
      </div>
    </div>

    <EntrySheet
      v-model:open="sheetOpen"
      :plant-id="plant.id"
      :type="sheetType"
      :date="selectedDate > todayISO() ? todayISO() : selectedDate"
      :entry="editing"
      @saved="onSaved"
    />

    <PhotoLightbox
      v-model:index="lightboxIndex"
      :items="lightboxItems"
      @delete="deletePhoto"
    />

    <BottomSheet
      v-model:open="stageSheet"
      title="Change stage"
      icon="i-tabler-arrow-big-right-lines"
    >
      <div class="form-stack">
        <div
          class="stage-list"
          role="radiogroup"
          aria-label="Stage"
        >
          <button
            v-for="s in STAGES.filter(x => GROWING_STAGES.includes(x.id))"
            :key="s.id"
            type="button"
            role="radio"
            class="stage-row"
            :aria-checked="stageChoice === s.id"
            :style="{ '--c': s.color }"
            @click="stageChoice = s.id"
          >
            <UIcon
              :name="s.icon"
              class="size-5"
            />
            <span class="stage-row-text">
              <strong>{{ s.label }}{{ s.id === plant.stage ? ' (current)' : '' }}</strong>
              <span>{{ s.range }} · light {{ s.light }}</span>
            </span>
            <UIcon
              v-if="stageChoice === s.id"
              name="i-tabler-circle-check-filled"
              class="size-5"
            />
          </button>
        </div>
        <p class="field-hint">
          Ready to chop? Use <strong>Harvest</strong> on a flowering plant to record weights.
        </p>
        <div class="field">
          <label
            class="field-label"
            for="stage-date"
          >Since</label>
          <input
            id="stage-date"
            v-model="stageDate"
            type="date"
            class="input"
            :max="todayISO()"
            :min="stageStartDate(plant)"
          >
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="stageSheet = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="stageChoice === plant.stage"
          @click="applyStage"
        >
          Save stage
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="harvestSheet"
      :title="harvestMode === 'harvest' ? 'Harvest' : harvestMode === 'dry' ? 'Dry weight' : 'Edit harvest'"
      :icon="harvestMode === 'dry' ? 'i-tabler-scale' : 'i-tabler-basket'"
      icon-color="#facc15"
    >
      <form
        class="form-stack"
        @submit.prevent="saveHarvest"
      >
        <p
          v-if="harvestMode === 'harvest'"
          class="muted intro"
        >
          Weigh the plant right after chopping. You can add the dry weight once it has dried.
        </p>
        <p
          v-if="harvestMode === 'dry'"
          class="muted intro"
        >
          Small stems snap instead of bend? Weigh the dried buds before jarring.
        </p>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="h-wet"
            >Wet weight (g)</label>
            <input
              id="h-wet"
              v-model.number="harvestForm.wet"
              class="input"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="h-dry"
            >Dry weight (g)</label>
            <input
              id="h-dry"
              v-model.number="harvestForm.dry"
              class="input"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="h-date"
          >Harvest date</label>
          <input
            id="h-date"
            v-model="harvestForm.date"
            type="date"
            class="input"
            :max="todayISO()"
            :min="harvestMode === 'harvest' ? stageStartDate(plant) : plant.startDate"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            for="h-notes"
          >Notes</label>
          <textarea
            id="h-notes"
            v-model="harvestForm.notes"
            class="input"
            rows="3"
            placeholder="Trichome colour, smell, bud density…"
          />
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="harvestSheet = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveHarvest"
        >
          <UIcon
            name="i-tabler-check"
            class="size-5"
          /> Save
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="moreSheet"
      :title="plant.name"
    >
      <div class="menu">
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; openStageSheet()"
        >
          <UIcon
            name="i-tabler-arrow-big-right-lines"
            class="size-5"
          /> Change stage
        </button>
        <button
          v-if="plant.harvest"
          type="button"
          class="menu-item"
          @click="moreSheet = false; openHarvest('edit')"
        >
          <UIcon
            name="i-tabler-basket"
            class="size-5"
          /> Edit harvest
        </button>
        <button
          type="button"
          class="menu-item"
          @click="moreSheet = false; setProfilePhoto()"
        >
          <UIcon
            name="i-tabler-photo-edit"
            class="size-5"
          /> Change profile photo
        </button>
        <button
          type="button"
          class="menu-item"
          @click="duplicate"
        >
          <UIcon
            name="i-tabler-copy"
            class="size-5"
          /> Duplicate plant
        </button>
        <button
          type="button"
          class="menu-item"
          @click="toggleArchive"
        >
          <UIcon
            :name="plant.archived ? 'i-tabler-archive-off' : 'i-tabler-archive'"
            class="size-5"
          />
          {{ plant.archived ? 'Restore from archive' : 'Move to archive' }}
        </button>
        <button
          type="button"
          class="menu-item danger"
          @click="removePlant"
        >
          <UIcon
            name="i-tabler-trash"
            class="size-5"
          /> Delete plant
        </button>
      </div>
    </BottomSheet>
  </div>

  <div v-else>
    <AppHeader
      title="Plant not found"
      back
    />
    <div class="page">
      <EmptyState
        icon="i-tabler-plant-off"
        title="This plant does not exist"
        text="It may have been deleted."
      >
        <NuxtLink
          to="/plants"
          class="btn btn-soft"
        >
          Back to plants
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  height: 300px;
  overflow: hidden;
}

.hero-img {
  position: absolute;
  inset: 0;
}

.hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.55) 0%, rgba(10, 10, 10, 0) 30%, rgba(10, 10, 10, 0.4) 60%, var(--bg) 100%);
}

.hero-bar {
  position: absolute;
  top: calc(12px + var(--safe-top));
  left: 14px;
  right: 14px;
  display: flex;
  justify-content: space-between;
}

.hero-bar-right {
  display: flex;
  gap: 8px;
}

.glass-btn {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
}

.glass-btn:active {
  transform: scale(0.92);
}

.hero-info {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 14px;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.badge.archived {
  color: var(--text-2);
  background: rgba(10, 10, 10, 0.7);
}

.badge.health {
  background: rgba(10, 10, 10, 0.7);
  border-color: color-mix(in srgb, currentColor 40%, transparent);
}

h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  overflow-wrap: anywhere;
}

.hero-strain {
  margin: 2px 0 0;
  color: #cfd4cd;
  font-size: 14px;
}

.stage-card {
  margin: 4px 16px 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stage-top {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.stage-label {
  margin: 0;
  font-weight: 700;
}

.stage-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.stage-sub.overdue {
  color: #fbbf24;
}

.next-btn {
  min-height: 38px;
  padding: 0 12px;
  font-size: 13px;
  flex-shrink: 0;
}

.water-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--info);
}

.water-line.urgent {
  color: #fbbf24;
  font-weight: 600;
}

.tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 4px;
  margin-top: 14px;
  padding: 8px 16px;
  background: rgba(10, 10, 10, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}

.tab[aria-selected="true"] {
  color: var(--accent);
  background: var(--accent-soft);
}

.tab-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 2px 10px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--c) 25%, transparent);
  background: color-mix(in srgb, var(--c) 8%, var(--surface));
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  transition: transform 0.15s ease;
}

.action:active:not(:disabled) {
  transform: scale(0.94);
}

.action:disabled {
  opacity: 0.4;
}

.action-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent);
}

.day-of {
  font-size: 14px;
  font-weight: 500;
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-day {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-date {
  display: flex;
  justify-content: space-between;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
}

.history-date span {
  font-weight: 500;
  color: var(--text-3);
}

.harvest {
  padding: 14px;
  border-color: rgba(250, 204, 21, 0.3);
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.07), var(--surface) 70%);
}

.harvest .section-title :deep(span[class*="i-"]) {
  color: #facc15;
}

.harvest-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.harvest-grid div {
  display: flex;
  flex-direction: column;
}

.harvest-grid span {
  font-size: 12px;
  color: var(--text-2);
}

.harvest-grid strong {
  font-size: 17px;
}

.harvest-notes {
  margin: 12px 0 0;
  font-size: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  overflow: hidden;
  background: var(--line);
}

.info-item {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 8px;
  padding: 12px;
  background: var(--surface);
}

.info-item:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}

.info-icon {
  grid-row: span 2;
  color: var(--accent);
  margin-top: 2px;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.block-title {
  margin-bottom: 10px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timeline li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline li:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 15px;
  top: 34px;
  height: 12px;
  width: 2px;
  background: var(--line-strong);
}

.tl-dot {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent);
}

.timeline li.current .tl-dot {
  box-shadow: 0 0 0 2px var(--c);
}

.tl-text {
  display: flex;
  flex-direction: column;
}

.tl-text span {
  font-size: 12px;
  color: var(--text-2);
}

.chart-card {
  padding: 14px;
}

.chart-latest {
  margin-left: auto;
  font-size: 14px;
  font-weight: 600;
}

.counts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 4px;
  color: var(--c);
}

.count strong {
  margin-top: 4px;
  font-size: 18px;
  color: var(--text);
}

.count > span:last-child {
  font-size: 11px;
  color: var(--text-3);
}

.last-feed,
.notes,
.stage-tips {
  padding: 14px;
}

.last-feed p,
.notes p {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.stage-tips p {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
}

.stage-tips ul {
  list-style: disc;
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.7;
}

.photo-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.photo-actions .btn {
  font-size: 14px;
  padding: 0 10px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  border-radius: var(--radius);
  overflow: hidden;
}

.photo-cell {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: var(--surface-2);
}

.photo-date {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.65);
  font-size: 11px;
  font-weight: 600;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--line);
  background: var(--surface);
  color: var(--c);
  text-align: left;
}

.stage-row[aria-checked="true"] {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 10%, var(--surface));
}

.stage-row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  color: var(--text);
}

.stage-row-text span {
  font-size: 12px;
  color: var(--text-2);
}

.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.menu {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(6px + var(--safe-bottom));
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 0 6px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  text-align: left;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-item .iconify,
.menu-item :deep(span[class*="i-"]) {
  color: var(--text-2);
}

.menu-item.danger,
.menu-item.danger :deep(span[class*="i-"]) {
  color: #ff8080;
}
</style>
