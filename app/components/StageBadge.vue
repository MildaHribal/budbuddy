<script setup lang="ts">
import type { StageId } from '~/types/grow'

const props = defineProps<{ stage: StageId }>()
const info = computed(() => stageInfo(props.stage))
</script>

<template>
  <span
    class="badge stage-badge"
    :style="{ color: info.color, background: `color-mix(in srgb, ${info.color} 16%, rgba(10,10,10,.75))` }"
  >
    <UIcon
      :name="info.icon"
      class="size-3.5"
    />
    {{ info.label }}
  </span>
</template>

<style scoped>
.stage-badge {
  border-color: color-mix(in srgb, currentColor 45%, transparent);
  backdrop-filter: blur(6px);
}
</style>
