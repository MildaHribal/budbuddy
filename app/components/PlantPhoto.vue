<script setup lang="ts">
import type { StageId } from '~/types/grow'
import type { PhotoSize } from '~/composables/useUi'

const props = withDefaults(defineProps<{
  photoId: string | null | undefined
  stage: StageId
  alt?: string
  size?: PhotoSize
}>(), { alt: undefined, size: 'thumb' })

const root = ref<HTMLElement | null>(null)
// releases the decoded image while the tile is far off-screen
const near = ref(typeof IntersectionObserver === 'undefined')
let io: IntersectionObserver | null = null
onMounted(() => {
  const el = root.value
  if (!el || near.value) return
  const scroller = el.parentElement?.closest<HTMLElement>('.app-scroll, .sheet-body') ?? null
  io = new IntersectionObserver(([e]) => {
    if (e) near.value = e.isIntersecting
  }, { root: scroller, rootMargin: '800px 0px' })
  io.observe(el)
})
onBeforeUnmount(() => io?.disconnect())

const { url, missing } = usePhoto(toRef(props, 'photoId'), { size: props.size, active: near })
const info = computed(() => stageInfo(props.stage))
</script>

<template>
  <span
    ref="root"
    class="plant-photo-root"
  >
    <img
      v-if="url"
      :src="url"
      :alt="alt ?? ''"
      class="plant-photo"
      decoding="async"
    >
    <span
      v-else-if="photoId && !missing"
      class="plant-photo pending"
    />
    <span
      v-else
      class="plant-photo placeholder"
      :style="{ '--stage': info.color }"
    >
      <GrowIcon
        :name="info.glyph"
        class="placeholder-glyph"
      />
    </span>
  </span>
</template>

<style scoped>
.plant-photo-root {
  display: block;
  width: 100%;
  height: 100%;
}

.plant-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pending {
  background: var(--surface-2);
}

.placeholder {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
  background: color-mix(in srgb, var(--stage) 12%, var(--surface-2));
}

.placeholder-glyph {
  position: relative;
  font-size: 56cqmin;
  color: color-mix(in srgb, var(--stage) 70%, var(--text-3));
}
</style>
