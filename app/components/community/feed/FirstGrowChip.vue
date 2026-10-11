<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span
    class="first"
    :title="t('feed.firstGrowHint')"
  >
    <GrowIcon name="seedling" />
    {{ t('feed.firstGrow') }}
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
  color: #c8f08f;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.first .grow-icon {
  font-size: 12px;
}
</style>
