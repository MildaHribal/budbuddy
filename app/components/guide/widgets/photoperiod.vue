<script setup lang="ts">
const props = withDefaults(defineProps<{ hours?: number }>(), { hours: 18 })
const { t } = useI18n()
const uid = useId()

const hours = ref(Math.min(24, Math.max(6, props.hours)))
const PRESETS = [18, 20, 12, 24]
const ON = 6

const R = 76
const C = 2 * Math.PI * R
const drawn = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => {
  drawn.value = true
})))

const lit = computed(() => (drawn.value ? (hours.value / 24) * C : 0))
const tip = computed(() => `rotate(${((ON + (drawn.value ? hours.value : 0)) / 24) * 360 - 90}deg)`)
const ticks = Array.from({ length: 24 }, (_, h) => {
  const a = (h / 24) * 2 * Math.PI - Math.PI / 2
  const r1 = h % 6 === 0 ? R - 18 : R - 14
  return { h, x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: Math.cos(a) * (R - 11), y2: Math.sin(a) * (R - 11) }
})
const labels = [0, 6, 12, 18].map((h) => {
  const a = (h / 24) * 2 * Math.PI - Math.PI / 2
  return { h, x: Math.cos(a) * (R + 20), y: Math.sin(a) * (R + 20) + 4 }
})
const hhmm = (h: number) => `${String(h % 24).padStart(2, '0')}:00`

const photo = computed(() => {
  const h = hours.value
  if (h >= 24) return 'p24'
  if (h >= 16) return 'pVeg'
  if (h >= 13) return 'pGrey'
  if (h >= 10) return 'pFlower'
  return 'pShort'
})
const auto = computed(() => {
  const h = hours.value
  if (h >= 24) return 'a24'
  if (h >= 18) return 'aBest'
  if (h >= 13) return 'aOk'
  return 'aLow'
})
const presetNote = computed(() => (PRESETS.includes(hours.value) ? t(`guideWidgets.photo.preset${hours.value}`) : ''))
</script>

<template>
  <div class="gw photo">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.photo.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.photo.sub') }}
      </p>
    </div>

    <div
      class="gw-chips presets"
      role="group"
      :aria-label="t('guideWidgets.photo.presets')"
    >
      <button
        v-for="p in PRESETS"
        :key="p"
        type="button"
        class="chip num"
        :aria-pressed="hours === p"
        @click="hours = p"
      >
        {{ p }}/{{ 24 - p }}
      </button>
    </div>

    <div class="dial-wrap">
      <svg
        class="dial"
        viewBox="-110 -110 220 220"
        role="img"
        :aria-label="t('guideWidgets.photo.dialLabel', { on: hours, off: 24 - hours })"
      >
        <circle
          class="dark-arc"
          :r="R"
        />
        <circle
          class="lit-arc"
          :r="R"
          :stroke-dasharray="`${lit} ${C}`"
          :transform="`rotate(${(ON / 24) * 360 - 90})`"
        />
        <line
          v-for="tk in ticks"
          :key="tk.h"
          class="tick"
          :class="{ major: tk.h % 6 === 0 }"
          :x1="tk.x1"
          :y1="tk.y1"
          :x2="tk.x2"
          :y2="tk.y2"
        />
        <text
          v-for="lb in labels"
          :key="lb.h"
          class="hour num"
          :x="lb.x"
          :y="lb.y"
        >{{ String(lb.h).padStart(2, '0') }}</text>
        <g
          class="tip"
          :style="{ transform: tip }"
        >
          <circle
            :cx="R"
            r="7"
          />
        </g>
        <text
          class="center num"
          y="4"
        >{{ hours }}<tspan
          class="center-unit"
          dx="3"
        >h</tspan></text>
        <text
          class="center-sub num"
          y="28"
        >{{ t('guideWidgets.photo.dark', { n: 24 - hours }) }}</text>
      </svg>
    </div>

    <p class="times num">
      {{ t('guideWidgets.photo.times', { on: hhmm(ON), off: hhmm(ON + hours) }) }}
    </p>

    <div class="gw-field">
      <div class="gw-range-head">
        <label
          class="gw-label"
          :for="`${uid}-h`"
        >{{ t('guideWidgets.photo.hours') }}</label>
        <output
          class="gw-value"
          :for="`${uid}-h`"
        >{{ hours }}/{{ 24 - hours }}</output>
      </div>
      <input
        :id="`${uid}-h`"
        v-model.number="hours"
        type="range"
        min="6"
        max="24"
        step="1"
        class="gw-range lamp"
        :style="{ '--pct': `${((hours - 6) / 18) * 100}%` }"
      >
    </div>

    <Transition
      name="gw-fade"
      mode="out-in"
    >
      <p
        v-if="presetNote"
        :key="hours"
        class="gw-text preset-note"
      >
        {{ presetNote }}
      </p>
    </Transition>

    <dl
      class="verdicts"
      aria-live="polite"
    >
      <div class="v">
        <dt>
          <GrowIcon
            name="flowering"
            class="v-icon"
          />{{ t('guideWidgets.photo.photoLabel') }}
        </dt>
        <dd class="gw-text">
          {{ t(`guideWidgets.photo.${photo}`) }}
        </dd>
      </div>
      <div class="v">
        <dt>
          <GrowIcon
            name="seedling"
            class="v-icon"
          />{{ t('guideWidgets.photo.autoLabel') }}
        </dt>
        <dd class="gw-text">
          {{ t(`guideWidgets.photo.${auto}`) }}
        </dd>
      </div>
    </dl>

    <p class="gw-hint">
      {{ t('guideWidgets.photo.explain') }}
    </p>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.presets .chip {
  flex: 1;
  justify-content: center;
}

.dial-wrap {
  display: flex;
  justify-content: center;
}

.dial {
  width: min(220px, 100%);
  height: auto;
  overflow: visible;
}

.dark-arc,
.lit-arc {
  fill: none;
  stroke-width: 12;
}

.dark-arc {
  stroke: var(--dark-arc);
  opacity: 0.6;
}

.lit-arc {
  stroke: var(--lamp);
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px rgba(255, 210, 138, 0.55));
  transition: stroke-dasharray var(--dur-slow) var(--ease-out);
}

.tick {
  stroke: var(--line-strong);
  stroke-width: 1;
}

.tick.major {
  stroke: var(--text-3);
  stroke-width: 1.5;
}

.hour {
  font-size: 11px;
  fill: var(--text-3);
  text-anchor: middle;
}

.tip {
  transition: transform var(--dur-slow) var(--ease-out);
}

.tip circle {
  fill: #fff4dc;
  stroke: var(--lamp);
  stroke-width: 3;
  filter: drop-shadow(0 0 8px rgba(255, 210, 138, 0.9));
}

.center {
  font-size: 40px;
  font-weight: 300;
  letter-spacing: -0.03em;
  fill: var(--lamp);
  text-anchor: middle;
}

.center-unit {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
  fill: var(--text-3);
}

.center-sub {
  font-size: 12px;
  fill: var(--text-2);
  text-anchor: middle;
}

.times {
  margin: -6px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-2);
}

.preset-note {
  color: var(--text);
}

.verdicts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}

.v dt {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.v-icon {
  font-size: 18px;
  color: var(--leaf);
}

.v dd {
  margin: 4px 0 0 26px;
}
</style>
