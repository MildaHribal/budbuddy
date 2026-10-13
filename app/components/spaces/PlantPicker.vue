<script setup lang="ts">
import type { Plant } from '~/types/grow'

// Checklist of plants with photo, strain and stage.
const picked = defineModel<string[]>({ required: true })
const props = defineProps<{
  plants: readonly Plant[]
  label: string
  /** short note per plant, e.g. the tent it is in now */
  note?: (p: Plant) => string | null
}>()

const { t } = useI18n()
const all = computed(() => props.plants.length > 0 && props.plants.every(p => picked.value.includes(p.id)))

function toggle(id: string) {
  picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id]
}
function toggleAll() {
  const ids = new Set(props.plants.map(p => p.id))
  picked.value = all.value ? picked.value.filter(id => !ids.has(id)) : [...new Set([...picked.value, ...ids])]
}
</script>

<template>
  <div class="picker">
    <div class="picker-head">
      <span class="field-label">{{ label }}</span>
      <button
        v-if="plants.length > 1"
        type="button"
        class="link"
        @click="toggleAll"
      >
        {{ all ? t('organize.bulk.none') : t('organize.bulk.all') }}
      </button>
    </div>
    <ul
      class="picker-list card"
      :aria-label="label"
    >
      <li
        v-for="p in plants"
        :key="p.id"
      >
        <button
          type="button"
          role="checkbox"
          class="picker-row"
          :aria-checked="picked.includes(p.id)"
          @click="toggle(p.id)"
        >
          <span class="picker-photo">
            <PlantPhoto
              :photo-id="p.photoId"
              :stage="p.stage"
            />
          </span>
          <span class="picker-text">
            <strong>{{ p.name }}</strong>
            <span>{{ [p.strain || t('plants.list.unknownStrain'), stageInfo(p.stage).label, note?.(p)].filter(Boolean).join(' · ') }}</span>
          </span>
          <span
            class="picker-box"
            aria-hidden="true"
          >
            <svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.3 2.3 4.7-5" /></svg>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 0 12px;
}

.picker-list li + li {
  border-top: 1px solid var(--line);
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
}

.picker-photo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.picker-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker-text strong {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-text span {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-box {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 2px solid var(--line-strong);
  border-radius: 6px;
  transition: background var(--dur) ease, border-color var(--dur) ease;
}

.picker-box svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--on-accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
}

.picker-row[aria-checked="true"] .picker-box {
  background: var(--green);
  border-color: var(--green);
}

.picker-row[aria-checked="true"] .picker-box svg {
  opacity: 1;
}
</style>
