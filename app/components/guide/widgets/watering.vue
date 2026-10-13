<script setup lang="ts">
import { formatNumber } from '~/utils/locale'

type Medium = 'soil' | 'coco'
type Stage = 'seedling' | 'veg' | 'flower'
const props = withDefaults(defineProps<{ litres?: number, medium?: Medium | 'hydro', stage?: Stage }>(), { litres: 11, medium: 'soil', stage: 'veg' })
const { t } = useI18n()
const uid = useId()

const litres = ref(Math.min(50, Math.max(1, props.litres)))
const medium = ref<Medium>(props.medium === 'coco' ? 'coco' : 'soil')
const stage = ref<Stage>(props.stage)
const POTS = [3, 7, 11, 20]
const MEDIA: Medium[] = ['soil', 'coco']
const STAGES: Stage[] = ['seedling', 'veg', 'flower']

// Share of pot volume per watering (coco: per day).
const FRACTION: Record<Medium, Record<Stage, [number, number]>> = {
  soil: { seedling: [0.05, 0.1], veg: [0.2, 0.25], flower: [0.25, 0.33] },
  coco: { seedling: [0.05, 0.1], veg: [0.1, 0.2], flower: [0.15, 0.25] }
}

const frac = computed(() => FRACTION[medium.value][stage.value])
const amount = computed(() => frac.value.map(f => f * litres.value) as [number, number])
const fmtL = (n: number) => formatNumber(n, n < 1 ? 2 : 1, n >= 1 && n < 10)
const freq = computed(() => t(`guideWidgets.water.${medium.value}${stage.value[0]!.toUpperCase()}${stage.value.slice(1)}`))

const POT_TOP = 30
const POT_BOT = 150
const level = ref(0)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => {
  level.value = 1
})))
const fill = computed(() => level.value * frac.value[1])
</script>

<template>
  <div class="gw water">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.water.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.water.sub') }}
      </p>
    </div>

    <div
      class="segmented"
      role="group"
      :aria-label="t('guideWidgets.water.medium')"
    >
      <button
        v-for="m in MEDIA"
        :key="m"
        type="button"
        :aria-pressed="medium === m"
        @click="medium = m"
      >
        {{ t(`guideWidgets.water.${m}`) }}
      </button>
    </div>

    <div
      class="segmented"
      role="group"
      :aria-label="t('guideWidgets.water.stage')"
    >
      <button
        v-for="s in STAGES"
        :key="s"
        type="button"
        :aria-pressed="stage === s"
        @click="stage = s"
      >
        {{ t(`guideWidgets.water.${s}`) }}
      </button>
    </div>

    <div class="gw-field">
      <div class="gw-range-head">
        <label
          class="gw-label"
          :for="`${uid}-l`"
        >{{ t('guideWidgets.water.pot') }}</label>
        <output
          class="gw-value"
          :for="`${uid}-l`"
        >{{ litres }} L</output>
      </div>
      <input
        :id="`${uid}-l`"
        v-model.number="litres"
        type="range"
        min="1"
        max="50"
        step="1"
        class="gw-range"
        :style="{ '--pct': `${((litres - 1) / 49) * 100}%`, '--fill': 'var(--blue)' }"
      >
      <div
        class="gw-chips pots"
        role="group"
        :aria-label="t('guideWidgets.water.pot')"
      >
        <button
          v-for="p in POTS"
          :key="p"
          type="button"
          class="chip num"
          :aria-pressed="litres === p"
          @click="litres = p"
        >
          {{ p }} L
        </button>
      </div>
    </div>

    <div class="result gw-result">
      <svg
        class="pot"
        viewBox="0 0 120 160"
        role="img"
        :aria-label="t('guideWidgets.water.potLabel', { l: litres, p: Math.round(frac[1] * 100) })"
      >
        <defs>
          <clipPath :id="`${uid}-clip`">
            <path :d="`M14 ${POT_TOP} H106 L96 ${POT_BOT} H24 Z`" />
          </clipPath>
        </defs>
        <path
          class="pot-body"
          :d="`M14 ${POT_TOP} H106 L96 ${POT_BOT} H24 Z`"
        />
        <g :clip-path="`url(#${uid}-clip)`">
          <rect
            class="soil"
            :class="medium"
            x="0"
            :y="POT_TOP + 8"
            width="120"
            :height="POT_BOT - POT_TOP"
          />
          <rect
            class="wet"
            x="0"
            :y="POT_TOP + 8"
            width="120"
            :height="POT_BOT - POT_TOP - 8"
            :style="{ transform: `scaleY(${fill})` }"
          />
        </g>
        <path
          class="rim"
          d="M8 26 H112 V34 H8 Z"
        />
        <g
          class="drops"
          :class="{ on: stage !== 'seedling' }"
        >
          <path d="M44 152 q-3 5 0 7 q3 -2 0 -7 Z" />
          <path d="M60 154 q-3 5 0 7 q3 -2 0 -7 Z" />
          <path d="M76 152 q-3 5 0 7 q3 -2 0 -7 Z" />
        </g>
      </svg>

      <div
        class="nums"
        aria-live="polite"
      >
        <p class="gw-big num amount">
          {{ fmtL(amount[0]) }}–{{ fmtL(amount[1]) }}<span class="gw-unit">L</span>
        </p>
        <span class="gw-hint">{{ t('guideWidgets.water.perWater') }}</span>
        <p class="runoff">
          {{ stage === 'seedling' ? t('guideWidgets.water.runoffSeedling') : t('guideWidgets.water.runoff') }}
        </p>
      </div>
    </div>

    <div>
      <p class="gw-label">
        {{ t('guideWidgets.water.freq') }}
      </p>
      <Transition
        name="gw-fade"
        mode="out-in"
      >
        <p
          :key="freq"
          class="gw-text freq"
        >
          {{ freq }}
        </p>
      </Transition>
    </div>

    <div class="lift">
      <span
        class="lift-tile"
        aria-hidden="true"
      >
        <GrowIcon name="water" />
      </span>
      <div class="lift-body">
        <p class="lift-head">
          {{ t('guideWidgets.water.liftHead') }}
        </p>
        <p class="gw-text">
          {{ t('guideWidgets.water.lift') }}
        </p>
      </div>
    </div>

    <p class="gw-hint">
      {{ t('guideWidgets.water.hydro') }}
    </p>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.pots {
  margin-top: 4px;
}

.pots .chip {
  flex: 1;
  justify-content: center;
}

.result {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pot {
  flex-shrink: 0;
  width: 96px;
  height: auto;
}

.pot-body {
  fill: var(--surface-3);
  stroke: var(--line-strong);
}

.soil.soil {
  fill: #4a3a2a;
}

.soil.coco {
  fill: #6b4a2e;
}

.wet {
  fill: var(--blue);
  opacity: 0.55;
  transform-box: fill-box;
  transform-origin: center top;
  transition: transform var(--dur-slow) var(--ease-out);
}

.rim {
  fill: var(--line-strong);
  stroke: var(--line-strong);
}

.drops path {
  fill: var(--blue);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity var(--dur) ease, transform var(--dur) var(--ease-out);
}

.drops.on path {
  opacity: 0.8;
  transform: none;
}

.nums {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.amount {
  color: var(--text);
}

.runoff {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.freq {
  margin-top: 4px;
}

.lift {
  display: flex;
  gap: 12px;
  padding: 12px 0 0;
  border-top: 1px solid var(--line);
}

.lift-tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--blue) 14%, transparent);
  color: var(--blue);
  font-size: 20px;
}

.lift-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-top: 6px;
}

.lift-head {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
</style>
