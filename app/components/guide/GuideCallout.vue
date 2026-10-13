<script setup lang="ts">
import type { L10n } from '~/guide'

const props = defineProps<{ tone: 'tip' | 'warning' | 'info', title?: L10n, md: L10n }>()
const { tr } = useGuide()
const icon = computed(() => ({ tip: 'i-tabler-bulb', warning: 'i-tabler-alert-triangle', info: 'i-tabler-info-circle' })[props.tone])
</script>

<template>
  <aside
    class="callout card"
    :class="tone"
  >
    <span
      class="callout-tile"
      aria-hidden="true"
    >
      <UIcon :name="icon" />
    </span>
    <div class="callout-body">
      <p
        v-if="title"
        class="callout-title"
      >
        {{ tr(title) }}
      </p>
      <GuideMarkdown :md="tr(md)" />
    </div>
  </aside>
</template>

<style scoped>
.callout {
  --tone: var(--green);
  display: flex;
  gap: 12px;
  padding: 14px;
}

.callout.warning {
  --tone: var(--amber);
}

.callout.info {
  --tone: var(--blue);
}

.callout-tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--tone) 14%, transparent);
  color: var(--tone);
  font-size: 20px;
}

.callout-body {
  min-width: 0;
  flex: 1;
  padding-top: 6px;
}

.callout-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.callout :deep(.guide-md) {
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-2);
}
</style>
