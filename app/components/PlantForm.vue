<script setup lang="ts">
import type { HealthLevel, Location, Medium, Plant, PlantType, StageId } from '~/types/grow'
import type { PlantInput } from '~/composables/useGrow'

const props = defineProps<{
  plant?: Plant | null
  submitLabel: string
}>()
const emit = defineEmits<{ submit: [data: PlantInput] }>()

const grow = useGrow()
const { notify } = useNotify()

const form = reactive({
  name: props.plant?.name ?? '',
  strain: props.plant?.strain ?? '',
  type: (props.plant?.type ?? 'photoperiod') as PlantType,
  stage: (props.plant?.stage ?? 'seedling') as StageId,
  startDate: props.plant?.startDate ?? todayISO(),
  potSize: props.plant?.potSize ?? '',
  medium: (props.plant?.medium ?? 'soil') as Medium,
  location: (props.plant?.location ?? 'indoor') as Location,
  wateringInterval: props.plant ? props.plant.wateringInterval : 3,
  health: (props.plant?.health ?? 4) as HealthLevel,
  photoId: props.plant?.photoId ?? null,
  notes: props.plant?.notes ?? ''
})

const isEdit = computed(() => !!props.plant)
const submitted = ref(false)
const busy = ref(false)

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Give your plant a name'
  else if (form.name.trim().length > 60) e.name = 'Keep it under 60 characters'
  if (!isValidISODate(form.startDate)) e.startDate = 'Pick a date'
  else if (form.startDate > todayISO()) e.startDate = 'The start date cannot be in the future'
  else if (props.plant?.stageHistory[1] && form.startDate > props.plant.stageHistory[1].date) {
    e.startDate = `Must be on or before ${formatDate(props.plant.stageHistory[1].date)}, when the next stage began`
  }
  if (form.wateringInterval !== null && (form.wateringInterval < 1 || form.wateringInterval > 30)) {
    e.wateringInterval = 'Between 1 and 30 days'
  }
  return e
})

const pickableStages = computed(() => (isEdit.value ? [] : STAGES.filter(s => GROWING_STAGES.includes(s.id))))

const intervals = [
  { value: null, label: 'Off' },
  { value: 1, label: 'Daily' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: 'Weekly' }
]

