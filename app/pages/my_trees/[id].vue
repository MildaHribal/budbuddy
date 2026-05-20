<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { usePlants } from '~/composables/usePlants'
import { usePlantJournal } from '~/composables/usePlantJournal'
import type { JournalEntryType } from '~/composables/usePlantJournal'

const route = useRoute()
const router = useRouter()
const { plants, loadPlantsFromStorage, editPlant, deletePlant } = usePlants()

// ── Route & plant ────────────────────────────────
const plantId = route.params.id as string
onMounted(() => loadPlantsFromStorage())

const plant = computed(
  () => plants.value.find(p => String(p.id) === String(plantId)) ?? null
)

// ── Journal composable ───────────────────────────
const journal = usePlantJournal(plantId)

// ── Date selector ────────────────────────────────
const selectedDate = ref(localToday())
function localToday() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// Week: Mon – Sun
function buildWeek() {
  const base = new Date(selectedDate.value + 'T12:00:00')
  const dow = base.getDay() === 0 ? 6 : base.getDay() - 1
  const mon = new Date(base)
  mon.setDate(base.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    const off = d.getTimezoneOffset()
    const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
    const short = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)
    return { iso, day: d.getDate(), label: short }
  })
}
const week = computed(() => buildWeek())

function selectDate(iso: string) {
  selectedDate.value = iso
}
function prevWeek() {
  const d = new Date(selectedDate.value + 'T12:00:00')
  d.setDate(d.getDate() - 7)
  const off = d.getTimezoneOffset()
  selectedDate.value = new Date(d.getTime() - off * 60000)
    .toISOString()
    .slice(0, 10)
}
function nextWeek() {
  const d = new Date(selectedDate.value + 'T12:00:00')
  d.setDate(d.getDate() + 7)
  const off = d.getTimezoneOffset()
  selectedDate.value = new Date(d.getTime() - off * 60000)
    .toISOString()
    .slice(0, 10)
}

// ── Tab navigation ───────────────────────────────
type Tab = 'journal' | 'info' | 'gallery'
const activeTab = ref<Tab>('journal')

// ── Journal entries for selected date ───────────
const todayEntries = computed(() => journal.entriesForDate(selectedDate.value))
const allPhotos = computed(() => journal.allPhotos())

// ── Action buttons ───────────────────────────────
interface ActionBtn {
  key: JournalEntryType
  label: string
  icon: string
  color: string
  bg: string
}
const actionButtons: ActionBtn[] = [
  {
    key: 'water',
    label: 'Water',
    icon: 'tabler:droplet-filled',
    color: '#4fc3f7',
    bg: 'rgba(79,195,247,0.15)'
  },
  {
    key: 'nutrients',
    label: 'Nutrients',
    icon: 'tabler:flask',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.15)'
  },
  {
    key: 'trim',
    label: 'Trim',
    icon: 'tabler:cut',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.15)'
  },
  {
    key: 'repellent',
    label: 'Repellent',
    icon: 'tabler:bug',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.15)'
  },
  {
    key: 'note',
    label: 'Note',
    icon: 'tabler:notes',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.15)'
  },
  {
    key: 'photo',
    label: 'Photo',
    icon: 'tabler:camera',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.15)'
  }
]

const entryColors: Record<JournalEntryType, string> = {
  water: '#4fc3f7',
  nutrients: '#a78bfa',
  trim: '#34d399',
  repellent: '#f97316',
  note: '#fbbf24',
  photo: '#ec4899'
}
const entryIcons: Record<JournalEntryType, string> = {
  water: 'tabler:droplet-filled',
  nutrients: 'tabler:flask',
  trim: 'tabler:cut',
  repellent: 'tabler:bug',
  note: 'tabler:notes',
  photo: 'tabler:camera'
}

// ── Note modal ────────────────────────────────────
const showNoteModal = ref(false)
const noteText = ref('')
const noteEditId = ref<string | null>(null)
const noteAmount = ref('')

function openNoteModal(id?: string) {
  noteEditId.value = id ?? null
  if (id) {
    const e = journal.entries.value.find(x => x.id === id)
    noteText.value = e?.note ?? ''
    noteAmount.value = e?.amount ?? ''
  } else {
    noteText.value = ''
    noteAmount.value = ''
  }
  showNoteModal.value = true
  nextTick(() =>
    (document.querySelector('.note-textarea') as HTMLTextAreaElement)?.focus()
  )
}

