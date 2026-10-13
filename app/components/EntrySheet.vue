<script setup lang="ts">
import type { EntryType, JournalEntry, StageId, TrainingMethod } from '~/types/grow'
import type { FeedLine } from '~/types/kit'
import { feedLinesText } from '~/utils/feeding'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  plantId: string
  /** type for a new entry */
  type: EntryType
  /** default date for a new entry */
  date: string
  /** entry being edited (null = create) */
  entry?: JournalEntry | null
  /** values for a new entry, e.g. a mix from the nutrient calculator */
  prefill?: Partial<Pick<JournalEntry, 'amountMl' | 'nutrients' | 'ph' | 'ec' | 'note' | 'method' | 'feedLines'>> | null
}>()
const emit = defineEmits<{ saved: [entry: JournalEntry] }>()

const grow = useGrow()
const feeding = useFeeding()
const inventory = useInventory()
const { notify } = useNotify()
const { t } = useI18n()

interface Form {
  date: string
  note: string
  amountMl: number | '' | null
  ph: number | '' | null
  ec: number | '' | null
  nutrients: string
  method: TrainingMethod | null
  product: string
  heightCm: number | '' | null
  tempC: number | '' | null
  humidity: number | '' | null
  photoIds: string[]
  feedLines: FeedLine[] | null
}

const form = reactive<Form>(emptyForm())
const submitted = ref(false)
const busy = ref(false)
const done = ref(false)
const picked = ref<EntryType>(props.type)
let closeTimer: ReturnType<typeof setTimeout> | undefined

const kind = computed<EntryType>(() => props.entry?.type ?? picked.value)
const info = computed(() => entryInfo(kind.value))
const isEdit = computed(() => !!props.entry)
const loggable = computed(() => entryTypes().filter(x => x.loggable))
const plant = computed(() => grow.getPlant(props.plantId))

function emptyForm(): Form {
  return { date: todayISO(), note: '', amountMl: null, ph: null, ec: null, nutrients: '', method: null, product: '', heightCm: null, tempC: null, humidity: null, photoIds: [], feedLines: null }
}

const blank = (v: unknown) => v === null || v === ''

// Pre-fill with the values used last time – most growers repeat the same mix.
function applyLast(type: EntryType) {
  const last = grow.lastEntryOf(props.plantId, [type])
  if (!last) return
  if (type === 'water' || type === 'feed') {
    if (blank(form.amountMl)) form.amountMl = last.amountMl
    if (blank(form.ph)) form.ph = last.ph
    if (blank(form.ec)) form.ec = last.ec
    if (!form.nutrients) form.nutrients = last.nutrients
  }
  if (type === 'pest' && !form.product) form.product = last.product
}

// this week's dose from the plant's feeding schedule wins over the last mix
function applyPlan() {
  const p = plant.value
  const lines = p ? feeding.planLines(p, form.date) : []
  if (!lines.length) return
  form.feedLines = lines
  form.nutrients = feedLinesText(lines)
}

