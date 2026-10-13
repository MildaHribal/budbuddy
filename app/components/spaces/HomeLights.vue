<script setup lang="ts">
import type { GrowSpace } from '~/types/grow'
import { vpd, vpdZone } from '~/utils/calc'
import { addDays } from '~/utils/date'
import { formatDuration, lightState } from '~/utils/light'

// Home tent cards, one per lit grow space: light countdown, the plants inside and the last logged climate.
const { t } = useI18n()
const { notify } = useNotify()
const grow = useGrow()
const today = useToday()
const { spaces, updateSpace } = useSpaces()
const lit = computed(() => spaces.value.filter(s => s.lightHours !== null))

const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  clock = setInterval(() => (now.value = new Date()), 30_000)
})
onBeforeUnmount(() => clearInterval(clock))

function view(space: GrowSpace) {
  const hours = space.lightHours ?? 0
  const s = lightState(space.lightsOn, hours, now.value)
  const span = (s.isOn ? hours : 24 - hours) * 60
  const headline = hours >= 24
    ? `${t('ring.lightsOnLead')} ${t('ring.allDay')}`
    : hours <= 0
      ? `${t('ring.lightsLead')} ${t('ring.off')}`
      : `${s.isOn ? t('ring.offIn') : t('ring.onIn')} ${formatDuration(s.minutesLeft)}`
  const vars = { name: space.name, on: hours, off: 24 - hours, from: s.onLabel, to: s.offLabel }
  return {
    ...s,
    headline,
    percent: span ? Math.round((1 - s.minutesLeft / span) * 100) : 100,
    summary: t('organize.home.summary', vars),
    schedule: t('organize.home.schedule', vars)
  }
}

const contents = computed(() => {
  const from = addDays(today.value, -14)
  return Object.fromEntries(lit.value.map((s) => {
    const plants = grow.state.plants.filter(p => !p.archived && p.spaceId === s.id)
    const ids = new Set(plants.map(p => p.id))
    // newest temperature / humidity logged for a plant in this tent during the last two weeks
    let last: { date: string, createdAt: string, tempC: number | null, humidity: number | null } | null = null
    for (const e of grow.state.entries) {
      if (!ids.has(e.plantId) || e.date < from || (e.tempC == null && e.humidity == null)) continue
      if (!last || e.date > last.date || (e.date === last.date && e.createdAt > last.createdAt)) last = e
    }
    const v = last?.tempC != null && last.humidity != null ? vpd(last.tempC, last.humidity) : null
    return [s.id, {
      plants,
      climate: last
        ? t('organize.home.climate', { temp: last.tempC != null ? formatNumber(last.tempC, 1) : '–', rh: last.humidity != null ? formatNumber(last.humidity, 0) : '–' })
        : null,
      vpd: v === null ? null : { text: t('organize.home.vpd', { v: formatNumber(v, 1) }), color: vpdZone(v).color }
    }]
  }))
})

const editing = ref<GrowSpace | null>(null)
const sheetOpen = ref(false)
function edit(space: GrowSpace) {
  editing.value = space
  sheetOpen.value = true
}
function save(v: { lightsOn: string, hours: number | null }) {
  if (!editing.value) return
  updateSpace(editing.value.id, { lightsOn: v.lightsOn, lightHours: v.hours })
  notify(t('home.light.saved'))
}
</script>

<template>
  <div class="lights">
    <div
      v-for="s in lit"
      :key="s.id"
      class="card tent"
    >
      <button
        type="button"
        class="light"
        aria-haspopup="dialog"
        :aria-label="`${t('home.editLight')}: ${s.name}. ${view(s).summary}. ${view(s).headline}`"
        @click="edit(s)"
      >
        <span
          class="light-icon"
          :class="{ dark: !view(s).isOn }"
        >
          <GrowIcon name="lamp" />
        </span>
        <span class="light-body">
          <span class="light-top">
            <span class="light-name">{{ s.name }}</span>
            <span class="light-sub num">{{ view(s).schedule }}</span>
          </span>
          <strong class="light-big num">{{ view(s).headline }}</strong>
          <span
            class="progress light-bar"
            :class="{ dark: !view(s).isOn }"
          >
            <span
              class="bar-fill"
              :style="{ width: `${view(s).percent}%` }"
            />
          </span>
        </span>
      </button>
      <NuxtLink
        :to="`/spaces/${s.id}`"
        class="tent-foot"
        :aria-label="t('organize.home.open', { name: s.name })"
      >
        <span
          v-if="contents[s.id]?.plants.length"
          class="thumbs"
          aria-hidden="true"
        >
          <span
            v-for="p in contents[s.id]!.plants.slice(0, 4)"
            :key="p.id"
            class="thumb"
          >
            <PlantPhoto
              :photo-id="p.photoId"
              :stage="p.stage"
            />
          </span>
        </span>
        <span class="foot-text">
          {{ contents[s.id]?.plants.length ? t('organize.home.plants', { n: contents[s.id]!.plants.length }) : t('organize.home.noPlants') }}
        </span>
        <span
          v-if="contents[s.id]?.climate"
          class="climate num"
        >
          {{ contents[s.id]!.climate }}<template v-if="contents[s.id]!.vpd">
            <i
              class="vpd-dot"
              :style="{ background: contents[s.id]!.vpd!.color }"
            />{{ contents[s.id]!.vpd!.text }}
          </template>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-4 foot-go"
        />
      </NuxtLink>
    </div>
    <SpacesLightSheet
      v-if="editing"
      v-model:open="sheetOpen"
      :title="t('organize.space.lightTitle', { name: editing.name })"
      :lights-on="editing.lightsOn"
      :hours="editing.lightHours"
      @save="save"
    />
  </div>
</template>

<style scoped>
.lights {
  display: grid;
  gap: 10px;
}

/* two tents side by side once there is room */
@container home (min-width: 640px) {
  .lights {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.tent {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.light {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 14px;
  border: 0;
  background: none;
  text-align: left;
  color: inherit;
  transition: transform var(--dur-fast) var(--ease-out);
}

.light:active {
  transform: scale(0.985);
}

.light-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--lamp-soft);
  color: var(--amber);
  font-size: 24px;
}

.light-icon.dark {
  background: var(--surface-3);
  color: var(--text-3);
}

.light-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.light-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.light-name {
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.light-sub {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-3);
}

.light-big {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.light-bar {
  display: block;
  height: 4px;
  margin-top: 6px;
}

.bar-fill {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: var(--amber);
  transition: width var(--dur-slow) var(--ease-out);
}

.light-bar.dark .bar-fill {
  background: var(--text-3);
}

.tent-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 12px 8px 14px;
  border-top: 1px solid var(--line);
  color: var(--text-2);
  font-size: 13px;
  text-decoration: none;
}

.thumbs {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.thumb {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.foot-text {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.climate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.vpd-dot {
  width: 6px;
  height: 6px;
  margin-left: 4px;
  border-radius: 50%;
}

.foot-go {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
