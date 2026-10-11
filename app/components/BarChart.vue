<script setup lang="ts">
export interface Bar {
  label: string
  value: number
  hint?: string
  highlight?: boolean
}

const props = withDefaults(defineProps<{
  bars: Bar[]
  label: string
  unit?: string
}>(), { unit: '' })

const active = ref<number | null>(null)
const intro = ref(true)
const root = ref<HTMLElement | null>(null)

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]
const scale = computed(() => {
  const max = Math.max(...props.bars.map(b => b.value), 0)
  const step = STEPS.find(s => s * 2 >= max) ?? Math.ceil(max / 2)
  return { top: step * 2, ticks: [step * 2, step, 0] }
})

const pct = (v: number) => (v / scale.value.top) * 100

function onEnter(e: PointerEvent, i: number) {
  if (e.pointerType === 'mouse') active.value = i
}
function onLeave(e: PointerEvent) {
  if (e.pointerType === 'mouse') active.value = null
}
function onTap(i: number) {
  active.value = active.value === i ? null : i
}

function onOutside(e: PointerEvent) {
  if (active.value !== null && root.value && !root.value.contains(e.target as Node)) active.value = null
}

watch(() => props.bars.length, () => {
  active.value = null
})

onMounted(() => {
  document.addEventListener('pointerdown', onOutside)
  setTimeout(() => {
    intro.value = false
  }, 1400)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside))
</script>

<template>
  <figure
    ref="root"
    class="chart"
    :class="{ intro }"
    role="img"
    :aria-label="label"
  >
    <div
      class="grid"
      aria-hidden="true"
    >
      <div
        v-for="t in scale.ticks"
        :key="t"
        class="gridline"
        :class="{ base: t === 0 }"
        :style="{ bottom: `${pct(t)}%` }"
      >
        <span class="num">{{ t }}</span>
      </div>
    </div>

    <div class="plot">
      <div
        v-for="(b, i) in bars"
        :key="i"
        class="col"
        :class="{ active: active === i, dim: active !== null && active !== i, first: i === 0, last: i === bars.length - 1 }"
        :style="{ '--h': `${b.value ? Math.max(3, pct(b.value)) : 0}%`, '--i': i }"
        @pointerenter="onEnter($event, i)"
        @pointerleave="onLeave"
        @click="onTap(i)"
      >
        <div class="track">
          <div
            class="bar"
            :class="{ highlight: b.highlight, empty: !b.value }"
          />
          <div
            v-if="active === i"
            class="tip"
          >
            <strong class="num">{{ formatNumber(b.value, 2) }}{{ unit }}</strong>
            <span v-if="b.hint">{{ b.hint }}</span>
          </div>
        </div>
        <span
          class="label"
          :class="{ highlight: b.highlight }"
        >{{ b.label }}</span>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  position: relative;
  margin: 0;
  height: 168px;
  padding-left: 26px;
  user-select: none;
}

.grid {
  position: absolute;
  inset: 0 0 24px 26px;
  pointer-events: none;
}

.gridline {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
}

.gridline.base {
  border-top: 1px solid var(--line-strong);
}

.gridline span {
  position: absolute;
  right: calc(100% + 8px);
  top: -7px;
  font-size: 11px;
  line-height: 1;
  color: var(--text-3);
}

.plot {
  position: relative;
  display: flex;
  height: 100%;
}

.col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.track {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
}

.bar {
  width: min(14px, 46%);
  height: 100%;
  background: color-mix(in srgb, var(--leaf) 52%, transparent);
  clip-path: inset(calc(100% - var(--h)) 0 0 0 round 4px 4px 0 0);
  transition: clip-path var(--dur-slow) var(--ease-out), background var(--dur) ease, opacity var(--dur) ease;
}

.bar.highlight {
  background: var(--leaf);
}

.col.active .bar {
  background: var(--leaf);
}

.col.dim .bar {
  opacity: 0.45;
}

.intro .bar {
  animation: bar-grow 0.8s var(--ease-out) both;
  animation-delay: calc(var(--i) * 45ms + 80ms);
}

@keyframes bar-grow {
  from {
    clip-path: inset(100% 0 0 0 round 4px 4px 0 0);
  }
}

.label {
  height: 24px;
  padding-top: 7px;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: var(--text-3);
  white-space: nowrap;
}

.label.highlight {
  color: var(--leaf);
  font-weight: 600;
}

.tip {
  position: absolute;
  bottom: calc(var(--h) + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--surface-3);
  border: 1px solid var(--line-strong);
  box-shadow: inset 0 1px 0 var(--highlight), 0 8px 18px -6px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  pointer-events: none;
  animation: tip-in var(--dur-fast) var(--ease-out) both;
}

.first .tip {
  left: 0;
  transform: none;
}

.last .tip {
  left: auto;
  right: 0;
  transform: none;
}

.tip strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.tip span {
  font-size: 11px;
  color: var(--text-2);
}

@keyframes tip-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro .bar {
    animation: none;
  }
}
</style>
