<script setup lang="ts">
import type { JournalEntry } from '~/types/grow'

const props = defineProps<{
  entry: JournalEntry
  /** show the date instead of only the time */
  showDate?: boolean
  /** plant name, for cross-plant lists */
  plantName?: string
}>()

const emit = defineEmits<{
  edit: [entry: JournalEntry]
  delete: [entry: JournalEntry]
  photo: [photoId: string]
}>()

const { t } = useI18n()
const info = computed(() => entryInfo(props.entry.type))
const stage = computed(() => (props.entry.type === 'stage' && props.entry.stage ? stageInfo(props.entry.stage) : null))
const glyph = computed(() => stage.value?.glyph ?? info.value.glyph)
const color = computed(() => stage.value?.color ?? info.value.color)
const title = computed(() => (stage.value ? t('plant.entry.movedTo', { stage: stage.value.label }) : info.value.verb))

const detail = computed(() => {
  const e = props.entry
  const parts: string[] = []
  if (e.type === 'train' && e.method) parts.push(trainingLabel(e.method))
  if (e.type === 'pest' && e.product) parts.push(e.product)
  if (e.nutrients) parts.push(e.nutrients)
  return parts.join(' · ')
})

const metrics = computed(() => {
  const e = props.entry
  const m: { label: string, shown: boolean, value: string, unit?: string }[] = []
  if (e.amountMl != null) {
    const [v, u] = formatVolume(e.amountMl).split(' ')
    m.push({ label: t('plant.entry.volume'), shown: false, value: v ?? '', unit: u })
  }
  if (e.ph != null) m.push({ label: 'pH', shown: true, value: String(e.ph) })
  if (e.ec != null) m.push({ label: 'EC', shown: true, value: String(e.ec) })
  if (e.heightCm != null) m.push({ label: t('plant.entry.height'), shown: false, value: String(e.heightCm), unit: 'cm' })
  if (e.tempC != null) m.push({ label: t('plant.entry.temp'), shown: false, value: String(e.tempC), unit: '°C' })
  if (e.humidity != null) m.push({ label: t('plant.entry.humidity'), shown: false, value: String(e.humidity), unit: t('plant.entry.rh') })
  return m
})

// Stage and harvest entries mirror the plant's own data – they are changed from the plant, not here.
const editable = computed(() => props.entry.type !== 'stage' && props.entry.type !== 'harvest')
</script>

<template>
  <article
    class="entry"
    :style="{ '--c': color }"
  >
    <span
      class="node"
      aria-hidden="true"
    >
      <GrowIcon :name="glyph" />
    </span>
    <div class="entry-main">
      <div class="entry-top">
        <h3 class="entry-title">
          {{ title }}
        </h3>
        <span class="entry-when num">
          {{ showDate ? formatRelativeDay(entry.date) : formatTime(entry.createdAt) }}
        </span>
        <div
          v-if="editable"
          class="entry-actions"
        >
          <button
            type="button"
            class="mini-btn"
            :aria-label="t('plant.entry.edit')"
            @click="emit('edit', entry)"
          >
            <UIcon
              name="i-tabler-pencil"
              class="size-4"
            />
          </button>
          <button
            type="button"
            class="mini-btn danger"
            :aria-label="t('plant.entry.delete')"
            @click="emit('delete', entry)"
          >
            <UIcon
              name="i-tabler-trash"
              class="size-4"
            />
          </button>
        </div>
      </div>
      <p
        v-if="plantName"
        class="entry-plant"
      >
        {{ plantName }}
      </p>
      <p
        v-if="detail"
        class="entry-detail"
      >
        {{ detail }}
      </p>
      <dl
        v-if="metrics.length"
        class="metrics"
      >
        <div
          v-for="m in metrics"
          :key="m.label"
          class="metric"
        >
          <dt :class="{ 'sr-only': !m.shown }">
            {{ m.label }}
          </dt>
          <dd class="num">
            {{ m.value }}<span v-if="m.unit"> {{ m.unit }}</span>
          </dd>
        </div>
      </dl>
      <p
        v-if="entry.note"
        class="entry-note"
      >
        {{ entry.note }}
      </p>
      <div
        v-if="entry.photoIds.length"
        class="entry-photos"
      >
        <button
          v-for="id in entry.photoIds"
          :key="id"
          type="button"
          class="entry-thumb"
          :aria-label="t('plant.entry.openPhoto')"
          @click="emit('photo', id)"
        >
          <PlantPhoto
            :photo-id="id"
            stage="vegetative"
          />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.entry {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 6px 0 14px;
}

/* the hairline the nodes hang on; trimmed at the ends of the list */
.entry::before {
  content: '';
  position: absolute;
  left: 17.5px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--line-strong);
}

.entry:first-child::before {
  top: 22px;
}

.entry:last-child::before {
  bottom: auto;
  height: 22px;
}

.entry:only-child::before {
  display: none;
}

.node {
  position: relative;
  z-index: 1;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 18%, #101317), #0b0d10 75%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 32%, transparent);
  color: var(--c);
  font-size: 19px;
}

.node .grow-icon {
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 45%, transparent));
}

.entry-main {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.entry-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.entry-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-when {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.entry-actions {
  display: flex;
  margin: -6px -10px -6px -4px;
}

.mini-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-3);
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.mini-btn:active {
  color: var(--text);
  transform: scale(0.9);
}

.mini-btn.danger:active {
  color: var(--danger);
}

.entry-plant {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--leaf);
}

.entry-detail {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--c);
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 0;
}

.metric {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 8px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line);
}

.metric dt {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
}

.metric dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.metric dd span {
  font-size: 11px;
  color: var(--text-3);
}

.entry-note {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.entry-photos {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.entry-thumb {
  width: 76px;
  height: 76px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-2);
  box-shadow: inset 0 0 0 1px var(--line);
  transition: transform var(--dur-fast) var(--ease-out);
}

.entry-thumb:active {
  transform: scale(0.95);
}
</style>