async function saveNote() {
  if (!noteText.value.trim()) return
  if (noteEditId.value) {
    await journal.updateEntry(noteEditId.value, {
      note: noteText.value.trim(),
      amount: noteAmount.value.trim()
    })
  } else {
    await journal.addEntry({
      type: 'note',
      date: selectedDate.value,
      note: noteText.value.trim(),
      amount: noteAmount.value.trim()
    })
  }
  showNoteModal.value = false
  noteText.value = ''
  noteAmount.value = ''
  noteEditId.value = null
}

// ── Amount modal (for water / nutrients) ───────────
const showAmountModal = ref(false)
const amountModalType = ref<JournalEntryType>('water')
const amountValue = ref('')

function openAmountModal(type: JournalEntryType) {
  amountModalType.value = type
  amountValue.value = ''
  showAmountModal.value = true
  nextTick(() =>
    (document.querySelector('.amount-input') as HTMLInputElement)?.focus()
  )
}

async function saveAmount() {
  await journal.addEntry({
    type: amountModalType.value,
    date: selectedDate.value,
    amount: amountValue.value.trim()
  })
  showAmountModal.value = false
}

// Water/nutrients ask for an amount first; other actions log immediately.
async function handleAction(key: JournalEntryType) {
  if (key === 'note') {
    openNoteModal()
    return
  }
  if (key === 'photo') {
    triggerPhotoPicker()
    return
  }
  if (key === 'water' || key === 'nutrients') {
    openAmountModal(key)
    return
  }
  await journal.addEntry({ type: key, date: selectedDate.value })
}

// ── Photo picker ──────────────────────────────────
const photoInputRef = ref<HTMLInputElement | null>(null)
function triggerPhotoPicker() {
  photoInputRef.value?.click()
}

async function onPhotoSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const base64 = ev.target?.result as string
    await journal.addEntry({
      type: 'photo',
      date: selectedDate.value,
      photo: base64
    })
  }
  reader.readAsDataURL(file);
  (e.target as HTMLInputElement).value = ''
}

// ── Lightbox ──────────────────────────────────────
const lightboxPhoto = ref<string | null>(null)

// ── Delete entry ──────────────────────────────────
async function deleteEntry(id: string) {
  await journal.removeEntry(id)
}

// ── Plant helpers ─────────────────────────────────
function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}
function getStageTotalDays(stage: string): number {
  return (
    { Germination: 7, Seedling: 21, Vegetative: 56, Flowering: 63 }[
      stage as never
    ] ?? 30
  )
}
function getStageColor(stage: string): string {
  return (
    {
      Germination: '#9fe76d',
      Seedling: '#7bc74d',
      Vegetative: '#4fc3f7',
      Flowering: '#f472b6'
    }[stage as never] ?? '#7bc74d'
  )
}
function getStageIcon(stage: string): string {
  return (
    {
      Germination: 'tabler:seeding',
      Seedling: 'tabler:plant',
      Vegetative: 'tabler:tree',
      Flowering: 'tabler:flower'
    }[stage as never] ?? 'tabler:plant'
  )
}

const plantStage = computed(() => plant.value?.stage ?? 'Seedling')
const plantDate = computed(
  () => plant.value?.plantingDate ?? plant.value?.createdAt ?? ''
)
const daysInGrow = computed(() => getDaysSince(plantDate.value))
const stagePct = computed(() =>
  Math.min(
    100,
    Math.round((daysInGrow.value / getStageTotalDays(plantStage.value)) * 100)
  )
)

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ── Entry label ───────────────────────────────────
function entryLabel(type: JournalEntryType): string {
  return (
    {
      water: 'Watered',
      nutrients: 'Nutrients',
      trim: 'Trimmed',
      repellent: 'Repellent',
      note: 'Note',
      photo: 'Photo'
    }[type] ?? type
  )
}

// Format time
function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const goBack = () => router.push('/my-trees')

// ── Edit Plant Modal ──────────────────────────────
const showEditModal = ref(false)
const editForm = ref({
  name: '',
  strain: '',
  potSize: '',
  location: '',
  medium: '',
  plantingDate: '',
  stage: ''
})

