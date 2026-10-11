<script setup lang="ts">
import type { L10n } from '~/guide'

const props = defineProps<{ tone: 'tip' | 'warning' | 'info', title?: L10n, md: L10n }>()
const { tr } = useGuide()
const icon = computed(() => ({ tip: 'i-tabler-bulb', warning: 'i-tabler-alert-triangle', info: 'i-tabler-info-circle' })[props.tone])
</script>

<template>
  <aside
    class="callout"
    :class="tone"
  >
    <UIcon
      :name="icon"
      class="callout-icon"
      aria-hidden="true"
    />
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
  --tone: var(--leaf);
  --tone-soft: var(--accent-soft);
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, var(--tone-soft), transparent 140%), var(--surface);
  border: 1px solid color-mix(in srgb, var(--tone) 22%, transparent);
  box-shadow: inset 0 1px 0 var(--highlight);
}

.callout.warning {
  --tone: var(--lamp);
  --tone-soft: var(--lamp-soft);
}

.callout.info {
  --tone: var(--info);
  --tone-soft: color-mix(in srgb, var(--info) 12%, transparent);
}

.callout-icon {
  flex: none;
  margin-top: 2px;
  font-size: 20px;
  color: var(--tone);
}

.callout-body {
  min-width: 0;
  flex: 1;
}

.callout-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--tone);
}

.callout :deep(.guide-md) {
  font-size: 14px;
  line-height: 1.55;
}
</style>
