<script setup lang="ts">
import type { GrowSpace } from '~/types/grow'
import { formatDuration, lightState } from '~/utils/light'

// Home light cards, one per lit grow space.
const { t } = useI18n()
const { notify } = useNotify()
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
  return {
    ...s,
    headline,
    percent: span ? Math.round((1 - s.minutesLeft / span) * 100) : 100,
    summary: t('organize.home.summary', { name: space.name, on: hours, off: 24 - hours, from: s.onLabel, to: s.offLabel })
  }
}

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
    <button
      v-for="s in lit"
      :key="s.id"
      type="button"
      class="card light"
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
        <span class="light-sub">{{ view(s).summary }}</span>
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
      <UIcon
        name="i-tabler-chevron-right"
        class="size-5 light-go"
      />
    </button>
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.light {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 12px 14px 14px;
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

.light-sub {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.light-go {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