function openEditModal() {
  if (!plant.value) return

  editForm.value = {
    name: plant.value.name,
    strain: plant.value.strain || '',
    potSize: plant.value.potSize || '',
    location: plant.value.location || '',
    medium: plant.value.medium || '',
    plantingDate: plant.value.plantingDate || '',
    stage: plant.value.stage || 'Seedling'
  }
  showEditModal.value = true
}

function saveEdit() {
  if (!plant.value) return

  editPlant(plantId, editForm.value)
  showEditModal.value = false
}

function handleDeletePlant() {
  if (confirm('Are you sure you want to delete this plant?')) {
    deletePlant(plantId)
    router.push('/my-trees')
  }
}
</script>

<template>
  <div class="detail-page">
    <!-- ═══════════════════════════════════════════
         LOADING / NOT FOUND
    ═══════════════════════════════════════════ -->
    <div
      v-if="!plant && plants.length === 0"
      class="state-screen"
    >
      <div class="spinner" />
      <p>Loading…</p>
    </div>
    <div
      v-else-if="!plant"
      class="state-screen"
    >
      <Icon
        icon="tabler:plant-off"
        :height="64"
        style="color: #555"
      />
      <h2>Plant not found</h2>
      <button
        class="btn-accent"
        @click="goBack"
      >
        <Icon
          icon="tabler:arrow-left"
          :height="18"
        /> Go back
      </button>
    </div>

    <!-- ═══════════════════════════════════════════
         MAIN CONTENT
    ═══════════════════════════════════════════ -->
    <template v-else>
      <!-- ── Hero image ──────────────────────────── -->
      <div class="hero">
        <!-- bg photo or gradient -->
        <img
          v-if="plant.photoPreview"
          :src="plant.photoPreview"
          class="hero-img"
          :alt="plant.name"
        >
        <div
          v-else
          class="hero-gradient"
          :style="{
            background: `linear-gradient(135deg, ${getStageColor(plantStage)}22 0%, #0a0a0a 100%)`
          }"
        />

        <!-- overlay -->
        <div class="hero-overlay" />

        <!-- back button -->
        <button
          class="back-btn"
          @click="goBack"
        >
          <Icon
            icon="tabler:arrow-left"
            :height="22"
          />
        </button>

        <!-- edit button -->
        <button
          class="edit-btn"
          @click="openEditModal"
        >
          <Icon
            icon="tabler:pencil"
            :height="20"
          />
        </button>

        <!-- stage badge -->
        <div
          class="stage-badge"
          :style="{
            background: getStageColor(plantStage) + '22',
            borderColor: getStageColor(plantStage) + '66',
            color: getStageColor(plantStage)
          }"
        >
          <Icon
            :icon="getStageIcon(plantStage)"
            :height="14"
          />
          <span>{{ plantStage }}</span>
        </div>

        <!-- hero info -->
        <div class="hero-info">
          <h1 class="hero-name">
            {{ plant.name || "Unnamed Plant" }}
          </h1>
          <p class="hero-strain">
            {{ (plant as any).strain || "Unknown strain" }}
          </p>

          <!-- Progress -->
          <div class="hero-progress">
            <div class="progress-labels">
              <span>Day {{ daysInGrow }}</span>
              <span>{{ stagePct }}% of {{ getStageTotalDays(plantStage) }}d
                phase</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{
                  width: stagePct + '%',
                  background: getStageColor(plantStage)
                }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Tab navigation ─────────────────────── -->
      <div class="tab-bar">
        <button
          v-for="t in ['journal', 'info', 'gallery'] as Tab[]"
          :key="t"
          :class="['tab-btn', { active: activeTab === t }]"
          @click="activeTab = t"
        >
          <Icon
            :icon="
              t === 'journal'
                ? 'tabler:notebook'
                : t === 'info'
                  ? 'tabler:info-circle'
                  : 'tabler:photo'
            "
            :height="18"
          />
          <span>{{
            t === "journal" ? "Journal" : t === "info" ? "Info" : "Gallery"
          }}</span>
        </button>
      </div>

      <!-- ════════════════════════════════════════
           TAB: JOURNAL
      ════════════════════════════════════════ -->
      <div
        v-show="activeTab === 'journal'"
        class="tab-content"
      >
        <!-- Week date picker -->
        <div class="week-picker">
          <button
            class="week-nav"
            @click="prevWeek"
          >
            <Icon
              icon="tabler:chevron-left"
              :height="18"
            />
          </button>
          <div class="week-days">
            <button
              v-for="d in week"
              :key="d.iso"
              :class="[
                'day-btn',
                {
                  active: d.iso === selectedDate,
                  today: d.iso === localToday()
                }
              ]"
              @click="selectDate(d.iso)"
            >
              <span class="day-letter">{{ d.label }}</span>
              <span class="day-num">{{ d.day }}</span>
            </button>
          </div>
          <button
            class="week-nav"
            @click="nextWeek"
          >
            <Icon
              icon="tabler:chevron-right"
              :height="18"
            />
          </button>
        </div>

        <!-- Action buttons grid -->
        <div class="actions-grid">
          <button
            v-for="btn in actionButtons"
            :key="btn.key"
            class="action-btn"
            :style="{ '--c': btn.color, '--bg': btn.bg }"
            @click="handleAction(btn.key)"
          >
            <div class="action-btn-icon">
              <Icon
                :icon="btn.icon"
                :height="24"
              />
            </div>
            <span>{{ btn.label }}</span>
          </button>
        </div>

        <!-- Entries for selected date -->
        <div class="entries-section">
          <div class="entries-header">
            <Icon
              icon="tabler:list"
              :height="16"
            />
            <span>{{ fmtDate(selectedDate) }}</span>
            <span
              v-if="todayEntries.length"
              class="entries-count"
            >{{
              todayEntries.length
            }}</span>
          </div>

          <div
            v-if="todayEntries.length === 0"
            class="entries-empty"
          >
            <Icon
              icon="tabler:mood-empty"
              :height="36"
            />
            <p>
              No entries for this day.<br>Use the actions above to log
              something.
            </p>
          </div>

          <div
            v-else
            class="entries-list"
          >
            <div
              v-for="entry in todayEntries"
              :key="entry.id"
              class="entry-card"
            >
              <!-- Type indicator line -->
              <div
                class="entry-line"
                :style="{ background: entryColors[entry.type] }"
              />

              <div class="entry-body">
                <div class="entry-left">
                  <div
                    class="entry-icon-wrap"
                    :style="{ background: entryColors[entry.type] + '22' }"
                  >
                    <Icon
                      :icon="entryIcons[entry.type]"
                      :height="18"
                      :style="{ color: entryColors[entry.type] }"
                    />
                  </div>
                  <div class="entry-text">
                    <div class="entry-label">
                      {{ entryLabel(entry.type) }}
                      <span
                        v-if="entry.amount"
                        class="entry-amount"
                      >· {{ entry.amount }}</span>
                    </div>
                    <div
                      v-if="entry.note"
                      class="entry-note"
                    >
                      {{ entry.note }}
                    </div>
                    <div class="entry-time">
                      {{ fmtTime(entry.createdAt) }}
                    </div>
                  </div>
                </div>

                <div class="entry-actions">
                  <button
                    v-if="entry.type === 'note'"
                    class="entry-action-btn"
                    @click="openNoteModal(entry.id)"
                  >
                    <Icon
                      icon="tabler:pencil"
                      :height="15"
                    />
                  </button>
                  <button
                    v-if="entry.photo"
                    class="entry-action-btn"
                    @click="lightboxPhoto = entry.photo!"
                  >
                    <Icon
                      icon="tabler:eye"
                      :height="15"
                    />
                  </button>
                  <button
                    class="entry-action-btn danger"
                    @click="deleteEntry(entry.id)"
                  >
                    <Icon
                      icon="tabler:trash"
                      :height="15"
                    />
                  </button>
                </div>
              </div>

              <!-- photo thumbnail -->
              <img
                v-if="entry.photo"
                :src="entry.photo"
                class="entry-photo"
                @click="lightboxPhoto = entry.photo"
              >
            </div>
          </div>
        </div>
      </div>
      <!-- /journal tab -->

      <!-- ════════════════════════════════════════
           TAB: INFO
      ════════════════════════════════════════ -->
      <div
        v-show="activeTab === 'info'"
        class="tab-content"
      >
        <div class="info-card">
          <div class="info-row">
            <div class="info-label">
              <Icon
                icon="tabler:plant"
                :height="16"
              /> Strain
            </div>
            <div class="info-val">
              {{ (plant as any).strain || "—" }}
            </div>
          </div>

          <div
            v-if="(plant as any).potSize"
            class="info-row"
          >
            <div class="info-label">
              <Icon
                icon="tabler:bucket"
                :height="16"
              /> Pot size
            </div>
            <div class="info-val">
              {{ (plant as any).potSize }}
            </div>
          </div>

          <div
            v-if="(plant as any).location"
            class="info-row"
          >
            <div class="info-label">
              <Icon
                icon="tabler:home"
                :height="16"
              /> Location
            </div>
            <div
              class="info-val"
              style="text-transform: capitalize"
            >
              {{ (plant as any).location }}
            </div>
          </div>

          <div
            v-if="(plant as any).medium"
            class="info-row"
          >
            <div class="info-label">
              <Icon
                icon="tabler:droplet"
                :height="16"
              /> Medium
            </div>
            <div
              class="info-val"
              style="text-transform: capitalize"
            >
              {{ (plant as any).medium }}
            </div>
          </div>

          <div
            v-if="(plant as any).plantingDate"
            class="info-row"
          >
            <div class="info-label">
              <Icon
                icon="tabler:calendar"
                :height="16"
              /> Planted
            </div>
            <div class="info-val">
              {{ fmtDate((plant as any).plantingDate) }}
            </div>
          </div>

          <div class="info-row">
            <div class="info-label">
              <Icon
                icon="tabler:calendar-time"
                :height="16"
              /> Day in grow
            </div>
            <div class="info-val">
              Day {{ daysInGrow }}
            </div>
          </div>

          <div class="info-row">
            <div class="info-label">
              <Icon
                icon="tabler:chart-line"
                :height="16"
              /> Stage progress
            </div>
            <div class="info-val">
              {{ stagePct }}%
            </div>
          </div>
        </div>

        <!-- Stage progress bar (info context) -->
        <div class="info-progress-block">
          <div class="info-progress-header">
            <div
              class="stage-pill"
              :style="{
                color: getStageColor(plantStage),
                background: getStageColor(plantStage) + '22',
                borderColor: getStageColor(plantStage) + '44'
              }"
            >
              <Icon
                :icon="getStageIcon(plantStage)"
                :height="14"
              />
              {{ plantStage }}
            </div>
            <span class="stage-pct">{{ stagePct }}%</span>
          </div>
          <div class="big-track">
            <div
              class="big-fill"
              :style="{
                width: stagePct + '%',
                background: getStageColor(plantStage)
              }"
            />
          </div>
          <div class="big-labels">
            <span>Day {{ daysInGrow }}</span>
            <span>{{ getStageTotalDays(plantStage) }} days total</span>
          </div>
        </div>

        <!-- Journal stats -->
        <div class="journal-stats">
          <div class="jstat">
            <Icon
              icon="tabler:droplet-filled"
              :height="20"
              style="color: #4fc3f7"
            />
            <span class="jstat-num">{{
              journal.entries.value.filter((e) => e.type === "water").length
            }}</span>
            <span class="jstat-label">Waterings</span>
          </div>
          <div class="jstat">
            <Icon
              icon="tabler:flask"
              :height="20"
              style="color: #a78bfa"
            />
            <span class="jstat-num">{{
              journal.entries.value.filter((e) => e.type === "nutrients").length
            }}</span>
            <span class="jstat-label">Feedings</span>
          </div>
          <div class="jstat">
            <Icon
              icon="tabler:cut"
              :height="20"
              style="color: #34d399"
            />
            <span class="jstat-num">{{
              journal.entries.value.filter((e) => e.type === "trim").length
            }}</span>
            <span class="jstat-label">Trims</span>
          </div>
          <div class="jstat">
            <Icon
              icon="tabler:camera"
              :height="20"
              style="color: #ec4899"
            />
            <span class="jstat-num">{{
              journal.entries.value.filter((e) => e.type === "photo").length
            }}</span>
            <span class="jstat-label">Photos</span>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           TAB: GALLERY
      ════════════════════════════════════════ -->
      <div
        v-show="activeTab === 'gallery'"
        class="tab-content"
      >
        <div
          v-if="allPhotos.length === 0"
          class="gallery-empty"
        >
          <Icon
            icon="tabler:photo-off"
            :height="52"
          />
          <p>No photos yet</p>
          <button
            class="btn-accent"
            @click="
              activeTab = 'journal';
              triggerPhotoPicker();
            "
          >
            <Icon
              icon="tabler:camera"
              :height="16"
            /> Add first photo
          </button>
        </div>

        <div
          v-else
          class="gallery-grid"
        >
          <div
            v-for="entry in allPhotos"
            :key="entry.id"
            class="gallery-item"
            @click="lightboxPhoto = entry.photo!"
          >
            <img
              :src="entry.photo!"
              :alt="'Photo ' + entry.date"
            >
            <div class="gallery-date">
              {{ fmtDate(entry.date) }}
            </div>
          </div>
        </div>
      </div>
    </template><!-- /main content -->

    <!-- ═══════════════════════════════════════════
         NOTE MODAL
    ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showNoteModal"
        class="modal-overlay"
        @click.self="showNoteModal = false"
      >
        <div class="modal-sheet">
          <div class="modal-handle" />
          <h3 class="modal-title">
            {{ noteEditId ? "Edit note" : "Add note" }}
          </h3>

          <textarea
            v-model="noteText"
            class="note-textarea"
            placeholder="Write your observation…"
            rows="5"
          />

          <input
            v-model="noteAmount"
            type="text"
            class="modal-input"
            placeholder="Amount (optional, e.g. 500 ml)"
          >

          <div class="modal-footer">
            <button
              class="modal-cancel"
              @click="showNoteModal = false"
            >
              Cancel
            </button>
            <button
              class="modal-save"
              :disabled="!noteText.trim()"
              @click="saveNote"
            >
              <Icon
                icon="tabler:check"
                :height="18"
              /> Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════════════════════════════════════
         AMOUNT MODAL
    ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showAmountModal"
        class="modal-overlay"
        @click.self="showAmountModal = false"
      >
        <div class="modal-sheet">
          <div class="modal-handle" />
          <div
            class="modal-icon-header"
            :style="{
              color: amountModalType === 'water' ? '#4fc3f7' : '#a78bfa'
            }"
          >
            <Icon
              :icon="
                amountModalType === 'water'
                  ? 'tabler:droplet-filled'
                  : 'tabler:flask'
              "
              :height="36"
            />
          </div>
          <h3 class="modal-title">
            Log {{ amountModalType === "water" ? "watering" : "nutrients" }}
          </h3>

          <input
            v-model="amountValue"
            type="text"
            class="modal-input amount-input"
            :placeholder="
              amountModalType === 'water'
                ? 'Amount (e.g. 500 ml)'
                : 'Dose (e.g. 5 ml/L)'
            "
            @keyup.enter="saveAmount"
          >

          <div class="modal-footer">
            <button
              class="modal-cancel"
              @click="showAmountModal = false"
            >
              Cancel
            </button>
            <button
              class="modal-save"
              @click="saveAmount"
            >
              <Icon
                icon="tabler:check"
                :height="18"
              /> Log
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════════════════════════════════════
         EDIT PLANT MODAL
    ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showEditModal"
        class="modal-overlay"
        @click.self="showEditModal = false"
      >
        <div class="modal-sheet">
          <div class="modal-handle" />
          <h3 class="modal-title">
            Edit Plant
          </h3>

          <div class="edit-form">
            <label>Name</label>
            <input
              v-model="editForm.name"
              type="text"
              class="modal-input"
              placeholder="Plant Name"
            >

            <label>Strain</label>
            <input
              v-model="editForm.strain"
              type="text"
              class="modal-input"
              placeholder="Strain"
            >

            <label>Pot Size</label>
            <input
              v-model="editForm.potSize"
              type="text"
              class="modal-input"
              placeholder="Pot Size"
            >

            <label>Location</label>
            <select
              v-model="editForm.location"
              class="modal-input"
            >
              <option value="indoor">
                Indoor
              </option>
              <option value="outdoor">
                Outdoor
              </option>
              <option value="greenhouse">
                Greenhouse
              </option>
            </select>

            <label>Medium</label>
            <select
              v-model="editForm.medium"
              class="modal-input"
            >
              <option value="soil">
                Soil
              </option>
              <option value="coco">
                Coco
              </option>
              <option value="hydro">
                Hydroponics
              </option>
            </select>

            <label>Stage</label>
            <select
              v-model="editForm.stage"
              class="modal-input"
            >
              <option value="Germination">
                Germination
              </option>
              <option value="Seedling">
                Seedling
              </option>
              <option value="Vegetative">
                Vegetative
              </option>
              <option value="Flowering">
                Flowering
              </option>
            </select>
          </div>

          <div class="modal-footer">
            <button
              class="modal-cancel danger"
              @click="handleDeletePlant"
            >
              <Icon
                icon="tabler:trash"
                :height="18"
              /> Delete
            </button>
            <button
              class="modal-save"
              @click="saveEdit"
            >
              <Icon
                icon="tabler:check"
                :height="18"
              /> Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════════════════════════════════════
         LIGHTBOX
    ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="lightboxPhoto"
        class="lightbox"
        @click="lightboxPhoto = null"
      >
        <button class="lightbox-close">
          <Icon
            icon="tabler:x"
            :height="24"
          />
        </button>
        <img
          :src="lightboxPhoto"
          class="lightbox-img"
        >
      </div>
    </Teleport>

    <!-- hidden file input for photo -->
    <input
      ref="photoInputRef"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onPhotoSelected"
    >
  </div>
