<script setup lang="ts">
import { ART, leaflet } from '~/utils/guideArt'

const { t } = useI18n()
const sugar = [
  { x: 120, y: 150, a: -58 },
  { x: 160, y: 140, a: 54 },
  { x: 124, y: 112, a: -40 }
].map(s => ({ ...s, d: leaflet({ length: 30, width: 8, angle: s.a, teeth: 7 }).outline }))
const fuzz = [[148, 134], [158, 128], [166, 136], [152, 116], [162, 112], [144, 152], [160, 150]]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.budRot')">
    <path
      v-for="s in sugar"
      :key="s.a"
      :d="s.d"
      :transform="`translate(${s.x} ${s.y})`"
      :fill="ART.leaf"
      fill-opacity="0.2"
      :stroke="ART.leaf"
      stroke-width="1.3"
    />
    <g transform="translate(140 194)">
      <GuideArtBud
        :size="160"
        :rot="0.6"
        :pistil="ART.pale"
      />
    </g>
    <path
      d="M136 120q-6-6-4-12M144 112q2-8 8-10M150 124q6-4 12-2M140 132q-8 0-10-6"
      :stroke="ART.burn"
      stroke-width="1.4"
    />
    <g
      v-for="(f, i) in fuzz"
      :key="i"
      :transform="`translate(${f[0]} ${f[1]})`"
    >
      <circle
        r="6"
        :fill="ART.muted"
        fill-opacity="0.35"
      />
      <path
        d="M0-6v-3M4-4l2-2M-4-4l-2-2M6 0h3M-6 0h-3M4 4l2 2"
        :stroke="ART.text"
        stroke-opacity="0.55"
        stroke-width="0.7"
      />
    </g>
    <GuideArtCallout
      :x="190"
      :y="84"
      :tx="146"
      :ty="110"
      :text="t('guideArt.rot.brown')"
    />
    <GuideArtCallout
      :x="190"
      :y="150"
      :tx="164"
      :ty="134"
      :text="t('guideArt.rot.mould')"
    />
  </GuideArtFrame>
</template>
