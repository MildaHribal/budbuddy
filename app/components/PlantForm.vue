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
const { t } = useI18n()

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
  if (!form.name.trim()) e.name = t('plantForm.errors.nameRequired')
  else if (form.name.trim().length > 60) e.name = t('plantForm.errors.nameTooLong')
  if (!isValidISODate(form.startDate)) e.startDate = t('plantForm.errors.dateRequired')
  else if (form.startDate > todayISO()) e.startDate = t('plantForm.errors.dateFuture')
  else if (props.plant?.stageHistory[1] && form.startDate > props.plant.stageHistory[1].date) {
    e.startDate = t('plantForm.errors.dateAfterStage', { date: formatDate(props.plant.stageHistory[1].date) })
  }
  if (form.wateringInterval !== null && (form.wateringInterval < 1 || form.wateringInterval > 30)) {
    e.wateringInterval = t('plantForm.errors.intervalRange')
  }
  return e
})

const pickableStages = computed(() => (isEdit.value ? [] : stages().filter(s => GROWING_STAGES.includes(s.id))))

const intervals = computed(() => [
  { value: null, label: t('plantForm.intervalOff') },
  { value: 1, label: t('plantForm.intervalDaily') },
  ...[2, 3, 4, 5].map(n => ({ value: n, label: t('plantForm.intervalDays', { n }) })),
  { value: 7, label: t('plantForm.intervalWeekly') }
])

