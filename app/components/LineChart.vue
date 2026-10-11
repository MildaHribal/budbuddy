<script setup lang="ts">
// Single-series line chart (e.g. plant height over time) with a tap/hover tooltip.
export interface LinePoint {
  label: string
  value: number
}

const props = withDefaults(defineProps<{
  points: LinePoint[]
  unit?: string
  color?: string
  label: string
}>(), {
  unit: '',
  color: 'var(--leaf)'
})

const uid = useId()
const fadeId = `fade-${uid}`
const glowId = `glow-${uid}`

const W = 320
const H = 150
const PAD = { top: 16, right: 12, bottom: 24, left: 30 }

const active = ref<number | null>(null)

const scale = computed(() => {
  const values = props.points.map(p => p.value)
  const max = Math.max(...values, 1)
  const niceMax = Math.ceil(max / 10) * 10 || 10
  const n = props.points.length
  const x = (i: number) => PAD.left + (n <= 1 ? (W - PAD.left - PAD.right) / 2 : (i / (n - 1)) * (W - PAD.left - PAD.right))
  const y = (v: number) => PAD.top + (1 - v / niceMax) * (H - PAD.top - PAD.bottom)
  return { x, y, niceMax }
})

const path = computed(() => props.points
  .map((p, i) => `${i ? 'L' : 'M'}${scale.value.x(i).toFixed(1)},${scale.value.y(p.value).toFixed(1)}`)
  .join(' '))

const area = computed(() => {
  if (props.points.length < 2) return ''
  const { x, y } = scale.value
  const last = props.points.length - 1
  return `${path.value} L${x(last).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
})

const gridLines = computed(() => [0, 0.5, 1].map(f => Math.round(scale.value.niceMax * f)))
const lastIndex = computed(() => props.points.length - 1)

function pick(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * W
  let best = 0
  let dist = Infinity
  props.points.forEach((_, i) => {
    const d = Math.abs(scale.value.x(i) - px)
    if (d < dist) {
      dist = d
      best = i
    }
  })
  active.value = best
}

const tip = computed(() => {
  if (active.value === null) return null
  const p = props.points[active.value]
  if (!p) return null
  const left = (scale.value.x(active.value) / W) * 100
  return { ...p, left: Math.min(84, Math.max(16, left)), top: (scale.value.y(p.value) / H) * 100 }
})
</script>

<template>
  <figure
    class="chart"
    :style="{ '--series': color }"
  >
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="label"
      @pointermove="pick"
      @pointerdown="pick"
      @pointerleave="active = null"
    >
      <defs>
        <linearGradient
          :id="fadeId"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0"
            class="fade-top"
          />
          <stop
            offset="1"
            class="fade-bottom"
          />
        </linearGradient>
        <filter
          :id="glowId"
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          :width="W"
          :height="H"
        >
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <g class="grid">
        <template
          v-for="g in gridLines"
          :key="g"
        >
          <line
            :x1="PAD.left"
            :x2="W - PAD.right"
            :y1="scale.y(g)"
            :y2="scale.y(g)"
          />
          <text
            :x="PAD.left - 8"
            :y="scale.y(g) + 3.5"
            text-anchor="end"
          >{{ g }}</text>
        </template>
      </g>
      <path
        v-if="area"
        :d="area"
        class="area"
        :fill="`url(#${fadeId})`"
      />
      <path
        :d="path"
        class="line-glow"
        :filter="`url(#${glowId})`"
        pathLength="1"
      />
      <path
        :d="path"
        class="line"
        pathLength="1"
      />
      <line
        v-if="tip"
        class="cross"
        :x1="scale.x(active!)"
        :x2="scale.x(active!)"
        :y1="PAD.top"
        :y2="H - PAD.bottom"
      />
      <circle
        v-for="(p, i) in points"
        :key="i"
        :cx="scale.x(i)"
        :cy="scale.y(p.value)"
        :r="active === i ? 5 : i === lastIndex ? 4 : 2.5"
        class="dot"
        :class="{ on: active === i || i === lastIndex }"
      />
      <text
        :x="PAD.left"
        :y="H - 6"
        class="axis"
      >{{ points[0]?.label }}</text>
      <text
        v-if="points.length > 1"
        :x="W - PAD.right"
        :y="H - 6"
        class="axis"
        text-anchor="end"
      >{{ points[lastIndex]?.label }}</text>
    </svg>
    <div
      v-if="tip"
      class="tip"
      :style="{ left: `${tip.left}%`, top: `${tip.top}%` }"
    >
      <strong class="num">{{ tip.value }}{{ unit }}</strong>
      <span>{{ tip.label }}</span>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  position: relative;
  margin: 0;
}

svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
  touch-action: pan-y;
}

.grid line {
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 1;
}

.grid text,
.axis {
  fill: var(--text-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.fade-top {
  stop-color: var(--series);
  stop-opacity: 0.22;
}

.fade-bottom {
  stop-color: var(--series);
  stop-opacity: 0;
}

.area {
  animation: chart-fade 0.6s var(--ease-out) 0.25s backwards;
}

.line,
.line-glow {
  fill: none;
  stroke: var(--series);
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 1;
  animation: chart-draw 0.9s var(--ease-out) backwards;
}

.line {
  stroke-width: 2;
}

.line-glow {
  stroke-width: 4;
  opacity: 0.55;
}

.dot {
  fill: #0b0d10;
  stroke: var(--series);
  stroke-width: 1.5;
  transition: r var(--dur-fast) var(--ease-out);
}

.dot.on {
  fill: var(--series);
  stroke: #0b0d10;
  stroke-width: 2;
}

.cross {
  stroke: rgba(255, 255, 255, 0.18);
  stroke-dasharray: 2 3;
}

.tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 12px));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  box-shadow: var(--panel-shadow);
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
}

.tip strong {
  font-weight: 600;
}

.tip span {
  color: var(--text-2);
  font-size: 11px;
}

@keyframes chart-draw {
  from {
    stroke-dashoffset: 1;
  }
}

@keyframes chart-fade {
  from {
    opacity: 0;
  }
}
</style>
