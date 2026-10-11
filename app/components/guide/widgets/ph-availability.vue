<script setup lang="ts">
import { intlLocale } from '~/utils/locale'

type Medium = 'soil' | 'coco' | 'hydro'
const props = withDefaults(defineProps<{ medium?: Medium }>(), { medium: 'soil' })
const { t } = useI18n()
const uid = useId()

const soilless = ref(props.medium !== 'soil')
watch(() => props.medium, (m) => {
  soilless.value = m !== 'soil'
})

const MIN = 4
const MAX = 8.5
const ph = ref(soilless.value ? 6 : 6.5)
const optimum = computed<[number, number]>(() => (soilless.value ? [5.5, 6.5] : [6, 7]))
// Soilless media sit roughly half a pH point lower than soil for the same availability.
const shift = computed(() => (soilless.value ? -0.5 : 0))

// Soil availability 0–1 vs pH (simplified Truog chart).
const CURVES: { el: string, pts: [number, number][] }[] = [
  { el: 'N', pts: [[4, 0.3], [5, 0.5], [6, 1], [8, 1], [8.5, 0.8]] },
  { el: 'P', pts: [[4, 0.2], [5.5, 0.5], [6.3, 1], [7.2, 1], [7.8, 0.5], [8.5, 0.4]] },
  { el: 'K', pts: [[4, 0.35], [5, 0.5], [6, 1], [8.5, 1]] },
  { el: 'Ca', pts: [[4, 0.2], [5.5, 0.5], [6.5, 1], [8.5, 1]] },
  { el: 'Mg', pts: [[4, 0.2], [5.5, 0.5], [6.5, 1], [8.5, 1]] },
  { el: 'S', pts: [[4, 0.35], [5, 0.5], [6, 1], [8.5, 1]] },
  { el: 'Fe', pts: [[4, 1], [6, 1], [6.8, 0.6], [7.5, 0.3], [8.5, 0.2]] },
  { el: 'Mn', pts: [[4, 1], [6.2, 1], [7, 0.55], [7.5, 0.35], [8.5, 0.25]] },
  { el: 'B', pts: [[4, 0.4], [5, 0.6], [5.8, 1], [7, 1], [7.5, 0.6], [8.5, 0.4]] },
  { el: 'Cu', pts: [[4, 0.6], [5, 1], [7, 1], [7.8, 0.5], [8.5, 0.4]] },
  { el: 'Zn', pts: [[4, 0.9], [5, 1], [7, 1], [7.6, 0.5], [8.5, 0.3]] },
  { el: 'Mo', pts: [[4, 0.2], [5.5, 0.4], [6.5, 0.8], [7, 1], [8.5, 1]] }
]

function curve(pts: [number, number][], x: number): number {
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  if (x <= first[0]) return first[1]
  if (x >= last[0]) return last[1]
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i]!
    const [x0, y0] = pts[i - 1]!
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return last[1]
}

const W = 300
const ROW = 20
const LEFT = 30
const PLOT = W - LEFT - 4
const H = CURVES.length * ROW
const HALF = 8
const xOf = (p: number) => LEFT + ((p - MIN) / (MAX - MIN)) * PLOT

const rows = computed(() => CURVES.map((c, i) => {
  const cy = i * ROW + ROW / 2
  const top: string[] = []
  const bottom: string[] = []
  for (let p = MIN; p <= MAX + 1e-6; p += 0.125) {
    const a = curve(c.pts, p - shift.value)
    top.push(`${xOf(p).toFixed(1)} ${(cy - a * HALF).toFixed(1)}`)
    bottom.unshift(`${xOf(p).toFixed(1)} ${(cy + a * HALF).toFixed(1)}`)
  }
  const d = `M${top.join(' L')} L${bottom.join(' L')} Z`
  const now = curve(c.pts, ph.value - shift.value)
  return { el: c.el, cy, d, now, state: now < 0.45 ? 'locked' : now < 0.75 ? 'low' : 'ok' }
}))

const locked = computed(() => rows.value.filter(r => r.state === 'locked').map(r => r.el))
const low = computed(() => rows.value.filter(r => r.state === 'low').map(r => r.el))
const verdict = computed(() => {
  const [a, b] = optimum.value
  if (ph.value >= a && ph.value <= b) return { tone: 'ok', head: t('guideWidgets.ph.sweet') }
  return { tone: 'bad', head: ph.value < a ? t('guideWidgets.ph.acid') : t('guideWidgets.ph.alkaline') }
})

const svg = ref<SVGSVGElement | null>(null)
const dragging = ref(false)
function fromPointer(e: PointerEvent) {
  const r = svg.value?.getBoundingClientRect()
  if (!r) return
  const x = ((e.clientX - r.left) / r.width) * W
  const p = MIN + ((x - LEFT) / PLOT) * (MAX - MIN)
  ph.value = Math.round(Math.min(MAX, Math.max(MIN, p)) * 10) / 10
}
function down(e: PointerEvent) {
  dragging.value = true
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  fromPointer(e)
}
function move(e: PointerEvent) {
  if (dragging.value) fromPointer(e)
}
function up() {
  dragging.value = false
}

const fmt = (n: number) => n.toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const axis = [4, 5, 6, 7, 8]
</script>

