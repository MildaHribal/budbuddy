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
}>(), { anchor: 'start', color: '#e9f3e4' })
</script>

<template>
  <g>
    <path
      :d="`M${x} ${y}L${tx} ${ty}`"
      stroke="#8d9a8a"
      stroke-width="1"
      stroke-opacity="0.8"
    />
    <circle
      :cx="tx"
      :cy="ty"
      r="1.8"
      fill="#8d9a8a"
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
