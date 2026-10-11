<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const leaves = [
  { y: -16, s: 30, a: -70 }, { y: -16, s: 30, a: 70 },
  { y: -36, s: 24, a: -64 }, { y: -36, s: 24, a: 64 },
  { y: -54, s: 18, a: 0 }
]
const plants = [{ x: 110, k: 0.85 }, { x: 160, k: 1 }, { x: 210, k: 0.9 }]
const rays = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4
  return `M${160 + Math.cos(a) * 15} ${72 + Math.sin(a) * 15}L${160 + Math.cos(a) * 21} ${72 + Math.sin(a) * 21}`
}).join('')
</script>

<template>
  <GuideArtFrame :label="t('guideArt.setupOutdoor')">
    <text
      x="160"
      y="20"
      text-anchor="middle"
      :fill="ART.lamp"
    >
      {{ t('guideArt.outdoor.sun') }}
    </text>
    <path
      d="M30 160Q160-16 290 160"
      :stroke="ART.lamp"
      stroke-opacity="0.55"
      stroke-dasharray="3 5"
    />
    <circle
      cx="34"
      cy="150"
      r="4"
      :fill="ART.lamp"
      fill-opacity="0.4"
    />
    <circle
      cx="286"
      cy="150"
      r="4"
      :fill="ART.lamp"
      fill-opacity="0.4"
    />
    <circle
      cx="160"
      cy="72"
      r="10"
      :fill="ART.lamp"
      fill-opacity="0.35"
      :stroke="ART.lamp"
      class="ga-glow"
      :style="{ color: ART.lamp }"
    />
    <path
      :d="rays"
      :stroke="ART.lamp"
      stroke-width="1.4"
    />
    <path
      d="M14 168h292"
      :stroke="ART.soil"
    />
    <path
      d="M40 168l-2-6M46 168l1-7M250 168l-2-6M256 168l2-7M76 168l-1-5M270 168l1-5"
      :stroke="ART.leafDeep"
      stroke-width="1.2"
    />
    <g
      v-for="p in plants"
      :key="p.x"
      :transform="`translate(${p.x} 168) scale(${p.k})`"
    >
      <path
        d="M0 0V-56"
        :stroke="ART.leaf"
        stroke-width="2.4"
      />
      <g
        v-for="l in leaves"
        :key="`${l.y}${l.a}`"
        :transform="`translate(0 ${l.y}) rotate(${l.a}) translate(0 ${-l.s * 0.45})`"
      >
        <GuideArtFanLeaf
          :size="l.s"
          :petiole-length="0.45"
        />
      </g>
    </g>
    <text
      x="34"
      y="188"
      text-anchor="middle"
      class="ga-muted"
    >
      {{ t('guideArt.outdoor.east') }}
    </text>
    <text
      x="160"
      y="188"
      text-anchor="middle"
      class="ga-text"
    >
      {{ t('guideArt.outdoor.south') }}
    </text>
    <text
      x="286"
      y="188"
      text-anchor="middle"
      class="ga-muted"
    >
      {{ t('guideArt.outdoor.west') }}
    </text>
  </GuideArtFrame>
</template>
