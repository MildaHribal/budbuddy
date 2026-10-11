<script setup lang="ts">
import type { StageId } from '~/types/grow'
import { stages } from '~/utils/stages'

type PlantType = 'auto' | 'photo'
const props = withDefaults(defineProps<{ type?: PlantType }>(), { type: 'photo' })
const { t } = useI18n()
const uid = useId()

const type = ref<PlantType>(props.type)
watch(() => props.type, (v) => {
  type.value = v
})

const DAYS: Record<PlantType, Record<StageId, number>> = {
  auto: { germination: 5, seedling: 14, vegetative: 21, flowering: 52, drying: 10, curing: 28 },
  photo: { germination: 7, seedling: 17, vegetative: 42, flowering: 63, drying: 10, curing: 28 }
}

const list = computed(() => stages().map(s => ({
  id: s.id,
  label: s.label,
  color: s.color,
  glyph: s.glyph,
  days: DAYS[type.value][s.id]
})))
const total = computed(() => list.value.reduce((n, s) => n + s.days, 0))
const pctBefore = (id: StageId) => {
  let n = 0
  for (const s of list.value) {
    if (s.id === id) break
    n += s.days
  }
  return (n / total.value) * 100
}
const flipAt = computed(() => pctBefore('flowering'))
const harvestAt = computed(() => pctBefore('drying'))

const open = ref<StageId | null>('vegetative')
const key = (id: StageId, f: 'dur' | 'light' | 'focus') => t(`guideWidgets.timeline.${type.value === 'auto' ? 'a' : 'p'}.${id}.${f}`)

const shown = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => {
  shown.value = true
})))
</script>

<template>
  <div class="gw timeline">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.timeline.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.timeline.sub') }}
      </p>
    </div>

    <div
      class="segmented"
      role="group"
      :aria-label="t('guideWidgets.timeline.type')"
    >
      <button
        type="button"
        :aria-pressed="type === 'auto'"
        @click="type = 'auto'"
      >
        {{ t('guideWidgets.timeline.auto') }}
      </button>
      <button
        type="button"
        :aria-pressed="type === 'photo'"
        @click="type = 'photo'"
      >
        {{ t('guideWidgets.timeline.photo') }}
      </button>
    </div>

    <div
      class="total"
      aria-live="polite"
    >
      <span class="gw-label">{{ t('guideWidgets.timeline.total') }}</span>
      <p class="total-v">
        {{ t(`guideWidgets.timeline.totals.${type}`) }}
      </p>
      <span class="gw-hint">{{ t('guideWidgets.timeline.after') }}</span>
    </div>

    <div
      class="bar-wrap"
      aria-hidden="true"
    >
      <div
        class="rail top"
        :style="{ transform: `translateX(${flipAt}%)` }"
      >
        <span
          class="flip"
          :class="{ on: type === 'photo' }"
        >{{ t('guideWidgets.timeline.flip') }}</span>
      </div>
      <div
        class="bar"
        :class="{ shown }"
      >
        <span
          v-for="(s, i) in list"
          :key="s.id"
          class="seg"
          :class="{ on: open === s.id }"
          :style="{ 'flexGrow': s.days, '--c': s.color, '--i': i }"
        />
      </div>
      <div
        class="rail bottom"
        :style="{ transform: `translateX(${harvestAt}%)` }"
      >
        <GrowIcon
          name="harvest"
          class="harvest"
        />
      </div>
    </div>

    <ul class="stages">
      <li
        v-for="s in list"
        :key="s.id"
        :style="{ '--c': s.color }"
      >
        <button
          :id="`${uid}-${s.id}`"
          type="button"
          class="row"
          :aria-expanded="open === s.id"
          :aria-controls="`${uid}-${s.id}-d`"
          @click="open = open === s.id ? null : s.id"
        >
          <GrowIcon
            :name="s.glyph"
            class="glyph"
          />
          <span class="name">{{ s.label }}</span>
          <span class="dur num">{{ key(s.id, 'dur') }}</span>
          <UIcon
            name="i-tabler-chevron-down"
            class="chev"
            aria-hidden="true"
          />
        </button>
        <Transition name="gw-fade">
          <dl
            v-if="open === s.id"
            :id="`${uid}-${s.id}-d`"
            class="details"
            role="region"
            :aria-labelledby="`${uid}-${s.id}`"
          >
            <div>
              <dt>{{ t('guideWidgets.timeline.light') }}</dt>
              <dd>{{ key(s.id, 'light') }}</dd>
            </div>
            <div>
              <dt>{{ t('guideWidgets.timeline.focus') }}</dt>
              <dd>{{ key(s.id, 'focus') }}</dd>
            </div>
          </dl>
        </Transition>
      </li>
    </ul>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.total {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-v {
  margin: 0;
  font-size: 26px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: var(--text);
}

.bar-wrap {
  position: relative;
  overflow-x: clip;
  padding: 22px 0 26px;
}

.bar {
  display: flex;
  gap: 2px;
  height: 14px;
}

.seg {
  flex-basis: 0;
  border-radius: 4px;
  background: var(--c);
  opacity: 0.55;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--dur-slow) var(--ease-out) calc(var(--i) * 80ms), opacity var(--dur) ease, box-shadow var(--dur) ease;
}

.bar.shown .seg {
  transform: scaleX(1);
}

.seg.on {
  opacity: 1;
  box-shadow: 0 0 12px color-mix(in srgb, var(--c) 55%, transparent);
}

.rail {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  transition: transform var(--dur-slow) var(--ease-out);
}

.rail.top {
  top: 0;
}

.rail.bottom {
  bottom: 0;
}

.flip {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--lamp);
  opacity: 0;
  transition: opacity var(--dur) ease;
}

.flip.on {
  opacity: 1;
}

.flip::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 16px;
  width: 1px;
  height: 20px;
  background: var(--lamp);
}

.harvest {
  position: absolute;
  left: 0;
  bottom: 0;
  transform: translateX(-50%);
  font-size: 18px;
  color: #f0b95e;
}

.stages {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.stages li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.glyph {
  flex-shrink: 0;
  font-size: 22px;
  color: var(--c);
}

.name {
  flex: 1 0 auto;
  font-size: 14px;
  font-weight: 600;
}

.dur {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--text-2);
  text-align: right;
}

.chev {
  flex-shrink: 0;
  color: var(--text-3);
  transition: transform var(--dur) var(--ease-out);
}

.row[aria-expanded="true"] .chev {
  transform: rotate(180deg);
}

.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 12px 34px;
}

.details dt {
  font-size: 12px;
  font-weight: 600;
  color: var(--c);
}

.details dd {
  margin: 2px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}
</style>