async function choosePhoto() {
  const file = await pickImage()
  if (!file) return
  busy.value = true
  try {
    form.photoId = await grow.savePhoto(file)
  } catch (err) {
    console.error(err)
    notify(t('plantForm.photoError'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function submit() {
  submitted.value = true
  if (Object.keys(errors.value).length) {
    notify(t('plantForm.checkFields'), { tone: 'error' })
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
    <button
      type="button"
      class="photo-drop"
      :class="{ filled: !!form.photoId, busy }"
      :disabled="busy"
      :aria-label="t('plantForm.choosePhoto')"
      @click="choosePhoto"
    >
      <span
        v-if="form.photoId"
        class="photo-preview"
      >
        <PlantPhoto
          :photo-id="form.photoId"
          :stage="form.stage"
        />
      </span>
      <span class="photo-cta">
        <span class="photo-icon">
          <UIcon
            :name="busy ? 'i-tabler-loader-2' : 'i-tabler-camera'"
            class="size-6"
            :class="{ 'animate-spin': busy }"
          />
        </span>
        <span class="photo-title">{{ form.photoId ? t('plantForm.changePhoto') : t('plantForm.addPhoto') }}</span>
        <span
          v-if="!form.photoId"
          class="photo-hint"
        >{{ t('plantForm.photoHint') }}</span>
      </span>
    </button>
    <button
      v-if="form.photoId"
      type="button"
      class="link remove-photo"
      @click="form.photoId = null"
    >
      <UIcon
        name="i-tabler-trash"
        class="size-4"
      /> {{ t('plantForm.removePhoto') }}
    </button>

    <section
      v-if="pickableStages.length"
      class="group card"
    >
      <h2 class="section-title">
        {{ t('plantForm.currentStage') }}
      </h2>
      <div
        class="stage-row"
        role="radiogroup"
        :aria-label="t('plantForm.currentStage')"
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
          <span class="stage-glyph-wrap">
            <GrowIcon
              :name="s.glyph"
              class="stage-glyph"
              :draw="form.stage === s.id"
              :glow="form.stage === s.id"
              :stroke-width="1.4"
            />
          </span>
          <span class="stage-name">{{ s.label }}</span>
          <span class="stage-range">{{ s.range }}</span>
        </button>
      </div>
    </section>

    <section class="group card">
      <h2 class="section-title">
        {{ t('plantForm.plant') }}
      </h2>
      <div class="field">
        <label
          class="field-label"
          for="p-name"
        >{{ t('plantForm.name') }}</label>
        <input
          id="p-name"
          v-model="form.name"
          class="input"
          :class="{ invalid: submitted && errors.name }"
          :aria-invalid="submitted && !!errors.name"
          maxlength="60"
          :placeholder="t('plantForm.namePlaceholder')"
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
        >{{ t('plantForm.strain') }}</label>
        <input
          id="p-strain"
          v-model="form.strain"
          class="input"
          :placeholder="t('plantForm.strainPlaceholder')"
          autocomplete="off"
        >
      </div>

      <div class="field">
        <span class="field-label">{{ t('plantForm.type') }}</span>
        <div class="segmented">
          <span
            class="seg-thumb"
            :class="{ right: form.type === 'autoflower' }"
            aria-hidden="true"
          />
          <button
            type="button"
            :aria-pressed="form.type === 'photoperiod'"
            @click="form.type = 'photoperiod'"
          >
            <GrowIcon
              name="lamp"
              class="seg-icon"
            /> {{ t('plantForm.photoperiod') }}
          </button>
          <button
            type="button"
            :aria-pressed="form.type === 'autoflower'"
            @click="form.type = 'autoflower'"
          >
            <UIcon
              name="i-tabler-bolt"
              class="size-4 seg-icon"
            /> {{ t('plantForm.autoflower') }}
          </button>
        </div>
      </div>
    </section>

    <section class="group card">
      <h2 class="section-title">
        {{ t('plantForm.setup') }}
      </h2>
      <div class="field">
        <label
          class="field-label"
          for="p-date"
        >{{ isEdit ? t('plantForm.started') : t('plantForm.startDate') }}</label>
        <input
          id="p-date"
          v-model="form.startDate"
          class="input"
          :class="{ invalid: submitted && errors.startDate }"
          :aria-invalid="submitted && !!errors.startDate"
          type="date"
          :max="todayISO()"
        >
        <span
          v-if="submitted && errors.startDate"
          class="field-error"
        >{{ errors.startDate }}</span>
      </div>
      <div class="form-grid">
        <div class="field">
          <label
            class="field-label"
            for="p-pot"
          >{{ t('plantForm.potSize') }}</label>
          <input
            id="p-pot"
            v-model="form.potSize"
            class="input"
            :placeholder="t('plantForm.potPlaceholder')"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            for="p-medium"
          >{{ t('plantForm.medium') }}</label>
          <select
            id="p-medium"
            v-model="form.medium"
            class="input"
          >
            <option value="soil">
              {{ t('plantForm.media.soil') }}
            </option>
            <option value="coco">
              {{ t('plantForm.media.coco') }}
            </option>
            <option value="hydro">
              {{ t('plantForm.media.hydro') }}
            </option>
            <option value="other">
              {{ t('plantForm.media.other') }}
            </option>
          </select>
        </div>
      </div>
      <div class="field">
        <label
          class="field-label"
          for="p-location"
        >{{ t('plantForm.location') }}</label>
        <select
          id="p-location"
          v-model="form.location"
          class="input"
        >
          <option value="indoor">
            {{ t('plantForm.locations.indoor') }}
          </option>
          <option value="outdoor">
            {{ t('plantForm.locations.outdoor') }}
          </option>
          <option value="greenhouse">
            {{ t('plantForm.locations.greenhouse') }}
          </option>
        </select>
      </div>
    </section>

    <section class="group card">
      <h2 class="section-title">
        {{ t('plantForm.care') }}
      </h2>
      <div class="field">
        <span class="field-label">{{ t('plantForm.wateringReminder') }}</span>
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
        <span class="field-hint">{{ t('plantForm.wateringHint') }}</span>
        <span
          v-if="submitted && errors.wateringInterval"
          class="field-error"
        >{{ errors.wateringInterval }}</span>
      </div>

      <div
        v-if="isEdit"
        class="field"
      >
        <span class="field-label">{{ t('plantForm.health') }}</span>
        <div
          class="health-row"
          role="radiogroup"
          :aria-label="t('plantForm.health')"
        >
          <button
            v-for="h in [...healthLevels()].reverse()"
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
        >{{ t('plantForm.notes') }}</label>
        <textarea
          id="p-notes"
          v-model="form.notes"
          class="input"
          rows="3"
          :placeholder="t('plantForm.notesPlaceholder')"
        />
      </div>
    </section>

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
  gap: 16px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

/* Photo: a lit drop area */
.photo-drop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 156px;
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--accent-line);
  background:
    radial-gradient(80% 90% at 50% 0%, rgba(255, 210, 138, 0.14) 0%, rgba(155, 227, 107, 0.07) 45%, transparent 80%),
    #0b0d10;
  box-shadow: inset 0 1px 0 var(--highlight);
  color: var(--text);
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur) ease;
}

.photo-drop:active:not(:disabled) {
  transform: scale(0.985);
  border-color: var(--leaf);
}

.photo-drop.filled {
  min-height: 0;
  aspect-ratio: 16 / 10;
  border-style: solid;
  border-color: var(--line-strong);
}

.photo-preview {
  position: absolute;
  inset: 0;
}

.photo-cta {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  text-align: center;
}

.filled .photo-cta {
  position: absolute;
  right: 12px;
  bottom: 12px;
  flex-direction: row;
  gap: 8px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: rgba(7, 8, 10, 0.78);
  border: 1px solid var(--line-strong);
}

.photo-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--on-accent);
  background: radial-gradient(120% 120% at 50% 0%, #c6f59f 0%, var(--leaf) 50%, #76c24a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), var(--glow-leaf);
}

.filled .photo-icon {
  width: 32px;
  height: 32px;
}

.filled .photo-icon :deep(svg),
.filled .photo-icon .size-6 {
  width: 18px;
  height: 18px;
}

.photo-title {
  font-size: 15px;
  font-weight: 600;
}

.filled .photo-title {
  font-size: 13px;
}

.photo-hint {
  font-size: 13px;
  color: var(--text-2);
}

.remove-photo {
  align-self: flex-start;
  gap: 6px;
  min-height: 44px;
  margin-top: -8px;
  color: var(--text-2);
}

/* Stage picker */
.stage-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stage-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 12px 4px 10px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: #0b0d10;
  color: var(--text-2);
  transition: border-color var(--dur) var(--ease-out), background var(--dur) var(--ease-out), color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.stage-option:active {
  transform: scale(0.95);
}

.stage-option[aria-checked="true"] {
  color: var(--text);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  background: radial-gradient(100% 80% at 50% 0%, color-mix(in srgb, var(--c) 22%, transparent) 0%, transparent 75%), #0b0d10;
  box-shadow: 0 0 18px -4px color-mix(in srgb, var(--c) 45%, transparent);
}

.stage-glyph-wrap {
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.stage-glyph {
  font-size: 34px;
  color: color-mix(in srgb, var(--c) 55%, var(--text-3));
  transition: color var(--dur) ease;
}

.stage-option[aria-checked="true"] .stage-glyph {
  color: var(--c);
}

.stage-name {
  max-width: 100%;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-range {
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
  line-height: 1.3;
}

/* Type segmented control with sliding thumb */
.segmented button {
  position: relative;
  z-index: 1;
  min-height: 44px;
}

.segmented button[aria-pressed="true"] {
  background: transparent;
  box-shadow: none;
}

.seg-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 6px);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight), 0 2px 8px rgba(0, 0, 0, 0.45);
  transition: transform var(--dur) var(--ease-out);
}

.seg-thumb.right {
  transform: translateX(calc(100% + 4px));
}

.seg-icon {
  font-size: 17px;
  transition: color var(--dur) ease;
}

.segmented button[aria-pressed="true"] .seg-icon {
  color: var(--lamp);
}

.chips.wrap {
  flex-wrap: wrap;
  overflow: visible;
}

.chips .chip {
  min-height: 44px;
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
  min-width: 0;
  padding: 10px 2px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #0b0d10;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  transition: border-color var(--dur) ease, background var(--dur) ease, color var(--dur) ease;
}

.health-opt[aria-checked="true"] {
  color: var(--c);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  background: color-mix(in srgb, var(--c) 12%, #0b0d10);
}

.submit {
  margin-top: 4px;
  min-height: 52px;
  font-size: 16px;
}
</style>
