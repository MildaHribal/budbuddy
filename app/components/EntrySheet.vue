<script setup lang="ts">
import type { EntryType, JournalEntry, TrainingMethod } from '~/types/grow'

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
  prefill?: Partial<Pick<JournalEntry, 'amountMl' | 'nutrients' | 'ph' | 'ec' | 'note'>> | null
}>()
const emit = defineEmits<{ saved: [entry: JournalEntry] }>()

const grow = useGrow()
const { notify } = useNotify()

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
}

const form = reactive<Form>(emptyForm())
const submitted = ref(false)
const busy = ref(false)

const kind = computed<EntryType>(() => props.entry?.type ?? props.type)
const info = computed(() => entryInfo(kind.value))
const isEdit = computed(() => !!props.entry)

function emptyForm(): Form {
  return { date: todayISO(), note: '', amountMl: null, ph: null, ec: null, nutrients: '', method: null, product: '', heightCm: null, tempC: null, humidity: null, photoIds: [] }
}

watch(open, (v) => {
  if (!v) return
  submitted.value = false
  Object.assign(form, emptyForm())
  if (props.entry) {
    const e = props.entry
    Object.assign(form, {
      date: e.date, note: e.note, amountMl: e.amountMl, ph: e.ph, ec: e.ec, nutrients: e.nutrients,
      method: e.method, product: e.product, heightCm: e.heightCm, tempC: e.tempC, humidity: e.humidity,
      photoIds: [...e.photoIds]
    })
    return
  }
  form.date = props.date
  // Pre-fill with the values used last time – most growers repeat the same mix.
  const last = grow.lastEntryOf(props.plantId, [props.type])
  if (last && (props.type === 'water' || props.type === 'feed')) {
    form.amountMl = last.amountMl
    form.ph = last.ph
    form.ec = last.ec
    form.nutrients = last.nutrients
  }
  if (last && props.type === 'pest') form.product = last.product
  if (props.prefill) Object.assign(form, props.prefill)
})

const has = (...types: EntryType[]) => types.includes(kind.value)

const toNum = (v: number | '' | null) => (v === '' || v === null || Number.isNaN(v) ? null : Number(v))

const errors = computed(() => {
  const e: Record<string, string> = {}
  const ph = toNum(form.ph)
  const rh = toNum(form.humidity)
  const amount = toNum(form.amountMl)
  if (!isValidISODate(form.date)) e.date = 'Pick a date'
  else if (form.date > todayISO()) e.date = 'The date cannot be in the future'
  if (ph !== null && (ph < 0 || ph > 14)) e.ph = 'pH is between 0 and 14'
  if (rh !== null && (rh < 0 || rh > 100)) e.humidity = 'Humidity is 0–100 %'
  if (amount !== null && amount < 0) e.amountMl = 'Must be positive'
  if (kind.value === 'note' && !form.note.trim()) e.note = 'Write something'
  if (kind.value === 'photo' && !form.photoIds.length) e.photos = 'Add at least one photo'
  if (kind.value === 'measure' && [form.heightCm, form.tempC, form.humidity, form.ph, form.ec].every(v => toNum(v) === null)) {
    e.measure = 'Fill in at least one value'
  }
  return e
})

async function addPhoto() {
  const file = await pickImage()
  if (!file) return
  busy.value = true
  try {
    form.photoIds.push(await grow.savePhoto(file))
  } catch (err) {
    console.error(err)
    notify('Could not read that image', { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function removePhoto(id: string) {
  form.photoIds = form.photoIds.filter(p => p !== id)
}

function save() {
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
    photoIds: form.photoIds
  }
  let saved: JournalEntry
  if (props.entry) {
    grow.updateEntry(props.entry.id, data)
    saved = { ...props.entry, ...data }
  } else {
    saved = grow.addEntry({ ...data, plantId: props.plantId, type: kind.value })
  }
  notify(isEdit.value ? 'Entry updated' : `${info.value.verb} logged`, { icon: info.value.icon })
  emit('saved', saved)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="`${isEdit ? 'Edit' : 'Log'} ${info.label.toLowerCase()}`"
    :icon="info.icon"
    :icon-color="info.color"
  >
    <form
      class="form-stack"
      novalidate
      @submit.prevent="save"
    >
      <template v-if="has('water', 'feed')">
        <div class="field">
          <label
            class="field-label"
            for="e-amount"
          >Amount (ml)</label>
          <input
            id="e-amount"
            v-model.number="form.amountMl"
            class="input"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            placeholder="e.g. 1000"
          >
          <div class="quick">
            <button
              v-for="v in [250, 500, 1000, 2000]"
              :key="v"
              type="button"
              class="chip"
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
        >Nutrients</label>
        <input
          id="e-nutrients"
          v-model="form.nutrients"
          class="input"
          placeholder="e.g. Grow 2 ml/L, CalMag 1 ml/L"
        >
        <span class="field-hint">Tip: the Tools tab can calculate the mix for you.</span>
      </div>

      <div
        v-if="has('measure')"
        class="form-grid"
      >
        <div class="field">
          <label
            class="field-label"
            for="e-height"
          >Height (cm)</label>
          <input
            id="e-height"
            v-model.number="form.heightCm"
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
            for="e-temp"
          >Temp (°C)</label>
          <input
            id="e-temp"
            v-model.number="form.tempC"
            class="input"
            type="number"
            inputmode="decimal"
            step="any"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-rh"
          >Humidity (%)</label>
          <input
            id="e-rh"
            v-model.number="form.humidity"
            class="input"
            :class="{ invalid: submitted && errors.humidity }"
            type="number"
            inputmode="decimal"
            min="0"
            max="100"
            step="any"
          >
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
            class="input"
            :class="{ invalid: submitted && errors.ph }"
            type="number"
            inputmode="decimal"
            min="0"
            max="14"
            step="0.1"
            placeholder="6.2"
          >
          <span
            v-if="submitted && errors.ph"
            class="field-error"
          >{{ errors.ph }}</span>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="e-ec"
          >EC (mS/cm)</label>
          <input
            id="e-ec"
            v-model.number="form.ec"
            class="input"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.1"
            placeholder="1.4"
          >
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
        <span class="field-label">Method</span>
        <div class="method-grid">
          <button
            v-for="m in TRAINING_METHODS"
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
        >Product / treatment</label>
        <input
          id="e-product"
          v-model="form.product"
          class="input"
          placeholder="e.g. Neem oil, sticky traps"
        >
      </div>

      <div class="field">
        <label
          class="field-label"
          for="e-note"
        >{{ kind === 'photo' ? 'Caption' : 'Note' }}</label>
        <textarea
          id="e-note"
          v-model="form.note"
          class="input"
          :class="{ invalid: submitted && errors.note }"
          :rows="kind === 'note' ? 5 : 3"
          :placeholder="kind === 'note' ? 'What did you notice today?' : 'Optional'"
        />
        <span
          v-if="submitted && errors.note"
          class="field-error"
        >{{ errors.note }}</span>
      </div>

      <div class="field">
        <span class="field-label">Photos</span>
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
              aria-label="Remove photo"
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
            <span>{{ busy ? 'Saving…' : 'Add' }}</span>
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
        >Date</label>
        <input
          id="e-date"
          v-model="form.date"
          class="input"
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
      >
        Save
      </button>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="busy"
        @click="save"
      >
        <UIcon
          name="i-tabler-check"
          class="size-5"
        />
        {{ isEdit ? 'Save' : 'Log it' }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.quick,
.method-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
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
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
}

.photo.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed var(--accent-line);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
}
</style>
