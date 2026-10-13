<script setup lang="ts">
import type { Problem } from '~/utils/problems'
import { CATEGORY_META, SEVERITY_TONE } from '~/utils/problems/atlas'
import { photosFor, problemPhotoUrl } from '~/utils/problems/photos'

const props = defineProps<{
  problem: Problem
  /** row inside another card: no own border, hairline between rows */
  flat?: boolean
}>()

const { t } = useI18n()
const meta = computed(() => CATEGORY_META[props.problem.category])
const thumb = computed(() => {
  const p = photosFor(props.problem.id)[0]
  return p ? problemPhotoUrl(p.file) ?? null : null
})
const failed = ref(false)
</script>

<template>
  <NuxtLink
    :to="`/problems/${problem.id}`"
    class="pcard"
    :class="flat ? 'flat' : 'card'"
  >
    <span
      class="thumb"
      :style="{ color: meta.tone }"
    >
      <img
        v-if="thumb && !failed"
        :src="thumb"
        alt=""
        loading="lazy"
        decoding="async"
        @error="failed = true"
      >
      <GrowIcon
        v-else
        :name="meta.glyph"
      />
    </span>
    <span class="body">
      <span class="name">{{ problem.name }}</span>
      <span class="summary">{{ problem.summary }}</span>
      <span class="meta">
        <span class="cat">{{ t(`problems.categories.${problem.category}`) }}</span>
        <span
          class="badge"
          :style="{ color: SEVERITY_TONE[problem.severity] }"
        >{{ t(`problems.severity.${problem.severity}`) }}</span>
      </span>
    </span>
  </NuxtLink>
</template>

<style scoped>
.pcard {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.pcard:active {
  transform: scale(0.985);
}

.pcard.flat {
  padding: 12px 0;
}

.pcard.flat + .pcard.flat {
  border-top: 1px solid var(--line);
}

.thumb {
  flex: none;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, currentColor 12%, var(--surface-2));
  font-size: 28px;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.cat {
  font-size: 12px;
  color: var(--text-3);
}
</style>
