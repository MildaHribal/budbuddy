<script setup lang="ts">
import type { SeriesPoint } from '~/utils/review/compare'

// Two series on a shared "day from start" axis.
const props = withDefaults(defineProps<{
  a: SeriesPoint[]
  b: SeriesPoint[]
  maxDay: number
  label: string
  unit?: string
  digits?: number
  colorA?: string
  colorB?: string
  nameA: string
  nameB: string
}>(), { unit: '', digits: 1, colorA: 'var(--green)', colorB: '#b58cf5' })

const { t } = useI18n()
const W = 320
const H = 150
const PAD = { top: 14, right: 10, bottom: 22, left: 32 }

const scale = computed(() => {
  const values = [...props.a, ...props.b].map(p => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (!Number.isFinite(min)) {
    min = 0
    max = 1
  }
  if (max - min < 0.4) {
    min -= 0.2
    max += 0.2
  }
  const pad = (max - min) * 0.12
  min = Math.max(0, min - pad)
  max += pad
  const days = Math.max(1, props.maxDay)
  const x = (d: number) => PAD.left + (d / days) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom)
  return { x, y, min, max }
})

const path = (pts: SeriesPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${scale.value.x(p.day).toFixed(1)},${scale.value.y(p.value).toFixed(1)}`).join(' ')
const grid = computed(() => [scale.value.min, (scale.value.min + scale.value.max) / 2, scale.value.max])

const activeDay = ref<number | null>(null)
const near = (pts: SeriesPoint[], day: number) => {
  let best: SeriesPoint | null = null
  for (const p of pts) if (Math.abs(p.day - day) <= 3 && (!best || Math.abs(p.day - day) < Math.abs(best.day - day))) best = p
  return best
}
const tip = computed(() => {
  const d = activeDay.value
  if (d === null) return null
  return { day: d, a: near(props.a, d), b: near(props.b, d) }
})

function pick(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * W
  const day = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * Math.max(1, props.maxDay))
  const all = [...props.a, ...props.b]
  if (!all.length) return
  activeDay.value = all.reduce((best, p) => (Math.abs(p.day - day) < Math.abs(best - day) ? p.day : best), all[0]!.day)
}

const fmt = (p: SeriesPoint | null) => (p ? `${formatNumber(p.value, props.digits)}${props.unit ? ` ${props.unit}` : ''}` : '–')
</script>

<template>
  <figure class="dual">
    <figcaption class="dual-head">
      <span class="dual-title">{{ label }}</span>
      <span
        v-if="tip"
        class="dual-tip num"
      >
        {{ t('review.timelapse.day', { n: tip.day }) }} ·
        <b :style="{ color: colorA }">{{ fmt(tip.a) }}</b> /
        <b :style="{ color: colorB }">{{ fmt(tip.b) }}</b>
      </span>
    </figcaption>
    <p
      v-if="!a.length && !b.length"
      class="dual-empty"
    >
      {{ t('review.compare.noReadings') }}
    </p>
    <svg
      v-else
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="t('review.compare.chartAria', { label, a: nameA, b: nameB })"
      @pointerdown="pick"
      @pointermove="e => e.buttons && pick(e)"
    >
      <g class="grid">
        <template
          v-for="v in grid"
          :key="v"
        >
          <line
            :x1="PAD.left"
            :x2="W - PAD.right"
            :y1="scale.y(v)"
            :y2="scale.y(v)"
          />
          <text
            :x="PAD.left - 6"
            :y="scale.y(v) + 3"
            text-anchor="end"
          >{{ formatNumber(v, digits) }}</text>
        </template>
        <text
          :x="PAD.left"
          :y="H - 6"
        >0</text>
        <text
          :x="W - PAD.right"
          :y="H - 6"
          text-anchor="end"
        >{{ t('review.timelapse.day', { n: maxDay }) }}</text>
      </g>
      <line
        v-if="tip"
        class="cursor"
        :x1="scale.x(tip.day)"
        :x2="scale.x(tip.day)"
        :y1="PAD.top"
        :y2="H - PAD.bottom"
      />
      <path
        v-if="a.length > 1"
        :d="path(a)"
        class="line"
        :stroke="colorA"
      />
      <path
        v-if="b.length > 1"
        :d="path(b)"
        class="line"
        :stroke="colorB"
      />
      <circle
        v-for="p in a"
        :key="`a${p.day}`"
        :cx="scale.x(p.day)"
        :cy="scale.y(p.value)"
        r="2.6"
        :fill="colorA"
      />
      <rect
        v-for="p in b"
        :key="`b${p.day}`"
        :x="scale.x(p.day) - 2.4"
        :y="scale.y(p.value) - 2.4"
        width="4.8"
        height="4.8"
        :fill="colorB"
      />
    </svg>
  </figure>
</template>

<style scoped>
.dual {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dual-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  min-height: 20px;
}

.dual-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.dual-tip {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.dual-tip b {
  font-weight: 600;
}

.dual-empty {
  margin: 0;
  padding: 18px 0;
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
}

.grid line {
  stroke: var(--line);
  stroke-width: 1;
}

.grid text {
  fill: var(--text-3);
  font-size: 9px;
}

.cursor {
  stroke: var(--line-strong);
  stroke-width: 1;
}

.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
</style>
