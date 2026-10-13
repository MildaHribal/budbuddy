<script setup lang="ts">
// Single-series time chart (temperature, humidity or VPD) with an optional target band,
// crosshair + tooltip on pointer and arrow keys.
import type { SeriesPoint } from '~/utils/env/readings'
import { timeLabel } from '~/utils/env/format'

const props = withDefaults(defineProps<{
  points: SeriesPoint[]
  label: string
  unit?: string
  color?: string
  digits?: number
  band?: { min: number, max: number } | null
  bandColor?: string
  /** x domain, so empty edges show gaps in the data */
  from: number
  to: number
}>(), {
  unit: '',
  color: 'var(--green)',
  digits: 1,
  band: null,
  bandColor: 'var(--green)'
})

const W = 320
const H = 140
const PAD = { top: 12, right: 10, bottom: 22, left: 34 }

const active = ref<number | null>(null)

const scale = computed(() => {
  const vals = props.points.map(p => p.v)
  if (props.band) vals.push(props.band.min, props.band.max)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (!Number.isFinite(lo)) {
    lo = 0
    hi = 1
  }
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1)
  const step = niceStep(span / 3)
  const yMin = Math.floor((lo - span * 0.05) / step) * step
  const yMax = Math.ceil((hi + span * 0.05) / step) * step
  const tSpan = props.to - props.from || 1
  const x = (t: number) => PAD.left + ((t - props.from) / tSpan) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom)
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return { x, y, ticks, yMin, yMax }
})

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

// break the line where data is missing for more than 3 typical intervals
const path = computed(() => {
  const pts = props.points
  if (!pts.length) return ''
  const gaps = pts.slice(1).map((p, i) => p.t - pts[i]!.t).sort((a, b) => a - b)
  const typical = gaps[Math.floor(gaps.length / 2)] ?? 0
  const limit = Math.max(typical * 3, 30 * 60_000)
  return pts.map((p, i) => {
    const jump = i === 0 || p.t - pts[i - 1]!.t > limit
    return `${jump ? 'M' : 'L'}${scale.value.x(p.t).toFixed(1)},${scale.value.y(p.v).toFixed(1)}`
  }).join(' ')
})

const bandRect = computed(() => {
  if (!props.band) return null
  const { y } = scale.value
  const top = y(props.band.max)
  return { y: top, h: Math.max(0, y(props.band.min) - top) }
})

const multiDay = computed(() => props.to - props.from > 36 * 3_600_000)
const xLabels = computed(() => [props.from, (props.from + props.to) / 2, props.to].map(t => ({ t, text: timeLabel(t, multiDay.value) })))

function pick(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * W
  let best = 0
  let dist = Infinity
  props.points.forEach((p, i) => {
    const d = Math.abs(scale.value.x(p.t) - px)
    if (d < dist) {
      dist = d
      best = i
    }
  })
  active.value = props.points.length ? best : null
}

function onKey(e: KeyboardEvent) {
  const n = props.points.length
  if (!n) return
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    const cur = active.value ?? n - 1
    active.value = Math.min(n - 1, Math.max(0, cur + (e.key === 'ArrowLeft' ? -1 : 1)))
  } else if (e.key === 'Escape') {
    active.value = null
  }
}

const tip = computed(() => {
  if (active.value === null) return null
  const p = props.points[active.value]
  if (!p) return null
  const left = (scale.value.x(p.t) / W) * 100
  return { value: formatNumber(p.v, props.digits), time: timeLabel(p.t, true), left: Math.min(80, Math.max(20, left)), top: (scale.value.y(p.v) / H) * 100, x: scale.value.x(p.t), y: scale.value.y(p.v) }
})
const last = computed(() => props.points[props.points.length - 1] ?? null)
</script>

<template>
  <figure
    class="tchart"
    :style="{ '--series': color, '--band': bandColor }"
  >
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      tabindex="0"
      :aria-label="label"
      @pointermove="pick"
      @pointerdown="pick"
      @pointerleave="active = null"
      @keydown="onKey"
      @blur="active = null"
    >
      <rect
        v-if="bandRect"
        class="band"
        :x="PAD.left"
        :y="bandRect.y"
        :width="W - PAD.left - PAD.right"
        :height="bandRect.h"
      />
      <g class="grid">
        <template
          v-for="g in scale.ticks"
          :key="g"
        >
          <line
            :x1="PAD.left"
            :x2="W - PAD.right"
            :y1="scale.y(g)"
            :y2="scale.y(g)"
          />
          <text
            :x="PAD.left - 6"
            :y="scale.y(g) + 3.5"
            text-anchor="end"
          >{{ formatNumber(g, digits) }}</text>
        </template>
      </g>
      <path
        :d="path"
        class="line"
      />
      <circle
        v-if="last && !tip"
        :cx="scale.x(last.t)"
        :cy="scale.y(last.v)"
        r="4"
        class="dot"
      />
      <template v-if="tip">
        <line
          class="cross"
          :x1="tip.x"
          :x2="tip.x"
          :y1="PAD.top"
          :y2="H - PAD.bottom"
        />
        <circle
          :cx="tip.x"
          :cy="tip.y"
          r="4.5"
          class="dot"
        />
      </template>
      <text
        v-for="(xl, i) in xLabels"
        :key="i"
        :x="scale.x(xl.t)"
        :y="H - 5"
        class="axis"
        :text-anchor="i === 0 ? 'start' : i === 2 ? 'end' : 'middle'"
      >{{ xl.text }}</text>
    </svg>
    <div
      v-if="tip"
      class="tip"
      :style="{ left: `${tip.left}%`, top: `${tip.top}%` }"
    >
      <strong class="num">{{ tip.value }}{{ unit }}</strong>
      <span>{{ tip.time }}</span>
    </div>
  </figure>
</template>

<style scoped>
.tchart {
  position: relative;
  margin: 0;
}

svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
  touch-action: pan-y;
  border-radius: 4px;
}

svg:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 4px;
}

.band {
  fill: var(--band);
  fill-opacity: 0.12;
}

.grid line {
  stroke: var(--line);
  stroke-width: 1;
}

.grid text,
.axis {
  fill: var(--text-3);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}

.line {
  fill: none;
  stroke: var(--series);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.dot {
  fill: var(--series);
  stroke: var(--surface);
  stroke-width: 2;
}

.cross {
  stroke: var(--line-strong);
  stroke-width: 1;
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
