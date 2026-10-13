<script setup lang="ts">
// Label with a thin leader line from the text to the point it names.
withDefaults(defineProps<{
  x: number
  y: number
  tx: number
  ty: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
  color?: string
}>(), { anchor: 'start', color: 'var(--text)' })
</script>

<template>
  <g>
    <path
      :d="`M${x} ${y}L${tx} ${ty}`"
      stroke="var(--text-3)"
      stroke-width="1"
      stroke-opacity="0.8"
    />
    <circle
      :cx="tx"
      :cy="ty"
      r="1.8"
      fill="var(--text-3)"
    />
    <text
      :x="anchor === 'end' ? x - 3 : anchor === 'start' ? x + 3 : x"
      :y="y + 3.5"
      :text-anchor="anchor"
      :fill="color"
    >
      {{ text }}
    </text>
  </g>
</template>