async function choosePhoto() {
  const file = await pickImage()
  if (!file) return
  busy.value = true
  try {
    form.photoId = await grow.savePhoto(file)
  } catch (err) {
    console.error(err)
    notify('Could not read that image', { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function submit() {
  submitted.value = true
  if (Object.keys(errors.value).length) {
    notify('Please check the highlighted fields', { tone: 'error' })
    return
  }
  emit('submit', {
    name: form.name.trim(),
    strain: form.strain.trim(),
    type: form.type,
    stage: form.stage,
    startDate: form.startDate,
    potSize: form.potSize.trim(),
    medium: form.medium,
    location: form.location,
    wateringInterval: form.wateringInterval,
    health: form.health,
    photoId: form.photoId,
    notes: form.notes.trim()
  })
}
</script>

<template>
  <form
    class="plant-form"
    novalidate
    @submit.prevent="submit"
  >
    <div class="photo-row">
      <button
        type="button"
        class="photo-pick"
        :disabled="busy"
        aria-label="Choose plant photo"
        @click="choosePhoto"
      >
        <PlantPhoto
          :photo-id="form.photoId"
          :stage="form.stage"
        />
        <span class="photo-overlay">
          <UIcon
            :name="busy ? 'i-tabler-loader-2' : 'i-tabler-camera'"
            class="size-5"
            :class="{ 'animate-spin': busy }"
          />
        </span>
      </button>
      <div class="photo-text">
        <p class="photo-title">
          Plant photo
        </p>
        <p class="muted">
          Optional – shown on cards and in the header.
        </p>
        <button
          v-if="form.photoId"
          type="button"
          class="link"
          @click="form.photoId = null"
        >
          Remove photo
        </button>
      </div>
    </div>

    <section
      v-if="pickableStages.length"
      class="field"
    >
      <span class="field-label">Current stage</span>
      <div
        class="stage-grid"
        role="radiogroup"
        aria-label="Current stage"
      >
        <button
          v-for="s in pickableStages"
          :key="s.id"
          type="button"
          role="radio"
          class="stage-option"
          :aria-checked="form.stage === s.id"
          :style="{ '--c': s.color }"
          @click="form.stage = s.id"
        >
          <span class="stage-img">
            <PlantPhoto
              :photo-id="null"
              :stage="s.id"
            />
          </span>
          <span class="stage-name">{{ s.label }}</span>
          <span class="stage-range">{{ s.range }}</span>
          <UIcon
            v-if="form.stage === s.id"
            name="i-tabler-circle-check-filled"
            class="size-5 stage-check"
          />
        </button>
      </div>
    </section>

    <div class="field">
      <label
        class="field-label"
        for="p-name"
      >Name *</label>
      <input
        id="p-name"
        v-model="form.name"
        class="input"
        :class="{ invalid: submitted && errors.name }"
        maxlength="60"
        placeholder="e.g. Northern Lights #1"
        autocomplete="off"
      >
      <span
        v-if="submitted && errors.name"
        class="field-error"
      >{{ errors.name }}</span>
    </div>

    <div class="field">
      <label
        class="field-label"
        for="p-strain"
      >Strain</label>
      <input
        id="p-strain"
        v-model="form.strain"
        class="input"
        placeholder="e.g. Northern Lights"
        autocomplete="off"
      >
    </div>

    <div class="field">
      <span class="field-label">Type</span>
      <div class="segmented">
        <button
          type="button"
          :aria-pressed="form.type === 'photoperiod'"
          @click="form.type = 'photoperiod'"
        >
          <UIcon
            name="i-tabler-sun"
            class="size-4"
          /> Photoperiod
        </button>
        <button
          type="button"
          :aria-pressed="form.type === 'autoflower'"
          @click="form.type = 'autoflower'"
        >
          <UIcon
            name="i-tabler-bolt"
            class="size-4"
          /> Autoflower
        </button>
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label
          class="field-label"
          for="p-date"
        >{{ isEdit ? 'Started' : 'Start date' }}</label>
        <input
          id="p-date"
          v-model="form.startDate"
          class="input"
          :class="{ invalid: submitted && errors.startDate }"
          type="date"
          :max="todayISO()"
        >
        <span
          v-if="submitted && errors.startDate"
          class="field-error"
        >{{ errors.startDate }}</span>
      </div>
      <div class="field">
        <label
          class="field-label"
          for="p-pot"
        >Pot size</label>
        <input
          id="p-pot"
          v-model="form.potSize"
          class="input"
          placeholder="e.g. 11 L"
        >
      </div>
      <div class="field">
        <label
          class="field-label"
          for="p-medium"
        >Medium</label>
        <select
          id="p-medium"
          v-model="form.medium"
          class="input"
        >
          <option value="soil">
            Soil
          </option>
          <option value="coco">
            Coco
          </option>
          <option value="hydro">
            Hydro
          </option>
          <option value="other">
            Other
          </option>
        </select>
      </div>
      <div class="field">
        <label
          class="field-label"
          for="p-location"
        >Location</label>
        <select
          id="p-location"
          v-model="form.location"
          class="input"
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
      </div>
    </div>

    <div class="field">
      <span class="field-label">Watering reminder</span>
      <div class="chips wrap">
        <button
          v-for="i in intervals"
          :key="String(i.value)"
          type="button"
          class="chip"
          :aria-pressed="form.wateringInterval === i.value"
          @click="form.wateringInterval = i.value"
        >
          {{ i.label }}
        </button>
      </div>
      <span class="field-hint">BudBuddy reminds you on the dashboard when the plant is due.</span>
      <span
        v-if="submitted && errors.wateringInterval"
        class="field-error"
      >{{ errors.wateringInterval }}</span>
    </div>

    <div
      v-if="isEdit"
      class="field"
    >
      <span class="field-label">Health</span>
      <div
        class="health-row"
        role="radiogroup"
        aria-label="Health"
      >
        <button
          v-for="h in [...HEALTH_LEVELS].reverse()"
          :key="h.value"
          type="button"
          role="radio"
          class="health-opt"
          :aria-checked="form.health === h.value"
          :style="{ '--c': h.color }"
          @click="form.health = h.value"
        >
          <UIcon
            :name="h.icon"
            class="size-6"
          />
          <span>{{ h.label }}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <label
        class="field-label"
        for="p-notes"
      >Notes</label>
      <textarea
        id="p-notes"
        v-model="form.notes"
        class="input"
        rows="3"
        placeholder="Breeder, phenotype, anything worth remembering…"
      />
    </div>

    <button
      type="submit"
      class="btn btn-primary btn-block submit"
      :disabled="busy"
    >
      <UIcon
        name="i-tabler-check"
        class="size-5"
      />
      {{ submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.plant-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.photo-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.photo-pick {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--accent-line);
  background: var(--surface-2);
}

.photo-overlay {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
}

.photo-title {
  margin: 0;
  font-weight: 700;
}

.photo-text .muted {
  margin: 2px 0 0;
  font-size: 13px;
}

.stage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stage-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 8px 12px;
  border-radius: 16px;
  border: 1.5px solid var(--line);
  background: var(--surface);
  color: var(--text);
}

.stage-option[aria-checked="true"] {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 10%, var(--surface));
}

.stage-img {
  width: 100%;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 6px;
}

.stage-name {
  font-weight: 700;
  font-size: 14px;
}

.stage-range {
  font-size: 12px;
  color: var(--text-2);
}

.stage-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--c);
}

.chips.wrap {
  flex-wrap: wrap;
  overflow: visible;
}

.health-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.health-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 2px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
}

.health-opt[aria-checked="true"] {
  color: var(--c);
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 12%, var(--surface));
}

.submit {
  margin-top: 6px;
  min-height: 52px;
  font-size: 16px;
}
</style>