</template>

<style scoped>
/* ── Base ─────────────────────────────────── */
.detail-page {
  width: 100%;
  min-height: 100vh;
  background: #0a0a0a;
  padding-bottom: calc(90px + env(safe-area-inset-bottom));
}

/* ── State screens ────────────────────────── */
.state-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 70vh;
  color: #666;
  text-align: center;
  padding: 40px;
}
.state-screen h2 {
  color: #fff;
  font-size: 22px;
}
.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(123, 199, 77, 0.2);
  border-top-color: #7bc74d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Hero ─────────────────────────────────── */
.hero {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}
.hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-gradient {
  position: absolute;
  inset: 0;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.3) 0%,
    rgba(0, 0, 0, 0.1) 30%,
    rgba(0, 0, 0, 0.7) 75%,
    rgba(10, 10, 10, 1) 100%
  );
}

.back-btn {
  position: absolute;
  top: max(env(safe-area-inset-top), 16px);
  left: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.back-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.15);
}

.edit-btn {
  position: absolute;
  top: max(env(safe-area-inset-top), 16px);
  right: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.edit-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.15);
}

.stage-badge {
  position: absolute;
  top: max(env(safe-area-inset-top), 16px);
  right: 64px; /* Adjusted to be left of edit button */
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(10px);
}

