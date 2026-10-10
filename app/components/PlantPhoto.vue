<script setup lang="ts">
import type { StageId } from '~/types/grow'
import germination from '~/assets/stages/germination.webp'
import seedling from '~/assets/stages/seedling.webp'
import vegetative from '~/assets/stages/vegetative.webp'
import flowering from '~/assets/stages/flowering.webp'

const props = defineProps<{
  photoId: string | null | undefined
  stage: StageId
  alt?: string
}>()

const illustrations: Partial<Record<StageId, string>> = { germination, seedling, vegetative, flowering, drying: flowering, curing: flowering }

const url = usePhotoUrl(toRef(props, 'photoId'))
const info = computed(() => stageInfo(props.stage))
</script>

<template>
  <img
    v-if="url"
    :src="url"
    :alt="alt ?? ''"
    class="plant-photo"
    loading="lazy"
  >
  <div
    v-else
    class="plant-photo placeholder"
    :style="{ '--stage': info.color }"
  >
    <img
      v-if="illustrations[stage]"
      :src="illustrations[stage]"
      alt=""
      class="illustration"
    >
    <UIcon
      v-else
      :name="info.icon"
      class="size-1/3"
      :style="{ color: info.color }"
    />
  </div>
</template>

<style scoped>
.plant-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--stage) 18%, transparent) 0%, transparent 70%), var(--surface-2);
}

.illustration {
  width: 72%;
  height: 72%;
  object-fit: contain;
}
</style>
