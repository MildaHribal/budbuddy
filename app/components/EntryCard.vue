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
const grow = useGrow()
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
  if (e.ph != null) m.push({ label: 'pH', shown: true, value: formatNumber(e.ph, 2) })
  if (e.ec != null) m.push({ label: 'EC', shown: true, value: formatNumber(e.ec, 2) })
  if (e.heightCm != null) m.push({ label: t('plant.entry.height'), shown: false, value: formatNumber(e.heightCm), unit: 'cm' })
  if (e.tempC != null) m.push({ label: t('plant.entry.temp'), shown: false, value: formatNumber(e.tempC), unit: '°C' })
  if (e.humidity != null) m.push({ label: t('plant.entry.humidity'), shown: false, value: formatNumber(e.humidity), unit: t('plant.entry.rh') })
  if (e.type === 'harvest') {
    // weights come from the plant, so later corrections show up here too
    const h = grow.getPlant(e.plantId)?.harvest
    if (h?.wetWeight != null) m.push({ label: t('entry.harvest.wet'), shown: true, value: formatNumber(h.wetWeight), unit: 'g' })
    if (h?.dryWeight != null) m.push({ label: t('entry.harvest.dry'), shown: true, value: formatNumber(h.dryWeight), unit: 'g' })
  }
  return m
})

// older harvest entries had the English weight baked into the note
const note = computed(() => (props.entry.type === 'harvest' ? props.entry.note.replace(/^Wet weight \d+(\.\d+)? g\.?\s*/, '') : props.entry.note))

// Stage and harvest entries mirror the plant's own data – they are changed from the plant, not here.
const editable = computed(() => props.entry.type !== 'stage' && props.entry.type !== 'harvest')
</script>

<template>
  <article
    class="entry"
    :style="{ '--c': color }"
  >
    <span
      class="tile"
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
        v-if="note"
        class="entry-note"
      >
        {{ note }}
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
  display: flex;
  gap: 12px;
  min-height: 56px;
  padding: 10px 8px 12px 14px;
}

.entry + .entry {
  border-top: 1px solid var(--line);
}

.tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
  font-size: 20px;
}

.entry-main {
  flex: 1;
  min-width: 0;
}

.entry-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}

.entry-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 500;
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
  margin: -4px -6px -4px -4px;
}

.mini-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-3);
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.mini-btn:active {
  color: var(--text);
  transform: scale(0.9);
}

.mini-btn.danger:active {
  color: var(--red);
}

.entry-plant {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--green);
}

.entry-detail {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
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
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface-2);
}

.metric dt {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
}

.metric dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.metric dd span {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
}

.entry-note {
  margin: 6px 8px 0 0;
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
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
  transition: transform var(--dur-fast) var(--ease-out);
}

.entry-thumb:active {
  transform: scale(0.95);
}
</style>
