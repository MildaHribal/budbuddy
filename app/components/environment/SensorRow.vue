<script setup lang="ts">
import type { EnvSensor } from '~/types/environment'
import { ago } from '~/utils/env/format'

const props = defineProps<{ sensor: EnvSensor }>()

const { t } = useI18n()
const envApi = useEnvironment()
const leafOffset = useLocalStorage('budbuddy:vpd-leaf', -2)

const reading = computed(() => envApi.latest(props.sensor.id))
const vpdValue = computed(() => {
  const r = reading.value
  return r && r.c !== null && r.h !== null ? vpd(r.c, r.h, Number(leafOffset.value) || -2) : null
})
const zone = computed(() => (vpdValue.value === null ? null : vpdZone(vpdValue.value)))
const KIND_ICON = { ble: 'i-tabler-bluetooth', ha: 'i-tabler-smart-home', manual: 'i-tabler-pencil' } as const
</script>

<template>
  <NuxtLink
    :to="`/environment/sensors/${sensor.id}`"
    class="sensor-row"
  >
    <span
      class="sensor-tile"
      aria-hidden="true"
    >
      <UIcon
        :name="KIND_ICON[sensor.kind]"
        class="size-5"
      />
    </span>
    <span class="sensor-text">
      <span class="sensor-name">{{ sensor.name }}</span>
      <span class="sensor-sub">
        {{ envApi.targetLabel(sensor.target) }}
        <template v-if="sensor.lastSeen"> · {{ ago(sensor.lastSeen) }}</template>
        <template v-else> · {{ t('environment.sensors.noReading') }}</template>
      </span>
    </span>
    <span
      v-if="reading"
      class="sensor-values"
    >
      <span class="sensor-main num">
        <template v-if="reading.c !== null">{{ formatNumber(reading.c, 1) }}°</template>
        <template v-if="reading.c !== null && reading.h !== null"> · </template>
        <template v-if="reading.h !== null">{{ formatNumber(reading.h, 0) }} %</template>
      </span>
      <span
        v-if="vpdValue !== null && zone"
        class="sensor-vpd num"
      >
        <i
          class="vpd-dot"
          :style="{ background: zone.color }"
          aria-hidden="true"
        />{{ formatNumber(vpdValue, 2) }} {{ t('environment.units.kpa') }}
      </span>
    </span>
    <UIcon
      name="i-tabler-chevron-right"
      class="size-5 sensor-go"
    />
  </NuxtLink>
</template>

<style scoped>
.sensor-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
  color: inherit;
  text-decoration: none;
}

.sensor-row + .sensor-row {
  border-top: 1px solid var(--line);
}

.sensor-tile {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, #5fd9c4 14%, var(--surface));
  color: #5fd9c4;
}

.sensor-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sensor-name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sensor-sub {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sensor-values {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.sensor-main {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.sensor-vpd {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
}

.vpd-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.sensor-go {
  color: var(--text-3);
  flex: none;
}
</style>
