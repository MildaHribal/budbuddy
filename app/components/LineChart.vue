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
  color: 'var(--green)'
})

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
          >{{ formatNumber(g, 2) }}</text>
        </template>
      </g>
      <path
        v-if="area"
        :d="area"
        class="area"
      />
      <path
        :d="path"
        class="line"
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
      <strong class="num">{{ formatNumber(tip.value, 2) }}{{ unit }}</strong>
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
  stroke: var(--line);
  stroke-width: 1;
}

.grid text,
.axis {
  fill: var(--text-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.area {
  fill: var(--series);
  fill-opacity: 0.1;
}

.line {
  fill: none;
  stroke: var(--series);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.dot {
  fill: var(--surface);
  stroke: var(--series);
  stroke-width: 1.5;
  transition: r var(--dur-fast) var(--ease-out);
}

.dot.on {
  fill: var(--series);
  stroke: var(--surface);
  stroke-width: 2;
}

.cross {
  stroke: var(--line-strong);
  stroke-dasharray: 2 3;
}

.tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 12px));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-float);
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
</style>
