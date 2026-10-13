<script setup lang="ts">
const props = withDefaults(defineProps<{ value?: number }>(), { value: 55 })
const { t } = useI18n()
const uid = useId()

const s = ref(Math.min(100, Math.max(0, props.value)))
const clamp = (n: number) => Math.min(1, Math.max(0, n))

const mix = computed(() => {
  const clear = Math.round(clamp(1 - s.value / 45) * 100)
  const amber = Math.round(clamp((s.value - 50) / 50) * 45)
  return { clear, amber, cloudy: 100 - clear - amber }
})
const zone = computed(() => {
  const { clear, amber } = mix.value
  if (clear > 40) return 'early'
  if (amber < 10) return 'peak'
  if (amber <= 30) return 'ideal'
  return 'late'
})

type RGBA = [number, number, number, number]
const CLEAR: RGBA = [210, 236, 255, 0.16]
const CLOUDY: RGBA = [238, 240, 242, 0.95]
const AMBER: RGBA = [222, 142, 48, 1]
const lerp = (a: RGBA, b: RGBA, k: number): RGBA => a.map((v, i) => v + (b[i]! - v) * k) as RGBA
const rgba = ([r, g, b, a]: RGBA) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(2)})`
function headColor(v: number): RGBA {
  if (v <= 45) return lerp(CLEAR, CLOUDY, clamp((v - 5) / 40))
  return lerp(CLOUDY, AMBER, clamp((v - 62) / 38))
}

// Each head ripens slightly ahead or behind the slider, so the mix shows.
const HEADS = [
  { x: 40, h: 62, r: 11, o: -6 },
  { x: 70, h: 84, r: 13, o: 10 },
  { x: 102, h: 56, r: 10, o: -14 },
  { x: 132, h: 92, r: 14, o: 2 },
  { x: 164, h: 70, r: 12, o: 16 },
  { x: 194, h: 50, r: 10, o: -2 },
  { x: 222, h: 78, r: 12, o: 22 }
]
const BASE = 150
const heads = computed(() => HEADS.map((h) => {
  const c = headColor(s.value + h.o)
  return { ...h, fill: rgba(c), stroke: rgba([c[0], c[1], c[2], Math.min(1, c[3] + 0.5)]) }
}))
</script>

<template>
  <div class="gw trich">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.trich.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.trich.sub') }}
      </p>
    </div>

    <div class="scope">
      <svg
        viewBox="0 0 260 170"
        role="img"
        :aria-label="t('guideWidgets.trich.drawLabel', mix)"
      >
        <path
          class="surface"
          :d="`M0 ${BASE} Q65 ${BASE - 8} 130 ${BASE} T260 ${BASE} V170 H0 Z`"
        />
        <g
          v-for="h in heads"
          :key="h.x"
        >
          <path
            class="stalk"
            :d="`M${h.x - 3} ${BASE} L${h.x - 2} ${BASE - h.h + h.r} H${h.x + 2} L${h.x + 3} ${BASE} Z`"
          />
          <circle
            class="head"
            :cx="h.x"
            :cy="BASE - h.h"
            :r="h.r"
            :style="{ fill: h.fill, stroke: h.stroke }"
          />
          <ellipse
            class="shine"
            :cx="h.x - h.r * 0.35"
            :cy="BASE - h.h - h.r * 0.4"
            :rx="h.r * 0.28"
            :ry="h.r * 0.18"
          />
        </g>
      </svg>
    </div>

    <div
      class="mix"
      aria-hidden="true"
    >
      <span
        class="m clear"
        :style="{ flexGrow: mix.clear }"
      />
      <span
        class="m cloudy"
        :style="{ flexGrow: mix.cloudy }"
      />
      <span
        class="m amber"
        :style="{ flexGrow: mix.amber }"
      />
    </div>
    <dl class="legend num">
      <div>
        <dt><span class="sw clear" />{{ t('guideWidgets.trich.clear') }}</dt>
        <dd>{{ mix.clear }} %</dd>
      </div>
      <div>
        <dt><span class="sw cloudy" />{{ t('guideWidgets.trich.cloudy') }}</dt>
        <dd>{{ mix.cloudy }} %</dd>
      </div>
      <div>
        <dt><span class="sw amber" />{{ t('guideWidgets.trich.amber') }}</dt>
        <dd>{{ mix.amber }} %</dd>
      </div>
    </dl>

    <div class="gw-field">
      <label
        class="gw-label"
        :for="`${uid}-s`"
      >{{ t('guideWidgets.trich.slider') }}</label>
      <input
        :id="`${uid}-s`"
        v-model.number="s"
        type="range"
        min="0"
        max="100"
        step="1"
        class="gw-range lamp"
        :aria-valuetext="`${mix.clear} % ${t('guideWidgets.trich.clear')}, ${mix.cloudy} % ${t('guideWidgets.trich.cloudy')}, ${mix.amber} % ${t('guideWidgets.trich.amber')}`"
        :style="{ '--pct': `${s}%` }"
      >
    </div>

    <div aria-live="polite">
      <Transition
        name="gw-fade"
        mode="out-in"
      >
        <div
          :key="zone"
          class="advice"
          :class="zone"
        >
          <p class="a-head">
            {{ t(`guideWidgets.trich.${zone}.head`) }}
          </p>
          <p class="gw-text">
            {{ t(`guideWidgets.trich.${zone}.text`) }}
          </p>
        </div>
      </Transition>
    </div>

    <p class="gw-hint">
      {{ t('guideWidgets.trich.tip') }}
    </p>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.scope {
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--well);
  overflow: hidden;
}

.scope svg {
  display: block;
  width: 100%;
  height: auto;
}

.surface {
  fill: var(--green-deep);
  fill-opacity: 0.5;
}

.stalk {
  fill: rgba(220, 236, 225, 0.35);
}

.head {
  stroke-width: 1.5;
  transition: fill var(--dur) ease, stroke var(--dur) ease;
}

.shine {
  fill: rgba(255, 255, 255, 0.7);
}

.mix {
  display: flex;
  gap: 2px;
  height: 10px;
  margin-bottom: -8px;
}

.m {
  flex-basis: 0;
  border-radius: 3px;
}

.clear {
  background: #7d93a3;
}

.cloudy {
  background: #e8ebee;
}

.amber {
  background: #de8e30;
}

.legend {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
}

.legend div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend div:nth-child(2) {
  align-items: center;
}

.legend div:last-child {
  align-items: flex-end;
}

.legend dt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
}

.legend dd {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.sw {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.advice {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.a-head {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.advice.peak .a-head,
.advice.ideal .a-head {
  color: var(--green);
}

.advice.late .a-head {
  color: var(--amber);
}
</style>
