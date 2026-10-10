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

const info = computed(() => entryInfo(props.entry.type))
const title = computed(() => {
  if (props.entry.type === 'stage' && props.entry.stage) return `Moved to ${stageInfo(props.entry.stage).label}`
  return info.value.verb
})
const summary = computed(() => entrySummary(props.entry))
// Stage and harvest entries mirror the plant's own data – they are changed from the plant, not here.
const editable = computed(() => props.entry.type !== 'stage' && props.entry.type !== 'harvest')
</script>

<template>
  <article
    class="entry"
    :style="{ '--c': info.color }"
  >
    <span class="entry-icon">
      <UIcon
        :name="info.icon"
        class="size-[18px]"
      />
    </span>
    <div class="entry-main">
      <div class="entry-top">
        <h3 class="entry-title">
          {{ title }}
        </h3>
        <span class="entry-when">
          {{ showDate ? formatRelativeDay(entry.date) : formatTime(entry.createdAt) }}
        </span>
      </div>
      <p
        v-if="plantName"
        class="entry-plant"
      >
        {{ plantName }}
      </p>
      <p
        v-if="summary"
        class="entry-summary"
      >
        {{ summary }}
      </p>
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
          aria-label="Open photo"
          @click="emit('photo', id)"
        >
          <PlantPhoto
            :photo-id="id"
            stage="vegetative"
          />
        </button>
      </div>
    </div>
    <div
      v-if="editable"
      class="entry-actions"
    >
      <button
        type="button"
        class="mini-btn"
        aria-label="Edit entry"
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
        aria-label="Delete entry"
        @click="emit('delete', entry)"
      >
        <UIcon
          name="i-tabler-trash"
          class="size-4"
        />
      </button>
    </div>
  </article>
</template>

<style scoped>
.entry {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--c);
}

.entry-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent);
}

.entry-main {
  flex: 1;
  min-width: 0;
}

.entry-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.entry-title {
  flex: 1;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.entry-when {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.entry-plant {
  margin: 1px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

.entry-summary {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--c);
}

.entry-note {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.entry-photos {
  display: flex;
  gap: 6px;
  margin-top: 8px;
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
}

.entry-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  border: 0;
  background: transparent;
  color: var(--text-3);
}

.mini-btn:active {
  background: var(--surface-2);
}

.mini-btn.danger:active {
  color: var(--danger);
}
</style>
