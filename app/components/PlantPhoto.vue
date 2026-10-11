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
        :stroke-width="1.2"
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
  background:
    radial-gradient(90% 80% at 50% 0%, color-mix(in srgb, var(--stage) 26%, #10251a) 0%, #0d1d12 55%, #070d09 100%);
}

.placeholder-glyph {
  position: relative;
  font-size: 56cqmin;
  color: var(--stage);
}

/* static glow instead of a per-tile drop-shadow filter */
.placeholder::before {
  content: '';
  position: absolute;
  width: 60cqmin;
  height: 60cqmin;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--stage) 30%, transparent) 0%, transparent 70%);
}
</style>
