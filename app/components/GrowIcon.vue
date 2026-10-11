<script setup lang="ts">
import { GLYPHS, isGlyphName, type Glyph } from '~/utils/glyphs'

// Non-glyph names (i-tabler-*) fall back to UIcon.
const props = withDefaults(defineProps<{
  name: string
  draw?: boolean
  glow?: boolean
  strokeWidth?: number
}>(), {
  draw: false,
  glow: false,
  strokeWidth: 1.6
})

const glyph = computed<Glyph | null>(() => (isGlyphName(props.name) ? GLYPHS[props.name] : null))
</script>

<template>
  <svg
    v-if="glyph"
    :key="draw ? name : undefined"
    class="grow-icon"
    :class="{ draw, glow }"
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
      pathLength="1"
      :style="draw ? { '--i': i } : undefined"
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

.glow {
  filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 55%, transparent));
}

.draw .stroke {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: glyph-draw 0.7s var(--ease-out) forwards;
  animation-delay: calc(var(--i, 0) * 90ms);
}

.draw .tint {
  opacity: 0;
  animation: glyph-tint 0.5s var(--ease-out) 0.35s forwards;
}

@keyframes glyph-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes glyph-tint {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .draw .stroke {
    stroke-dashoffset: 0;
    animation: none;
  }

  .draw .tint {
    opacity: 1;
    animation: none;
  }
}
</style>
