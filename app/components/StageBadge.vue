<script setup lang="ts">
import type { StageId } from '~/types/grow'

const props = defineProps<{ stage: StageId }>()
const info = computed(() => stageInfo(props.stage))
</script>

<template>
  <span
    class="badge stage-badge"
    :style="{ color: info.color }"
  >
    <GrowIcon
      :name="info.glyph"
      class="text-[14px]"
    />
    {{ info.label }}
  </span>
</template>

<style scoped>
.stage-badge {
  background: color-mix(in srgb, currentColor 16%, var(--surface));
}
</style>