.hero-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  padding: 16px 20px 20px;
}
.hero-name {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.hero-strain {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0 0 14px;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
}
.progress-track {
  height: 5px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px currentColor;
  min-width: 5px;
}

/* ── Tab bar ──────────────────────────────── */
.tab-bar {
  display: flex;
  background: #111;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  position: sticky;
  top: 0;
  z-index: 20;
}
.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: transparent;
  border: none;
  color: #666;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  -webkit-tap-highlight-color: transparent;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tab-btn.active {
  color: #7bc74d;
  border-bottom-color: #7bc74d;
}

/* ── Tab content ─────────────────────────── */
.tab-content {
  padding: 20px 16px;
}

/* ── Week date picker ─────────────────────── */
.week-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
}
.week-nav {
  flex-shrink: 0;
  width: 32px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #555;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.week-nav:active {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.week-days {
  flex: 1;
  display: flex;
  gap: 4px;
  justify-content: space-between;
}
.day-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 2px;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.day-btn.today .day-num {
  color: #7bc74d;
}
.day-btn.active {
  background: rgba(123, 199, 77, 0.12);
}
.day-btn.active .day-num {
  background: #7bc74d;
  color: #000;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
.day-btn.active .day-letter {
  color: #7bc74d;
}
.day-letter {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.day-num {
  font-size: 16px;
  font-weight: 700;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
}

/* ── Action buttons grid ──────────────────── */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.95),
    rgba(18, 18, 18, 0.95)
  );
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  color: var(--c, #7bc74d);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}
.action-btn:active {
  transform: scale(0.94);
  border-color: var(--c, #7bc74d);
}
.action-btn-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, rgba(123, 199, 77, 0.12));
  border-radius: 14px;
}

