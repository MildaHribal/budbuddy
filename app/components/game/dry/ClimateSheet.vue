<script setup lang="ts">
import type { DryBatch } from '~~/shared/game/types'
import { READY_HI, RH_MAX, RH_MIN, TEMP_MAX, TEMP_MIN, hoursToMoisture } from '~~/shared/game/drying'
import { climateStatus, durationParts } from '~~/shared/game/drying/view'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ batch: DryBatch | null }>()
const emit = defineEmits<{ save: [tempC: number, rh: number] }>()
const { t } = useI18n()

const temp = ref(20)
const rh = ref(60)

watch(open, (v) => {
  if (v && props.batch) {
    temp.value = props.batch.tempC
    rh.value = props.batch.rh
  }
}, { immediate: true })

const preview = computed(() => {
  const b = props.batch
  if (!b) return ''
  const status = climateStatus(b.moisture, temp.value, rh.value)
  const d = durationParts(hoursToMoisture(b.moisture, READY_HI, temp.value, rh.value) ?? 0)
  return t(`gameDry.sheet.preview.${status}`, { time: t(`gameDry.time.${d.key}`, { h: d.h, m: d.m }) })
})
const tone = computed(() => {
  const b = props.batch
  if (!b) return ''
  return climateStatus(b.moisture, temp.value, rh.value)
})

function save() {
  emit('save', temp.value, rh.value)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('gameDry.sheet.title')"
    icon="drying"
    icon-color="#d9a06a"
  >
    <div class="fields">
      <GameRange
        v-model="temp"
        :label="t('gameDry.sheet.temp')"
        :min="TEMP_MIN"
        :max="TEMP_MAX"
        :step="0.5"
        :display="`${formatNumber(temp, 1)} °C`"
        tone="amber"
      />
      <GameRange
        v-model="rh"
        :label="t('gameDry.sheet.rh')"
        :min="RH_MIN"
        :max="RH_MAX"
        :display="`${rh} %`"
        tone="blue"
      />
      <p
        class="preview"
        :class="tone"
        role="status"
      >
        {{ preview }}
      </p>
      <p class="guide">
        {{ t('gameDry.sheet.guide') }}
      </p>
    </div>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('gameDry.sheet.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="save"
      >
        {{ t('gameDry.sheet.save') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
}

.preview.steady,
.preview.ready {
  color: var(--green);
}

.preview.fast,
.preview.humid {
  color: var(--amber);
}

.preview.stalled,
.preview.overdry {
  color: var(--red);
}

.guide {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-3);
}
</style>
