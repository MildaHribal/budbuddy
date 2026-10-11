<script setup lang="ts">
import { ART } from '~/utils/guideArt'

// Cola drawn tip-up at the origin's base; height ≈ size.
const props = withDefaults(defineProps<{
  size?: number
  color?: string
  pistil?: string
  /** 0–1 share of rows drawn brown (rot) */
  rot?: number
}>(), { size: 60, color: ART.leaf, pistil: '#f3e3c6', rot: 0 })

const rows = computed(() => {
  const n = 7
  const out: { x: number, y: number, rx: number, ry: number, brown: boolean, k: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const w = props.size * 0.22 * (1 - t * 0.75)
    const per = i > n - 3 ? 1 : 3
    for (let j = 0; j < per; j++) {
      const x = per === 1 ? 0 : (j - 1) * w * 0.8
      out.push({
        x,
        y: -props.size * 0.1 - t * props.size * 0.78,
        rx: w * 0.62,
        ry: props.size * 0.075,
        brown: props.rot > 0 && i >= 1 && i <= 1 + Math.round(props.rot * 4) && j !== 0,
        k: i * 3 + j
      })
    }
  }
  return out
})
</script>

<template>
  <g>
    <path
      :d="`M0 0V${-size * 0.2}`"
      :stroke="color"
      stroke-width="2"
    />
    <g
      v-for="c in rows"
      :key="c.k"
    >
      <ellipse
        :cx="c.x"
        :cy="c.y"
        :rx="c.rx"
        :ry="c.ry"
        :fill="c.brown ? ART.burn : color"
        :fill-opacity="c.brown ? 0.75 : 0.22"
        :stroke="c.brown ? ART.burn : color"
        stroke-width="1.4"
      />
      <path
        v-if="!c.brown && c.k % 2 === 0"
        :d="`M${c.x} ${c.y - c.ry * 0.4}q${(c.k % 4) - 2} ${-c.ry} ${c.x >= 0 ? 3 : -3} ${-c.ry * 1.6}`"
        :stroke="pistil"
        stroke-width="1.1"
      />
    </g>
  </g>
</template>
