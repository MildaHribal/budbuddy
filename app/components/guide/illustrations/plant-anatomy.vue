<script setup lang="ts">
import { ART, leaflet } from '~/utils/guideArt'

const { t } = useI18n()
const nodes = [
  { y: 162, s: 40 },
  { y: 128, s: 34 },
  { y: 98, s: 27 }
]
const sugar = [
  { x: 151, y: 52, a: -62 },
  { x: 169, y: 40, a: 58 },
  { x: 152, y: 34, a: -40 }
].map(s => ({ ...s, d: leaflet({ length: 15, width: 4.2, angle: s.a, teeth: 5 }).outline }))
const roots = 'M160 184c-2 14-8 24-20 36M160 184c3 12 10 20 22 30M160 184v44M149 204c-8 2-16 8-20 16M171 202c8 2 14 8 18 16M160 210c-6 4-10 10-11 18M140 220c-6 1-10 4-12 8'
</script>

<template>
  <GuideArtFrame
    :label="t('guideArt.plantAnatomy')"
    view-box="0 0 320 240"
  >
    <rect
      x="96"
      y="184"
      width="128"
      height="50"
      rx="6"
      :fill="ART.soil"
      fill-opacity="0.16"
    />
    <path
      d="M96 184h128"
      :stroke="ART.soil"
    />
    <path
      :d="roots"
      :stroke="ART.text"
      stroke-opacity="0.75"
      stroke-width="1.3"
    />
    <path
      d="M160 184V64"
      :stroke="ART.leaf"
      stroke-width="2.6"
    />
    <g
      v-for="n in nodes"
      :key="n.y"
    >
      <g
        v-for="side in [-1, 1]"
        :key="side"
        :transform="`translate(160 ${n.y}) rotate(${side * 70}) translate(0 ${-n.s * 0.45})`"
      >
        <GuideArtFanLeaf
          :size="n.s"
          :petiole-length="0.45"
        />
      </g>
      <circle
        cx="160"
        cy="0"
        :transform="`translate(0 ${n.y})`"
        r="3"
        :fill="ART.leaf"
      />
    </g>
    <path
      v-for="s in sugar"
      :key="s.a"
      :d="s.d"
      :transform="`translate(${s.x} ${s.y})`"
      :fill="ART.leaf"
      fill-opacity="0.22"
      :stroke="ART.leaf"
      stroke-width="1.3"
    />
    <g transform="translate(160 72)">
      <GuideArtBud
        :size="62"
        :pistil="ART.rust"
      />
    </g>
    <GuideArtCallout
      :x="96"
      :y="22"
      :tx="155"
      :ty="22"
      :text="t('guideArt.anatomy.cola')"
      anchor="end"
    />
    <GuideArtCallout
      :x="96"
      :y="48"
      :tx="142"
      :ty="45"
      :text="t('guideArt.anatomy.sugar')"
      anchor="end"
    />
    <GuideArtCallout
      :x="96"
      :y="128"
      :tx="120"
      :ty="146"
      :text="t('guideArt.anatomy.fan')"
      anchor="end"
    />
    <GuideArtCallout
      :x="226"
      :y="30"
      :tx="168"
      :ty="30"
      :text="t('guideArt.anatomy.pistils')"
    />
    <GuideArtCallout
      :x="226"
      :y="104"
      :tx="163"
      :ty="128"
      :text="t('guideArt.anatomy.node')"
    />
    <GuideArtCallout
      :x="226"
      :y="170"
      :tx="162"
      :ty="172"
      :text="t('guideArt.anatomy.stem')"
    />
    <GuideArtCallout
      :x="226"
      :y="214"
      :tx="184"
      :ty="212"
      :text="t('guideArt.anatomy.roots')"
    />
  </GuideArtFrame>
</template>
