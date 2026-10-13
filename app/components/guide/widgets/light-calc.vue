<script setup lang="ts">
import { dli } from '~/utils/calc'
import { formatNumber } from '~/utils/locale'
import { stageInfo } from '~/utils/stages'

const props = withDefaults(defineProps<{ watts?: number, area?: number }>(), { watts: 240, area: 1 })
const { t } = useI18n()
const uid = useId()

const PRESETS = [
  { id: '60', label: '60×60', m2: 0.36 },
  { id: '80', label: '80×80', m2: 0.64 },
  { id: '100', label: '100×100', m2: 1 },
  { id: '120', label: '120×120', m2: 1.44 }
]
const EFF = { budget: 2.0, good: 2.5, top: 2.8 } as const
type Eff = keyof typeof EFF
// Share of photons that land on the canopy in a reflective tent.
const COVERAGE = 0.85
const MAX = 1200

const initial = PRESETS.find(p => Math.abs(p.m2 - props.area) < 0.01)
const preset = ref(initial?.id ?? 'custom')
const custom = ref(props.area)
const watts = ref(props.watts)
const eff = ref<Eff>('good')

const areaM2 = computed(() => {
  const p = PRESETS.find(x => x.id === preset.value)
  return p ? p.m2 : Math.min(10, Math.max(0.1, Number(custom.value) || 0.1))
})
const density = computed(() => watts.value / areaM2.value)
const ppfd = computed(() => Math.round((watts.value * EFF[eff.value] * COVERAGE) / areaM2.value / 10) * 10)

const STAGES = [
  { id: 'seedling', range: [200, 400], color: stageInfo('seedling').color },
  { id: 'veg', range: [400, 600], color: stageInfo('vegetative').color },
  { id: 'flower', range: [600, 900], color: stageInfo('flowering').color }
] as const

const verdicts = computed(() => STAGES.map((s) => {
  const [a, b] = s.range
  const p = ppfd.value
  if (p < a) return { ...s, tone: 'weak', text: t('guideWidgets.light.weak') }
  if (p <= b) return { ...s, tone: 'ok', text: t('guideWidgets.light.ok') }
  const pct = Math.round((((a + b) / 2) / p) * 20) * 5
  if (pct < 25) return { ...s, tone: 'strong', text: t('guideWidgets.light.strong') }
  return { ...s, tone: 'dim', text: t('guideWidgets.light.dim', { p: pct }) }
}))

const pos = computed(() => Math.min(1, ppfd.value / MAX))
const ticks = [0, 400, 800, 1200]
</script>