<template>
  <div class="gw ph">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.ph.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.ph.sub') }}
      </p>
    </div>

    <div
      class="segmented"
      role="group"
      :aria-label="t('guideWidgets.ph.medium')"
    >
      <button
        type="button"
        :aria-pressed="!soilless"
        @click="soilless = false"
      >
        {{ t('guideWidgets.ph.soil') }}
      </button>
      <button
        type="button"
        :aria-pressed="soilless"
        @click="soilless = true"
      >
        {{ t('guideWidgets.ph.soilless') }}
      </button>
    </div>

    <div class="head-row">
      <p class="gw-big num">
        <span class="gw-unit">pH</span>{{ fmt(ph) }}
      </p>
      <span class="opt num">{{ t('guideWidgets.ph.target', { a: fmt(optimum[0]), b: fmt(optimum[1]) }) }}</span>
    </div>

    <svg
      ref="svg"
      class="chart"
      :class="{ dragging }"
      :viewBox="`0 0 ${W} ${H + 22}`"
      role="img"
      :aria-label="t('guideWidgets.ph.chartLabel')"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    >
      <rect
        class="opt-zone"
        :x="xOf(optimum[0])"
        :width="xOf(optimum[1]) - xOf(optimum[0])"
        y="0"
        :height="H"
        rx="6"
      />
      <g
        v-for="r in rows"
        :key="r.el"
        :class="['row', r.state]"
      >
        <text
          class="el"
          x="0"
          :y="r.cy + 4"
        >{{ r.el }}</text>
        <path
          class="band"
          :d="r.d"
          :style="{ d: `path('${r.d}')` }"
        />
        <circle
          class="dot"
          :cx="xOf(ph)"
          :cy="r.cy"
          :r="2 + r.now * 4"
        />
      </g>
      <g
        v-for="a in axis"
        :key="a"
        class="axis"
      >
        <line
          :x1="xOf(a)"
          :x2="xOf(a)"
          :y1="H"
          :y2="H + 4"
        />
        <text
          :x="xOf(a)"
          :y="H + 16"
        >{{ a }}</text>
      </g>
      <g
        class="marker"
        :style="{ transform: `translateX(${xOf(ph)}px)` }"
      >
        <line
          x1="0"
          x2="0"
          y1="-2"
          :y2="H + 2"
        />
        <circle
          cx="0"
          :cy="H + 2"
          r="5"
        />
      </g>
    </svg>

    <div class="gw-field slider">
      <label
        class="sr-only"
        :for="`${uid}-ph`"
      >{{ t('guideWidgets.ph.slider') }}</label>
      <input
        :id="`${uid}-ph`"
        v-model.number="ph"
        type="range"
        :min="MIN"
        :max="MAX"
        step="0.1"
        class="gw-range lamp"
        :style="{ '--pct': `${((ph - MIN) / (MAX - MIN)) * 100}%` }"
      >
    </div>

    <div
      class="verdict"
      :class="verdict.tone"
      aria-live="polite"
    >
      <p class="v-head">
        {{ verdict.head }}
      </p>
      <p
        v-if="locked.length"
        class="gw-text"
      >
        <strong class="locked-t">{{ t('guideWidgets.ph.locked') }}</strong> {{ locked.join(', ') }}
      </p>
      <p
        v-if="low.length"
        class="gw-text"
      >
        <strong class="low-t">{{ t('guideWidgets.ph.low') }}</strong> {{ low.join(', ') }}
      </p>
      <p
        v-if="!locked.length && !low.length"
        class="gw-text"
      >
        {{ t('guideWidgets.ph.allOk') }}
      </p>
    </div>
    <p class="gw-hint">
      {{ t('guideWidgets.ph.note') }}
    </p>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.head-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.head-row .gw-big {
  color: var(--lamp);
}

.opt {
  font-size: 12px;
  color: var(--leaf);
}

.chart {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  touch-action: pan-y;
  user-select: none;
  cursor: ew-resize;
}

.opt-zone {
  fill: var(--accent-soft);
  stroke: var(--accent-line);
  stroke-dasharray: 3 3;
  transition: x var(--dur-slow) var(--ease-out), width var(--dur-slow) var(--ease-out);
}

.el {
  font-size: 11px;
  font-weight: 600;
  fill: var(--text-2);
  transition: fill var(--dur) ease;
}

.band {
  fill: var(--leaf);
  fill-opacity: 0.32;
  transition: d var(--dur-slow) var(--ease-out), fill var(--dur) ease, fill-opacity var(--dur) ease;
}

.dot {
  fill: var(--leaf);
  transition: r var(--dur-fast) var(--ease-out), fill var(--dur) ease;
}

.row.low .el,
.row.low .dot {
  fill: var(--lamp);
}

.row.locked .el,
.row.locked .dot {
  fill: var(--danger);
}

.row.locked .band {
  fill-opacity: 0.16;
}

.axis line {
  stroke: var(--line-strong);
}

.axis text {
  font-size: 11px;
  fill: var(--text-3);
  text-anchor: middle;
}

.marker {
  transition: transform var(--dur) var(--ease-out);
}

.dragging .marker {
  transition: none;
}

.marker line {
  stroke: var(--lamp);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(255, 210, 138, 0.7));
}

.marker circle {
  fill: var(--lamp);
  stroke: #0b0d10;
  stroke-width: 2;
}

.slider {
  margin-top: -14px;
}

.verdict {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v-head {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.verdict.ok .v-head {
  color: var(--leaf);
}

.verdict.bad .v-head {
  color: var(--lamp);
}

.locked-t {
  color: #ff9aa3;
}

.low-t {
  color: var(--lamp);
}
</style>
