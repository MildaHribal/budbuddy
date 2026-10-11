<script setup lang="ts">
import { repLevel } from '~/utils/feed/feed'

const props = defineProps<{ rep: number }>()
const { t } = useI18n()
const level = computed(() => repLevel(props.rep ?? 0))
</script>

<template>
  <span
    class="badge rep"
    :style="{ color: level.color }"
    :title="t('feed.reputation', { n: rep })"
  >
    <GrowIcon :name="level.glyph" />
    {{ t(`feed.levels.${level.key}`) }}
  </span>
</template>

<style scoped>
.rep {
  padding: 1px 7px 1px 5px;
  gap: 3px;
  font-size: 10.5px;
}

.rep .grow-icon {
  font-size: 12px;
}
</style>
