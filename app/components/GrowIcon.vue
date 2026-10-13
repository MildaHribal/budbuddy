<script setup lang="ts">
import { GLYPHS, isGlyphName, type Glyph } from '~/utils/glyphs'

// Non-glyph names (i-tabler-*) fall back to UIcon.
const props = withDefaults(defineProps<{
  name: string
  strokeWidth?: number
}>(), {
  strokeWidth: 1.8
})

const glyph = computed<Glyph | null>(() => (isGlyphName(props.name) ? GLYPHS[props.name] : null))
</script>

<template>
  <svg
    v-if="glyph"
    class="grow-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <g class="tint">
      <path
        v-for="(p, i) in glyph.fill"
        :key="`f${i}`"
        :d="p.d"
        :transform="p.t"
      />
    </g>
    <path
      v-for="(p, i) in glyph.line"
      :key="`l${i}`"
      class="stroke"
      :d="p.d"
      :transform="p.t"
    />
  </svg>
  <UIcon
    v-else
    :name="name"
    class="grow-icon"
  />
</template>

<style scoped>
.grow-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: -0.125em;
  overflow: visible;
}

.tint path {
  fill: currentColor;
  fill-opacity: 0.2;
  stroke: none;
}
</style>
