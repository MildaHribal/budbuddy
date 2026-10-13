<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()

function plant(h: number) {
  const n = Math.max(2, Math.round(h / 22))
  return Array.from({ length: n }, (_, i) => {
    const y = -((i + 0.6) * h) / (n + 0.4)
    const s = 30 - (i * 14) / n
    return [{ y, s, a: -68 + i * 3 }, { y, s, a: 68 - i * 3 }]
  }).flat()
}
const before = { x: 86, h: 56, leaves: plant(56) }
const after = { x: 214, h: 116, leaves: plant(116) }
</script>

<template>
  <GuideArtFrame
    view-box="0 0 320 208"
    :label="t('guideArt.stretch')"
  >
    <rect
      x="30"
      y="12"
      width="250"
      height="6"
      rx="3"
      :fill="ART.lamp"
      fill-opacity="0.25"
      :stroke="ART.lamp"
      :style="{ color: ART.lamp }"
    />
    <path
      :d="`M40 ${172 - before.h}H276`"
      :stroke="ART.muted"
      stroke-opacity="0.5"
      stroke-dasharray="3 4"
      stroke-width="1"
    />
    <g
      v-for="p in [before, after]"
      :key="p.x"
      :transform="`translate(${p.x} 172)`"
    >
      <path
        :d="`M0 0V${-p.h}`"
        :stroke="ART.leaf"
        stroke-width="2.4"
      />
      <g
        v-for="(l, i) in p.leaves"
        :key="i"
        :transform="`translate(0 ${l.y}) rotate(${l.a}) translate(0 ${-l.s * 0.45})`"
      >
        <GuideArtFanLeaf
          :size="l.s"
          :petiole-length="0.45"
        />
      </g>
      <g :transform="`translate(0 ${-p.h + 4})`">
        <GuideArtBud
          :size="p.h > 80 ? 26 : 12"
          :pistil="ART.pale"
        />
      </g>
      <path
        d="M-14 0h28l-3 18h-22z"
        :stroke="ART.soil"
        :fill="ART.soil"
        fill-opacity="0.22"
      />
    </g>
    <path
      d="M140 100h28M162 94l6 6-6 6"
      :stroke="ART.lamp"
      stroke-opacity="0.8"
    />
    <path
      d="M270 112V62M266 67l4-5 4 5M266 107l4 5 4-5"
      :stroke="ART.leaf"
      stroke-width="1.4"
    />
    <text
      x="270"
      y="50"
      text-anchor="middle"
      :fill="ART.leaf"
    >
      {{ t('guideArt.stretchArt.x') }}
    </text>
    <text
      x="86"
      y="200"
      text-anchor="middle"
      class="ga-text"
    >
      {{ t('guideArt.stretchArt.flip') }}
    </text>
    <text
      x="214"
      y="200"
      text-anchor="middle"
      class="ga-muted"
    >
      {{ t('guideArt.stretchArt.after') }}
    </text>
  </GuideArtFrame>
</template>
