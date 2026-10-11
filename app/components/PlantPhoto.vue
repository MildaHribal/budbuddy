<script setup lang="ts">
import type { StageId } from '~/types/grow'

const props = defineProps<{
  photoId: string | null | undefined
  stage: StageId
  alt?: string
}>()

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
    <GrowIcon
      :name="info.glyph"
      class="placeholder-glyph"
      :stroke-width="1.2"
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
  container-type: size;
  background:
    radial-gradient(90% 80% at 50% 0%, color-mix(in srgb, var(--stage) 26%, #10251a) 0%, #0d1d12 55%, #070d09 100%);
}

.placeholder-glyph {
  font-size: 56cqmin;
  color: var(--stage);
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--stage) 45%, transparent));
}
</style>
