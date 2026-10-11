<script setup lang="ts">
import { formatDuration, lightState } from '~/utils/light'

const props = withDefaults(defineProps<{
  lightsOn: string
  hours: number
  size?: number
}>(), { size: 168 })

const now = ref(new Date())
const drawn = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => (drawn.value = true)))
  timer = setInterval(() => (now.value = new Date()), 30_000)
})
onBeforeUnmount(() => clearInterval(timer))

const { t } = useI18n()
const uid = useId()
const R = 70
const C = 2 * Math.PI * R
const state = computed(() => lightState(props.lightsOn, props.hours, now.value))
const litLen = computed(() => (Math.max(0, Math.min(24, props.hours)) / 24) * C)
const marker = computed(() => {
  const a = state.value.position * 2 * Math.PI - Math.PI / 2
  return { x: 90 + R * Math.cos(a), y: 90 + R * Math.sin(a) }
})
const headline = computed(() => {
  const s = state.value
  if (props.hours >= 24) return { lead: t('ring.lightsOnLead'), value: t('ring.allDay') }
  if (props.hours <= 0) return { lead: t('ring.lightsLead'), value: t('ring.off') }
  return { lead: s.isOn ? t('ring.offIn') : t('ring.onIn'), value: formatDuration(s.minutesLeft) }
})
const label = computed(() => t('ring.label', { on: props.hours, off: 24 - props.hours, lead: headline.value.lead, value: headline.value.value }))
</script>

<template>
  <div
    class="ring-wrap"
    :class="{ dark: !state.isOn }"
  >
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 180 180"
      role="img"
      :aria-label="label"
    >
      <defs>
        <filter
          :id="`${uid}-blur`"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient :id="`${uid}-core`">
          <stop
            offset="0"
            stop-color="#ffd28a"
            stop-opacity=".16"
          />
          <stop
            offset="1"
            stop-color="#ffd28a"
            stop-opacity="0"
          />
        </radialGradient>
      </defs>
      <circle
        class="core"
        cx="90"
        cy="90"
        r="62"
        :fill="`url(#${uid}-core)`"
      />
      <g
        transform="rotate(-90 90 90)"
        fill="none"
        stroke-linecap="round"
      >
        <circle
          cx="90"
          cy="90"
          :r="R"
          stroke="#14171b"
          stroke-width="12"
        />
        <circle
          class="dark-arc"
          cx="90"
          cy="90"
          :r="R"
          stroke="var(--dark-arc)"
          stroke-width="4"
          :stroke-dasharray="`${C - litLen} ${C}`"
          :stroke-dashoffset="-litLen"
        />
        <circle
          class="lit-arc glow"
          cx="90"
          cy="90"
          :r="R"
          stroke="var(--leaf)"
          stroke-width="10"
          :filter="`url(#${uid}-blur)`"
          :stroke-dasharray="`${drawn ? litLen : 0} ${C}`"
        />
        <circle
          class="lit-arc"
          cx="90"
          cy="90"
          :r="R"
          stroke="var(--leaf)"
          stroke-width="10"
          :stroke-dasharray="`${drawn ? litLen : 0} ${C}`"
        />
      </g>
      <g class="marker">
        <circle
          :cx="marker.x"
          :cy="marker.y"
          r="9"
          fill="var(--lamp)"
          :filter="`url(#${uid}-blur)`"
          opacity=".8"
        />
        <circle
          :cx="marker.x"
          :cy="marker.y"
          r="5.5"
          fill="#fff4de"
          stroke="var(--lamp)"
          stroke-width="2"
        />
      </g>
      <text
        x="90"
        y="100"
        text-anchor="middle"
        class="ring-value"
      >{{ hours }}<tspan class="slash">/</tspan>{{ 24 - hours }}</text>
    </svg>
    <div class="ring-text">
      <div class="ring-lead">
        {{ headline.lead }}
      </div>
      <div class="ring-big num">
        {{ headline.value }}
      </div>
      <div class="legend">
        <span><i class="lit" />{{ t('ring.lit') }} {{ state.onLabel }} – {{ state.offLabel }}</span>
        <span v-if="hours > 0 && hours < 24"><i class="off" />{{ t('ring.dark') }} {{ state.offLabel }} – {{ state.onLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ring-wrap {
  display: flex;
  align-items: center;
  gap: 18px;
}

svg {
  flex: none;
  overflow: visible;
}

.lit-arc {
  transition: stroke-dasharray 1.4s 0.5s var(--ease-out);
}

.lit-arc.glow {
  opacity: 0.55;
}

.marker {
  opacity: 0;
  animation: marker-in 0.6s 1.5s var(--ease-out) forwards;
}

@keyframes marker-in {
  to {
    opacity: 1;
  }
}

.dark .core {
  opacity: 0.25;
}

.dark .lit-arc {
  stroke-opacity: 0.55;
}

.ring-value {
  font-size: 26px;
  font-weight: 300;
  fill: var(--text);
}

.slash {
  fill: var(--text-3);
}

.ring-lead {
  font-size: 13px;
  color: var(--text-2);
}

.ring-big {
  margin-top: 2px;
  font-size: 28px;
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--lamp);
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-3);
}

.legend i {
  display: inline-block;
  width: 14px;
  height: 4px;
  margin-right: 8px;
  border-radius: 2px;
  vertical-align: middle;
}

.legend .lit {
  background: var(--leaf);
}

.legend .off {
  background: var(--dark-arc);
}

@media (prefers-reduced-motion: reduce) {
  .marker {
    opacity: 1;
    animation: none;
  }
}
</style>
