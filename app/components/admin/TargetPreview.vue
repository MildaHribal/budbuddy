<script setup lang="ts">
import type { ModAuthor, ModPreview, ModTarget } from '~/composables/useModeration'

defineProps<{ type: ModTarget, preview: ModPreview | null, author?: ModAuthor | null }>()
const { t } = useI18n()
const when = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
</script>

<template>
  <div class="preview">
    <img
      v-if="preview?.image"
      :src="preview.image"
      alt=""
      loading="lazy"
      class="thumb"
    >
    <div class="body">
      <div class="meta">
        <span class="badge type">{{ t(`admin.types.${type}`) }}</span>
        <span
          v-if="preview?.isHidden"
          class="badge hidden-badge"
        >{{ t('admin.reports.hidden') }}</span>
        <span
          v-if="author?.is_banned"
          class="badge banned-badge"
        >{{ t('admin.reports.banned') }}</span>
      </div>
      <template v-if="preview">
        <p
          v-if="preview.title"
          class="title"
        >
          {{ preview.title }}
        </p>
        <p
          v-if="preview.text"
          class="text"
        >
          {{ preview.text }}
        </p>
        <p class="by">
          <template v-if="author">
            {{ t('admin.reports.by', { name: author.display_name || author.username }) }} · @{{ author.username }}
          </template>
          <template v-if="preview.createdAt">
            · {{ when(preview.createdAt) }}
          </template>
        </p>
      </template>
      <p
        v-else
        class="text missing"
      >
        {{ t('admin.reports.missing') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--well);
}

.thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.type { color: var(--text-2); }
.hidden-badge { color: var(--amber); }
.banned-badge { color: var(--red); }

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
  white-space: pre-line;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.missing {
  font-style: italic;
  color: var(--text-3);
}

.by {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  overflow-wrap: anywhere;
}
</style>
