<script setup lang="ts">
import { vpd, vpdZone } from '~/utils/calc'
import { formatNumber } from '~/utils/locale'

const props = withDefaults(defineProps<{ temp?: number, rh?: number }>(), { temp: 25, rh: 60 })
const { t } = useI18n()
const uid = useId()

const temp = ref(props.temp)
const rh = ref(props.rh)
const leaf = ref(-2)

const MAX = 2
const value = computed(() => vpd(temp.value, rh.value, leaf.value))
const zone = computed(() => vpdZone(value.value))
const bands = computed(() => ([[0, 0.4], [0.4, 0.8], [0.8, 1.2], [1.2, 1.6], [1.6, MAX]] as const)
  .map(([from, to]) => ({ from, to, color: vpdZone((from + to) / 2).color })))
const pos = computed(() => Math.min(1, value.value / MAX))
const ticks = [0, 0.4, 0.8, 1.2, 1.6, 2]

const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`
</script>

<template>
  <div
    class="gw vpd"
    :style="{ '--zone': zone.color }"
  >
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.vpd.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.vpd.sub') }}
      </p>
    </div>

    <div
      class="readout gw-result"
      aria-live="polite"
    >
      <p class="gw-big num value">
        {{ formatNumber(value, 2, true) }}<span class="gw-unit">kPa</span>
      </p>
      <Transition
        name="gw-fade"
        mode="out-in"
      >
        <div
          :key="zone.color"
          class="zone-text"
        >
          <p class="zone">
            <span
              class="dot"
              aria-hidden="true"
            />{{ zone.label }}
          </p>
          <p class="gw-text">
            {{ zone.advice }}
          </p>
        </div>
      </Transition>
    </div>

    <div
      class="scale"
      aria-hidden="true"
    >
      <div class="track">
        <span
          v-for="b in bands"
          :key="b.from"
          class="band"
          :class="{ on: b.color === zone.color }"
          :style="{ 'flexGrow': b.to - b.from, '--c': b.color }"
        />
      </div>
      <div
        class="marker-rail"
        :style="{ transform: `translateX(${pos * 100}%)` }"
      >
        <span class="marker" />
      </div>
      <div class="ticks num">
        <span
          v-for="tk in ticks"
          :key="tk"
          :style="{ left: `${(tk / MAX) * 100}%` }"
        >{{ formatNumber(tk, 1, true) }}</span>
      </div>
    </div>

    <p class="targets">
      {{ t('guideWidgets.vpd.targets') }}
    </p>

    <div class="gw-field">
      <div class="gw-range-head">
        <label
          class="gw-label"
          :for="`${uid}-t`"
        >{{ t('guideWidgets.vpd.air') }}</label>
        <output
          class="gw-value"
          :for="`${uid}-t`"
        >{{ formatNumber(temp, 1, true) }} °C</output>
      </div>
      <input
        :id="`${uid}-t`"
        v-model.number="temp"
        type="range"
        min="15"
        max="35"
        step="0.5"
        class="gw-range lamp"
        :style="{ '--pct': pct(temp, 15, 35) }"
      >
    </div>
    <div class="gw-field">
      <div class="gw-range-head">
        <label
          class="gw-label"
          :for="`${uid}-rh`"
        >{{ t('guideWidgets.vpd.rh') }}</label>
        <output
          class="gw-value"
          :for="`${uid}-rh`"
        >{{ rh }} %</output>
      </div>
      <input
        :id="`${uid}-rh`"
        v-model.number="rh"
        type="range"
        min="20"
        max="95"
        step="1"
        class="gw-range"
        :style="{ '--pct': pct(rh, 20, 95), '--fill': 'var(--blue)' }"
      >
    </div>
    <div class="gw-field">
      <div class="gw-range-head">
        <label
          class="gw-label"
          :for="`${uid}-leaf`"
        >{{ t('guideWidgets.vpd.leaf') }}</label>
        <output
          class="gw-value"
          :for="`${uid}-leaf`"
        >{{ leaf > 0 ? '+' : '' }}{{ formatNumber(leaf, 1, true) }} °C</output>
      </div>
      <input
        :id="`${uid}-leaf`"
        v-model.number="leaf"
        type="range"
        min="-4"
        max="1"
        step="0.5"
        class="gw-range"
        :style="{ '--pct': pct(leaf, -4, 1) }"
      >
      <span class="gw-hint">{{ t('guideWidgets.vpd.leafHint') }}</span>
    </div>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.readout {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.value {
  color: var(--text);
}

.zone-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zone {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--zone);
}

.scale {
  position: relative;
  padding-top: 10px;
  overflow-x: clip;
  overflow-clip-margin: 4px;
}

.track {
  display: flex;
  gap: 2px;
  height: 12px;
}

.band {
  flex-basis: 0;
  border-radius: 3px;
  background: var(--c);
  opacity: 0.3;
  transition: opacity var(--dur) var(--ease-out);
}

.band.on {
  opacity: 1;
}

.marker-rail {
  position: absolute;
  inset: 0 0 auto;
  height: 34px;
  pointer-events: none;
  transition: transform var(--dur-slow) var(--ease-out);
}

.marker {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  width: 8px;
  height: 32px;
  margin-left: -4px;
  border-radius: 4px;
  border: 2px solid var(--surface);
  background: var(--text);
}

.ticks {
  position: relative;
  height: 18px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
}

.ticks span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}

.ticks span:first-child {
  transform: none;
}

.ticks span:last-child {
  transform: translateX(-100%);
}

.targets {
  margin: -6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}
</style>