/* ── Entries section ──────────────────────── */
.entries-section {
  margin-top: 8px;
}
.entries-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
.entries-count {
  background: rgba(123, 199, 77, 0.2);
  color: #7bc74d;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
}
.entries-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 24px;
  color: #555;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  background: rgba(30, 30, 30, 0.5);
  border: 1px dashed rgba(123, 199, 77, 0.15);
  border-radius: 16px;
}
.entries-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-card {
  background: linear-gradient(
    135deg,
    rgba(28, 28, 28, 0.95),
    rgba(18, 18, 18, 0.95)
  );
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.entry-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.entry-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 12px 12px 16px;
  gap: 10px;
}
.entry-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}
.entry-icon-wrap {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.entry-text {
  flex: 1;
  min-width: 0;
}
.entry-label {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}
.entry-amount {
  font-size: 12px;
  font-weight: 500;
  color: #aaa;
}
.entry-note {
  font-size: 13px;
  color: #bbb;
  line-height: 1.5;
  margin-bottom: 4px;
  white-space: pre-wrap;
}
.entry-time {
  font-size: 11px;
  color: #555;
}
.entry-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}
.entry-action-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #555;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.entry-action-btn:active {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.entry-action-btn.danger:active {
  color: #f87171;
}
.entry-photo {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
  cursor: pointer;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* ── Info tab ─────────────────────────────── */
.info-card {
  background: linear-gradient(
    135deg,
    rgba(28, 28, 28, 0.95),
    rgba(18, 18, 18, 0.95)
  );
  border: 1px solid rgba(123, 199, 77, 0.12);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #777;
  font-weight: 600;
}
.info-val {
  font-size: 14px;
  color: #fff;
  font-weight: 700;
}

.info-progress-block {
  background: linear-gradient(
    135deg,
    rgba(28, 28, 28, 0.95),
    rgba(18, 18, 18, 0.95)
  );
  border: 1px solid rgba(123, 199, 77, 0.12);
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 20px;
}
.info-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 700;
}
.stage-pct {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}
.big-track {
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 8px;
}
.big-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.5s ease;
  box-shadow: 0 0 12px currentColor;
  min-width: 5px;
}
.big-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.journal-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.jstat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: linear-gradient(
    135deg,
    rgba(28, 28, 28, 0.95),
    rgba(18, 18, 18, 0.95)
  );
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  text-align: center;
}
.jstat-num {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}
.jstat-label {
  font-size: 10px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
}

