<script setup lang="ts">
/** compact: glyph only, for tight rows like comment headers */
defineProps<{ compact?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <span
    class="first"
    :class="{ compact }"
    :title="t('feed.firstGrowHint')"
    :role="compact ? 'img' : undefined"
    :aria-label="compact ? t('feed.firstGrow') : undefined"
  >
    <GrowIcon name="seedling" />
    <template v-if="!compact">{{ t('feed.firstGrow') }}</template>
  </span>
</template>

<style scoped>
.first {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px 0 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--green);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.first.compact {
  width: 20px;
  padding: 0;
  justify-content: center;
}

.first .grow-icon {
  font-size: 12px;
}
</style>
