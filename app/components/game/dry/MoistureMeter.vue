<script setup lang="ts">
// Bud moisture on a 0-40 % scale (wetter clamps at the right end) so the 12-15 % jar band is wide enough to read.
const props = defineProps<{ moisture: number }>()
const { t } = useI18n()

const SCALE = 0.4
const at = (m: number) => `${Math.min(100, Math.max(0, (m / SCALE) * 100))}%`
const value = computed(() => Math.round(props.moisture * 100))
</script>

<template>
  <div class="meter">
    <div class="head">
      <span class="label">{{ t('gameDry.moisture') }}</span>
      <span class="value num">{{ value }} %</span>
    </div>
    <div
      class="track"
      role="meter"
      :aria-label="t('gameDry.moisture')"
      aria-valuemin="0"
      aria-valuemax="75"
      :aria-valuenow="value"
      :aria-valuetext="`${value} %`"
    >
      <span
        class="band"
        :style="{ left: at(0.12), width: `calc(${at(0.15)} - ${at(0.12)})` }"
      />
      <span
        class="fill"
        :style="{ width: at(moisture) }"
      />
    </div>
    <div class="foot">
      <span
        class="band-label"
        :style="{ paddingLeft: at(0.12) }"
      >{{ t('gameDry.moistureTarget') }}</span>
    </div>
  </div>
</template>

<style scoped>
.meter {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.value {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

/* water left in the buds, so the fill is water blue */
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--blue);
  transition: width var(--dur-slow) var(--ease-out);
}

.band {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  border-left: 2px solid var(--green);
  border-right: 2px solid var(--green);
  background: var(--accent-line);
}

.foot {
  font-size: 12px;
  color: var(--text-3);
}

.band-label {
  display: block;
  white-space: nowrap;
}
</style>