/* ── Gallery ──────────────────────────────── */
.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #555;
}
.gallery-empty p {
  font-size: 15px;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}
.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s;
}
.gallery-item:active img {
  transform: scale(0.96);
}
.gallery-date {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  text-align: center;
}

/* ── Modals ───────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.18s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-sheet {
  width: 100%;
  background: #161616;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom));
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 90vh;
  overflow-y: auto;
}
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-handle {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  margin: 0 auto 18px;
}
.modal-icon-header {
  text-align: center;
  margin-bottom: 8px;
}
.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
  text-align: center;
}

.note-textarea {
  width: 100%;
  min-height: 110px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(123, 199, 77, 0.25);
  border-radius: 14px;
  padding: 14px;
  color: #fff;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
  margin-bottom: 12px;
  font-family: inherit;
  box-sizing: border-box;
}
.note-textarea:focus {
  border-color: rgba(123, 199, 77, 0.5);
}

.modal-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px;
  color: #fff;
  font-size: 15px;
  outline: none;
  margin-bottom: 18px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border 0.2s;
}
.modal-input:focus {
  border-color: rgba(123, 199, 77, 0.5);
}
.modal-input::placeholder {
  color: #555;
}

.edit-form label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
}

.modal-footer {
  display: flex;
  gap: 10px;
}
.modal-cancel {
  flex: 1;
  padding: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 14px;
  color: #aaa;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.modal-cancel:active {
  background: rgba(255, 255, 255, 0.1);
}
.modal-cancel.danger {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}
.modal-cancel.danger:active {
  background: rgba(248, 113, 113, 0.2);
}

.modal-save {
  flex: 1.5;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #7bc74d, #5a9e3a);
  border: none;
  border-radius: 14px;
  color: #000;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.modal-save:active {
  transform: scale(0.97);
}
.modal-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Lightbox ─────────────────────────────── */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.18s ease;
}
.lightbox-close {
  position: absolute;
  top: max(env(safe-area-inset-top), 20px);
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;
}
.lightbox-img {
  max-width: 100%;
  max-height: 92vh;
  object-fit: contain;
  border-radius: 12px;
}

/* ── Generic buttons ─────────────────────── */
.btn-accent {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(123, 199, 77, 0.12);
  border: 1px solid rgba(123, 199, 77, 0.3);
  border-radius: 14px;
  color: #7bc74d;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.btn-accent:active {
  transform: scale(0.96);
}
</style>
