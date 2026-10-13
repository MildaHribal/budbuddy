<script setup lang="ts">
import type { GrowSpace, Location } from '~/types/grow'

// Create or edit a grow space.
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ space?: GrowSpace | null }>()
const emit = defineEmits<{ saved: [id: string] }>()

const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const { addSpace, updateSpace, spaces } = useSpaces()
const formId = useId()

const form = reactive({
  name: '',
  location: 'indoor' as Location,
  size: '',
  light: '',
  lightsOn: '06:00',
  hours: 18 as number | '',
  natural: false,
  notes: ''
})
const submitted = ref(false)
const PRESETS = [18, 20, 12, 24] as const
const LOCATIONS: Location[] = ['indoor', 'greenhouse', 'outdoor']

watch(open, (v) => {
  if (!v) return
  submitted.value = false
  const s = props.space
  const settings = grow.state.settings
  Object.assign(form, {
    name: s?.name ?? t('organize.space.defaultName', { n: spaces.value.length + 1 }),
    location: s?.location ?? 'indoor',
    size: s?.size ?? '',
    light: s?.light ?? '',
    lightsOn: s?.lightsOn ?? settings.lightsOn,
    hours: s ? (s.lightHours ?? 18) : settings.lightHours,
    natural: s ? s.lightHours === null : false,
    notes: s?.notes ?? ''
  })
}, { immediate: true })

function pickLocation(l: Location) {
  form.location = l
  // outdoors there is no lamp to schedule
  if (!props.space) form.natural = l === 'outdoor'
}

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = t('organize.space.nameRequired')
  if (!form.natural) {
    if (!/^\d{2}:\d{2}$/.test(form.lightsOn)) e.lightsOn = t('organize.space.timeError')
    if (form.hours === '' || !Number.isInteger(form.hours) || form.hours < 0 || form.hours > 24) e.hours = t('home.light.hoursError')
  }
  return e
})

function save() {
  submitted.value = true
  if (Object.keys(errors.value).length) return
  const data = {
    name: form.name.trim().slice(0, 40),
    location: form.location,
    size: form.size.trim(),
    light: form.light.trim(),
    lightsOn: form.lightsOn,
    lightHours: form.natural ? null : Number(form.hours),
    notes: form.notes.trim()
  }
  let id: string
  if (props.space) {
    updateSpace(props.space.id, data)
    id = props.space.id
    notify(t('organize.space.updated'))
  } else {
    id = addSpace(data).id
    notify(t('organize.space.created', { name: data.name }), { icon: 'i-tabler-tent' })
  }
  emit('saved', id)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="space ? t('organize.space.editTitle') : t('organize.space.newTitle')"
    icon="i-tabler-tent"
  >
    <form
      :id="formId"
      class="form-stack"
      novalidate
      @submit.prevent="save"
    >
      <div class="field">
        <label
          class="field-label"
          :for="`${formId}-name`"
        >{{ t('organize.space.name') }}</label>
        <input
          :id="`${formId}-name`"
          v-model="form.name"
          class="input"
          :class="{ invalid: submitted && errors.name }"
          maxlength="40"
          :placeholder="t('organize.space.namePlaceholder')"
        >
        <span
          v-if="submitted && errors.name"
          class="field-error"
        >{{ errors.name }}</span>
      </div>

      <div class="field">
        <span class="field-label">{{ t('organize.space.location') }}</span>
        <div
          class="segmented"
          role="group"
          :aria-label="t('organize.space.location')"
        >
          <button
            v-for="l in LOCATIONS"
            :key="l"
            type="button"
            :aria-pressed="form.location === l"
            @click="pickLocation(l)"
          >
            {{ t(`plantForm.locations.${l}`) }}
          </button>
        </div>
      </div>

      <div class="form-grid">
        <div class="field">
          <label
            class="field-label"
            :for="`${formId}-size`"
          >{{ t('organize.space.size') }}</label>
          <input
            :id="`${formId}-size`"
            v-model="form.size"
            class="input"
            maxlength="40"
            :placeholder="t('organize.space.sizePlaceholder')"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            :for="`${formId}-light`"
          >{{ t('organize.space.light') }}</label>
          <input
            :id="`${formId}-light`"
            v-model="form.light"
            class="input"
            maxlength="60"
            :placeholder="t('organize.space.lightPlaceholder')"
          >
        </div>
      </div>

      <div class="field">
        <span class="field-label">{{ t('organize.space.schedule') }}</span>
        <div
          class="segmented"
          role="group"
          :aria-label="t('organize.space.lightSource')"
        >
          <button
            type="button"
            :aria-pressed="!form.natural"
            @click="form.natural = false"
          >
            {{ t('organize.space.lamp') }}
          </button>
          <button
            type="button"
            :aria-pressed="form.natural"
            @click="form.natural = true"
          >
            {{ t('organize.space.natural') }}
          </button>
        </div>
      </div>

      <template v-if="!form.natural">
        <div
          class="chips"
          role="group"
          :aria-label="t('home.light.presets')"
        >
          <button
            v-for="h in PRESETS"
            :key="h"
            type="button"
            class="chip num"
            :aria-pressed="form.hours === h"
            @click="form.hours = h"
          >
            {{ h }}/{{ 24 - h }}
          </button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('home.light.on') }}</span>
            <input
              v-model="form.lightsOn"
              type="time"
              class="input num"
              :class="{ invalid: submitted && errors.lightsOn }"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('home.light.hours') }}</span>
            <input
              v-model.number="form.hours"
              type="number"
              inputmode="numeric"
              min="0"
              max="24"
              step="1"
              class="input num"
              :class="{ invalid: submitted && errors.hours }"
            >
            <span
              v-if="submitted && errors.hours"
              class="field-error"
            >{{ errors.hours }}</span>
          </label>
        </div>
        <p
          v-if="!space"
          class="field-hint"
        >
          {{ t('organize.space.scheduleHint') }}
        </p>
      </template>

      <div class="field">
        <label
          class="field-label"
          :for="`${formId}-notes`"
        >{{ t('organize.space.notes') }}</label>
        <textarea
          :id="`${formId}-notes`"
          v-model="form.notes"
          class="input"
          rows="2"
          maxlength="500"
          :placeholder="t('organize.space.notesPlaceholder')"
        />
      </div>
      <button
        type="submit"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
      >
        {{ t('common.save') }}
      </button>
    </form>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="submit"
        :form="formId"
        class="btn btn-primary"
      >
        {{ space ? t('common.save') : t('organize.space.create') }}
      </button>
    </template>
  </BottomSheet>
</template>