watch(open, (v) => {
  clearTimeout(closeTimer)
  if (!v) return
  submitted.value = false
  done.value = false
  picked.value = props.type
  Object.assign(form, emptyForm())
  if (props.entry) {
    const e = props.entry
    Object.assign(form, {
      date: e.date, note: e.note, amountMl: e.amountMl, ph: e.ph, ec: e.ec, nutrients: e.nutrients,
      method: e.method, product: e.product, heightCm: e.heightCm, tempC: e.tempC, humidity: e.humidity,
      photoIds: [...e.photoIds], feedLines: e.feedLines ? e.feedLines.map(l => ({ ...l })) : null
    })
    return
  }
  form.date = props.date
  applyLast(props.type)
  if (props.prefill) Object.assign(form, props.prefill)
  else if (props.type === 'feed') applyPlan()
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(closeTimer))

function pick(t: EntryType) {
  if (t === picked.value) return
  picked.value = t
  submitted.value = false
  applyLast(t)
  if (t === 'feed') applyPlan()
}

const has = (...types: EntryType[]) => types.includes(kind.value)

const toNum = (v: number | '' | null) => (v === '' || v === null || Number.isNaN(v) ? null : Number(v))

const errors = computed(() => {
  const e: Record<string, string> = {}
  const ph = toNum(form.ph)
  const rh = toNum(form.humidity)
  const amount = toNum(form.amountMl)
  if (!isValidISODate(form.date)) e.date = t('entry.errors.date')
  else if (form.date > todayISO()) e.date = t('entry.errors.future')
  if (ph !== null && (ph < 0 || ph > 14)) e.ph = t('entry.errors.ph')
  if (rh !== null && (rh < 0 || rh > 100)) e.humidity = t('entry.errors.humidity')
  if (amount !== null && amount < 0) e.amountMl = t('entry.errors.amount')
  if (kind.value === 'note' && !form.note.trim()) e.note = t('entry.errors.note')
  if (kind.value === 'photo' && !form.photoIds.length) e.photos = t('entry.errors.photos')
  if (kind.value === 'measure' && [form.heightCm, form.tempC, form.humidity, form.ph, form.ec].every(v => toNum(v) === null)) {
    e.measure = t('entry.errors.measure')
  }
  return e
})

interface Range { min: number, max: number, label: string }

const phRange = computed<Range>(() => {
  const m = plant.value?.medium
  if (m === 'soil') return { min: 6.0, max: 7.0, label: t('entry.range.soil') }
  if (m === 'coco' || m === 'hydro') return { min: 5.5, max: 6.5, label: t(`entry.range.${m}`) }
  return { min: 5.8, max: 6.8, label: t('entry.range.typical') }
})

const EC_BY_STAGE: Partial<Record<StageId, [number, number]>> = {
  germination: [0.2, 0.6],
  seedling: [0.4, 0.8],
  vegetative: [0.8, 1.6],
  flowering: [1.2, 2.2]
}

const ecRange = computed<Range | null>(() => {
  const s = plant.value?.stage
  const r = s ? EC_BY_STAGE[s] : undefined
  return r && s ? { min: r[0], max: r[1], label: stageInfo(s).label.toLowerCase() } : null
})

function rangeState(v: number | '' | null, r: Range | null): 'empty' | 'in' | 'out' {
  const n = toNum(v)
  if (n === null || !r) return 'empty'
  return n >= r.min && n <= r.max ? 'in' : 'out'
}

async function addPhoto() {
  const file = await pickImage()
  if (!file) return
  busy.value = true
  try {
    form.photoIds.push(await grow.savePhoto(file))
  } catch (err) {
    console.error(err)
    notify(t('entry.imageError'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function removePhoto(id: string) {
  form.photoIds = form.photoIds.filter(p => p !== id)
}

function save() {
  if (done.value) return
  submitted.value = true
  if (Object.keys(errors.value).length) return
  const data = {
    date: form.date,
    note: form.note.trim(),
    amountMl: has('water', 'feed') ? toNum(form.amountMl) : null,
    ph: has('water', 'feed', 'measure') ? toNum(form.ph) : null,
    ec: has('water', 'feed', 'measure') ? toNum(form.ec) : null,
    nutrients: has('feed') ? form.nutrients.trim() : '',
    method: has('train') ? form.method : null,
    product: has('pest') ? form.product.trim() : '',
    heightCm: has('measure') ? toNum(form.heightCm) : null,
    tempC: has('measure') ? toNum(form.tempC) : null,
    humidity: has('measure') ? toNum(form.humidity) : null,
    photoIds: form.photoIds,
    // structured lines only while the text still matches them
    feedLines: has('feed') && form.feedLines?.length && feedLinesText(form.feedLines) === form.nutrients.trim() ? form.feedLines : undefined
  }
  let saved: JournalEntry
  if (props.entry) {
    grow.updateEntry(props.entry.id, data)
    saved = { ...props.entry, ...data }
  } else {
    saved = grow.addEntry({ ...data, plantId: props.plantId, type: kind.value })
  }
  inventory.recordUsage(saved)
  notify(isEdit.value ? t('entry.updated') : t(`entry.types.${kind.value}.logged`), { icon: info.value.icon })
  emit('saved', saved)
  // show the "logged" state briefly before the sheet drops away
  done.value = true
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  closeTimer = setTimeout(() => {
    open.value = false
  }, reduce ? 0 : 320)
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t(`entry.types.${kind}.${isEdit ? 'edit' : 'log'}`)"
    :icon-color="info.color"
  >
    <template #icon>
      <GrowIcon
        :name="info.glyph"
        class="entry-glyph"
      />
    </template>

    <form
      class="form-stack"
      novalidate
      @submit.prevent="save"
    >
      <div
        v-if="!isEdit"
        class="types chips"
        role="group"
        :aria-label="t('entry.entryType')"
      >
        <button
          v-for="x in loggable"
          :key="x.type"
          type="button"
          class="chip type-chip"
          :style="{ '--c': x.color }"
          :aria-pressed="kind === x.type"
          @click="pick(x.type)"
        >
          <GrowIcon
            :name="x.glyph"
            class="type-glyph"
          />
          {{ x.label }}
        </button>
      </div>

      <template v-if="has('water', 'feed')">
        <div class="field">
          <label
            class="field-label"
            for="e-amount"
          >{{ t('entry.amount') }}</label>
          <div class="unit-input">
            <input
              id="e-amount"
              v-model.number="form.amountMl"
              class="input num"
              :class="{ invalid: submitted && errors.amountMl }"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              placeholder="1000"
            >
            <span
              class="unit"
              aria-hidden="true"
            >ml</span>
          </div>
          <div class="quick">
            <button
              v-for="v in [250, 500, 1000, 2000]"
              :key="v"
              type="button"
              class="chip num"
              :aria-pressed="form.amountMl === v"
              @click="form.amountMl = v"
            >
              {{ formatVolume(v) }}
            </button>
          </div>
          <span
            v-if="submitted && errors.amountMl"
            class="field-error"
          >{{ errors.amountMl }}</span>
        </div>
      </template>

      <div
        v-if="has('feed')"
        class="field"
      >
        <label
          class="field-label"
          for="e-nutrients"
        >{{ t('entry.nutrients') }}</label>
        <input
          id="e-nutrients"
          v-model="form.nutrients"
          class="input"
          :placeholder="t('entry.nutrientsPlaceholder')"
        >
        <span class="field-hint">{{ t('entry.nutrientsHint') }}</span>
        <KitFeedFill
          v-model:lines="form.feedLines"
          v-model:nutrients="form.nutrients"
          :plant-id="plantId"
          :date="form.date"
          :amount-ml="toNum(form.amountMl)"
        />
      </div>

      <div
        v-if="has('measure')"
        class="form-grid"
      >
        <div class="field">
          <label
            class="field-label"
            for="e-height"
          >{{ t('entry.height') }}</label>
          <div class="unit-input">
            <input
              id="e-height"
              v-model.number="form.heightCm"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
            <span
              class="unit"
              aria-hidden="true"
            >cm</span>
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-temp"
          >{{ t('entry.temperature') }}</label>
          <div class="unit-input">
            <input
              id="e-temp"
              v-model.number="form.tempC"
              class="input num"
              type="number"
              inputmode="decimal"
              step="any"
            >
            <span
              class="unit"
              aria-hidden="true"
            >°C</span>
          </div>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-rh"
          >{{ t('entry.humidity') }}</label>
          <div class="unit-input">
            <input
              id="e-rh"
              v-model.number="form.humidity"
              class="input num"
              :class="{ invalid: submitted && errors.humidity }"
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="any"
            >
            <span
              class="unit"
              aria-hidden="true"
            >{{ t('entry.rhUnit') }}</span>
          </div>
          <span
            v-if="submitted && errors.humidity"
            class="field-error"
          >{{ errors.humidity }}</span>
        </div>
      </div>

      <div
        v-if="has('water', 'feed', 'measure')"
        class="form-grid"
      >
        <div class="field">
          <label
            class="field-label"
            for="e-ph"
          >pH</label>
          <input
            id="e-ph"
            v-model.number="form.ph"
            class="input num"
            :class="{ invalid: submitted && errors.ph }"
            type="number"
            inputmode="decimal"
            min="0"
            max="14"
            step="0.1"
            :placeholder="formatNumber(6.2)"
            aria-describedby="e-ph-range"
          >
          <span
            id="e-ph-range"
            class="range num"
            :data-state="rangeState(form.ph, phRange)"
          >
            <i aria-hidden="true" />{{ formatNumber(phRange.min, 1, true) }}–{{ formatNumber(phRange.max, 1, true) }} {{ phRange.label }}
          </span>
          <span
            v-if="submitted && errors.ph"
            class="field-error"
          >{{ errors.ph }}</span>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-ec"
          >EC</label>
          <div class="unit-input">
            <input
              id="e-ec"
              v-model.number="form.ec"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.1"
              :placeholder="formatNumber(1.4)"
              :aria-describedby="ecRange ? 'e-ec-range' : undefined"
            >
            <span
              class="unit"
              aria-hidden="true"
            >mS/cm</span>
          </div>
          <span
            v-if="ecRange"
            id="e-ec-range"
            class="range num"
            :data-state="rangeState(form.ec, ecRange)"
          >
            <i aria-hidden="true" />{{ formatNumber(ecRange.min, 1, true) }}–{{ formatNumber(ecRange.max, 1, true) }} {{ ecRange.label }}
          </span>
        </div>
      </div>
      <span
        v-if="submitted && errors.measure"
        class="field-error"
      >{{ errors.measure }}</span>

      <div
        v-if="has('train')"
        class="field"
      >
        <span class="field-label">{{ t('entry.method') }}</span>
        <div class="method-grid">
          <button
            v-for="m in trainingMethods()"
            :key="m.value"
            type="button"
            class="chip"
            :aria-pressed="form.method === m.value"
            @click="form.method = form.method === m.value ? null : m.value"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <div
        v-if="has('pest')"
        class="field"
      >
        <label
          class="field-label"
          for="e-product"
        >{{ t('entry.product') }}</label>
        <input
          id="e-product"
          v-model="form.product"
          class="input"
          :placeholder="t('entry.productPlaceholder')"
        >
      </div>

      <div class="field">
        <label
          class="field-label"
          for="e-note"
        >{{ kind === 'photo' ? t('entry.caption') : t('entry.note') }}</label>
        <textarea
          id="e-note"
          v-model="form.note"
          class="input"
          :class="{ invalid: submitted && errors.note }"
          :rows="kind === 'note' ? 5 : 3"
          :placeholder="kind === 'note' ? t('entry.notePlaceholder') : t('entry.optional')"
        />
        <span
          v-if="submitted && errors.note"
          class="field-error"
        >{{ errors.note }}</span>
      </div>

      <div class="field">
        <span class="field-label">{{ t('entry.photos') }}</span>
        <div class="photos">
          <div
            v-for="id in form.photoIds"
            :key="id"
            class="photo"
          >
            <PlantPhoto
              :photo-id="id"
              stage="vegetative"
            />
            <button
              type="button"
              class="photo-remove"
              :aria-label="t('entry.removePhoto')"
              @click="removePhoto(id)"
            >
              <UIcon
                name="i-tabler-x"
                class="size-4"
              />
            </button>
          </div>
          <button
            type="button"
            class="photo add"
            :disabled="busy"
            @click="addPhoto"
          >
            <UIcon
              :name="busy ? 'i-tabler-loader-2' : 'i-tabler-camera-plus'"
              class="size-6"
              :class="{ 'animate-spin': busy }"
            />
            <span>{{ busy ? t('entry.savingPhoto') : t('entry.addPhoto') }}</span>
          </button>
        </div>
        <span
          v-if="submitted && errors.photos"
          class="field-error"
        >{{ errors.photos }}</span>
      </div>

      <div class="field">
        <label
          class="field-label"
          for="e-date"
        >{{ t('entry.date') }}</label>
        <input
          id="e-date"
          v-model="form.date"
          class="input num"
          :class="{ invalid: submitted && errors.date }"
          type="date"
          :max="todayISO()"
        >
        <span
          v-if="submitted && errors.date"
          class="field-error"
        >{{ errors.date }}</span>
      </div>

      <button
        type="submit"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
      >
        {{ t('entry.save') }}
      </button>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn"
        :disabled="done"
        @click="open = false"
      >
        {{ t('entry.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary save"
        :class="{ done }"
        :disabled="busy"
        :aria-disabled="done"
        @click="save"
      >
        <UIcon
          name="i-tabler-check"
          class="size-5 save-check"
        />
        {{ done ? (isEdit ? t('entry.saved') : t('entry.logged')) : (isEdit ? t('entry.save') : t('entry.logIt')) }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.entry-glyph {
  font-size: 28px;
}

.types {
  margin: 0 -20px;
  padding: 0 20px 2px;
  scroll-padding-inline: 20px;
}

.type-chip {
  min-height: 44px;
  padding: 0 14px 0 11px;
}

.type-glyph {
  font-size: 18px;
  color: var(--c);
}

.type-chip[aria-pressed="true"] {
  background: color-mix(in srgb, var(--c) 14%, transparent);
  border-color: transparent;
  color: var(--text);
}

.unit-input {
  position: relative;
}

.unit-input .input {
  padding-right: 64px;
}

.unit {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  pointer-events: none;
}

.num::-webkit-outer-spin-button,
.num::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

input.num[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.range i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--track);
  transition: background var(--dur) ease;
}

.range[data-state="in"] {
  color: var(--text-2);
}

.range[data-state="in"] i {
  background: var(--green);
}

.range[data-state="out"] {
  color: var(--amber);
}

.range[data-state="out"] i {
  background: var(--amber);
}

.quick,
.method-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.quick .chip,
.method-grid .chip {
  min-height: 44px;
}

.save-check {
  display: none;
}

.save.done .save-check {
  display: inline-block;
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.photo.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid var(--line-strong);
  background: var(--well);
  color: var(--green);
  font-size: 12px;
  font-weight: 600;
}

.photo-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 5px;
  border: 0;
  background: none;
  color: #fff;
}

.photo-remove > * {
  box-sizing: content-box;
  padding: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.72);
}
</style>