<template>
  <div class="gw light">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.light.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.light.sub') }}
      </p>
    </div>

    <div class="gw-field">
      <span
        :id="`${uid}-area`"
        class="gw-label"
      >{{ t('guideWidgets.light.area') }}</span>
      <div
        class="gw-chips areas"
        role="group"
        :aria-labelledby="`${uid}-area`"
      >
        <button
          v-for="p in PRESETS"
          :key="p.id"
          type="button"
          class="chip num"
          :aria-pressed="preset === p.id"
          @click="preset = p.id"
        >
          {{ p.label }}
        </button>
        <button
          type="button"
          class="chip"
          :aria-pressed="preset === 'custom'"
          @click="preset = 'custom'"
        >
          {{ t('guideWidgets.light.custom') }}
        </button>
      </div>
      <div
        v-if="preset === 'custom'"
        class="custom"
      >
        <label
          class="gw-label"
          :for="`${uid}-m2`"
        >{{ t('guideWidgets.light.customArea') }}</label>
        <input
          :id="`${uid}-m2`"
          v-model.number="custom"
          class="input num"
          type="number"
          inputmode="decimal"
          min="0.1"
          max="10"
          step="0.05"
        >
      </div>
    </div>

    <div class="gw-field">
      <div class="gw-range-head">
        <label
          class="gw-label"
          :for="`${uid}-w`"
        >{{ t('guideWidgets.light.watts') }}</label>
        <output
          class="gw-value"
          :for="`${uid}-w`"
        >{{ watts }} W</output>
      </div>
      <input
        :id="`${uid}-w`"
        v-model.number="watts"
        type="range"
        min="50"
        max="1000"
        step="10"
        class="gw-range lamp"
        :style="{ '--pct': `${((watts - 50) / 950) * 100}%` }"
      >
      <span class="gw-hint">{{ t('guideWidgets.light.wattsHint') }}</span>
    </div>

    <div class="gw-field">
      <span
        :id="`${uid}-eff`"
        class="gw-label eff-label"
      >{{ t('guideWidgets.light.quality') }}</span>
      <div
        class="segmented"
        role="group"
        :aria-labelledby="`${uid}-eff`"
      >
        <button
          v-for="(v, k) in EFF"
          :key="k"
          type="button"
          :aria-pressed="eff === k"
          @click="eff = k"
        >
          {{ t(`guideWidgets.light.${k}`) }} <span class="num muted">{{ formatNumber(v, 1, true) }}</span>
        </button>
      </div>
    </div>

    <div
      class="readout gw-result"
      aria-live="polite"
    >
      <div>
        <p class="gw-big num dens">
          {{ formatNumber(density, 0, true) }}<span class="gw-unit">W/m²</span>
        </p>
        <span class="gw-hint">{{ t('guideWidgets.light.density') }} · {{ formatNumber(areaM2, 2, true) }} m²</span>
      </div>
      <div class="ppfd">
        <span class="gw-label">{{ t('guideWidgets.light.ppfd') }}</span>
        <span class="ppfd-v num">{{ t('guideWidgets.light.ppfdNote', { v: formatNumber(ppfd, 0, true) }) }}</span>
      </div>
    </div>

    <div
      class="scale"
      aria-hidden="true"
    >
      <div class="track">
        <span
          v-for="s in STAGES"
          :key="s.id"
          class="band"
          :style="{ 'left': `${(s.range[0] / MAX) * 100}%`, 'width': `${((s.range[1] - s.range[0]) / MAX) * 100}%`, '--c': s.color }"
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
        >{{ formatNumber(tk, 0, true) }}</span>
      </div>
    </div>

    <ul class="verdicts">
      <li
        v-for="v in verdicts"
        :key="v.id"
        :class="v.tone"
        :style="{ '--c': v.color }"
      >
        <span class="v-name">
          <span
            class="dot"
            aria-hidden="true"
          />{{ t(`guideWidgets.light.${v.id}`) }}
        </span>
        <span class="v-range num">{{ t('guideWidgets.light.targetRange', { a: v.range[0], b: v.range[1] }) }}</span>
        <span class="v-text">{{ v.text }}</span>
      </li>
    </ul>

    <p class="gw-hint">
      {{ t('guideWidgets.light.dli', { veg: formatNumber(dli(ppfd, 18), 0, true), flower: formatNumber(dli(ppfd, 12), 0, true) }) }}
    </p>
    <p class="gw-hint">
      {{ t('guideWidgets.light.estimate') }}
    </p>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.areas .chip {
  flex: 1 1 auto;
  justify-content: center;
  padding: 0 10px;
}

.areas {
  margin-top: 8px;
}

.custom {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.custom .input {
  min-height: 44px;
}

.eff-label {
  margin-bottom: 8px;
}

.readout {
  gap: 10px;
}

.dens {
  color: var(--text);
}

.ppfd {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ppfd-v {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.scale {
  position: relative;
  padding-top: 10px;
  overflow-x: clip;
  overflow-clip-margin: 4px;
}

.track {
  position: relative;
  height: 12px;
  border-radius: 3px;
  background: var(--track);
}

.band {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 3px;
  background: var(--c);
  opacity: 0.55;
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
  background: var(--amber);
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

.verdicts {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.verdicts li {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 2px 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.verdicts li:first-child {
  border-top: 0;
}

.v-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c);
}

.v-range {
  font-size: 12px;
  color: var(--text-3);
}

.v-text {
  grid-column: 1 / -1;
  padding-left: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.ok .v-text {
  color: var(--green);
}

.dim .v-text,
.strong .v-text {
  color: var(--amber);
}
</style>
