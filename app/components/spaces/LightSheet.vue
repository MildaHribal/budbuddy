<script setup lang="ts">
// Light schedule editor for one grow space.
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  title: string
  lightsOn: string
  hours: number | null
}>()
const emit = defineEmits<{ save: [value: { lightsOn: string, hours: number | null }] }>()

const { t } = useI18n()
const formId = useId()
const PRESETS = [18, 20, 12, 24] as const
const draftOn = ref('06:00')
const draftHours = ref<number | ''>(18)
const natural = ref(false)
const hoursValid = computed(() => natural.value || (draftHours.value !== '' && Number.isInteger(draftHours.value) && draftHours.value >= 0 && draftHours.value <= 24))
const onValid = computed(() => natural.value || /^\d{2}:\d{2}$/.test(draftOn.value))

watch(open, (v) => {
  if (!v) return
  draftOn.value = props.lightsOn
  natural.value = props.hours === null
  draftHours.value = props.hours ?? 18
}, { immediate: true })

function save() {
  if (!hoursValid.value || !onValid.value) return
  emit('save', { lightsOn: draftOn.value, hours: natural.value ? null : Number(draftHours.value) })
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="title"
    icon-color="var(--amber)"
  >
    <template #icon>
      <GrowIcon
        name="lamp"
        class="sheet-glyph"
      />
    </template>
    <form
      :id="formId"
      class="form-stack"
      @submit.prevent="save"
    >
      <div
        class="segmented"
        role="group"
        :aria-label="t('organize.space.lightSource')"
      >
        <button
          type="button"
          :aria-pressed="!natural"
          @click="natural = false"
        >
          {{ t('organize.space.lamp') }}
        </button>
        <button
          type="button"
          :aria-pressed="natural"
          @click="natural = true"
        >
          {{ t('organize.space.natural') }}
        </button>
      </div>
      <template v-if="!natural">
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
      </template>
      <p
        v-else
        class="muted natural-note"
      >
        {{ t('organize.space.naturalHint') }}
      </p>
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
        :disabled="!hoursValid || !onValid"
      >
        {{ t('common.save') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.sheet-glyph {
  font-size: 26px;
}

.presets {
  justify-content: center;
}

.natural-note {
  margin: 0;
  font-size: 14px;
}
</style>
