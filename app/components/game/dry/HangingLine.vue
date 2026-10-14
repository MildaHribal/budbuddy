<script setup lang="ts">
import { ART } from '~/utils/guideArt'

// Three branches on a line. Colour runs from wet green to the drying-stage tan, buds shrink a little,
// side branches lift as they lose water; grey fuzz shows once mold is visible.
const props = defineProps<{ moisture: number, mold: 'none' | 'musty' | 'mold', label: string }>()

const WET = [0x22, 0xa8, 0x58]
const DRY = [0xd9, 0xa0, 0x6a]

const wet = computed(() => Math.min(1, Math.max(0, (props.moisture - 0.1) / 0.65)))
const color = computed(() => {
  const k = wet.value
  const c = DRY.map((d, i) => Math.round(d + (WET[i]! - d) * k))
  return `rgb(${c.join(' ')})`
})
const sag = computed(() => 4 + wet.value * 6)
const branches = computed(() => [
  { x: 62, size: 42 + wet.value * 6, side: 24 + wet.value * 4 },
  { x: 160, size: 48 + wet.value * 8, side: 26 + wet.value * 4 },
  { x: 258, size: 42 + wet.value * 6, side: 24 + wet.value * 4 }
])
// heavier, wetter branches hang closer to vertical
const spread = computed(() => 180 - (1 - wet.value) * 16)
</script>

<template>
  <GuideArtFrame
    view-box="0 0 320 168"
    :label="label"
  >
    <path
      :d="`M12 16Q160 ${16 + sag * 2} 308 16`"
      :stroke="ART.muted"
      stroke-width="1.4"
    />
    <circle
      cx="12"
      cy="16"
      r="2.4"
      :fill="ART.muted"
    />
    <circle
      cx="308"
      cy="16"
      r="2.4"
      :fill="ART.muted"
    />
    <g
      v-for="(b, i) in branches"
      :key="b.x"
      :transform="`translate(${b.x} ${16 + sag * (i === 1 ? 2 : 1.1)})`"
    >
      <path
        d="M0 0v-4a4 4 0 1 1 4 4M0 0v6"
        :stroke="ART.text"
        stroke-opacity="0.6"
        stroke-width="1.3"
      />
      <path
        d="M0 6v66M0 20l-28 24M0 32l28 24"
        :stroke="color"
        stroke-width="2"
      />
      <g transform="translate(0 72) rotate(180)">
        <GuideArtBud
          :size="b.size"
          :color="color"
          :pistil="ART.rust"
        />
      </g>
      <g :transform="`translate(-28 44) rotate(${spread})`">
        <GuideArtBud
          :size="b.side"
          :color="color"
          :pistil="ART.rust"
        />
      </g>
      <g :transform="`translate(28 56) rotate(${360 - spread})`">
        <GuideArtBud
          :size="b.side"
          :color="color"
          :pistil="ART.rust"
        />
      </g>
      <g
        v-if="mold === 'mold' && i !== 2"
        :fill="ART.text"
        fill-opacity="0.55"
      >
        <circle
          cx="-4"
          cy="96"
          r="3.2"
        />
        <circle
          cx="3"
          cy="102"
          r="2.4"
        />
        <circle
          cx="-1"
          cy="108"
          r="2"
        />
      </g>
    </g>
  </GuideArtFrame>
</template>
