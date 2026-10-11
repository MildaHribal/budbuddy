<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const uid = useId()
const pot = 'M100 78h120l-12 108h-96z'
const leaves = [
  { y: -16, s: 30, a: -70 }, { y: -16, s: 30, a: 70 },
  { y: -36, s: 23, a: -62 }, { y: -36, s: 23, a: 62 },
  { y: -54, s: 16, a: 0 }
]
const pebbles = [[116, 176], [128, 172], [141, 177], [154, 172], [167, 177], [180, 172], [193, 176], [122, 182], [148, 182], [174, 182], [198, 182]]
const crumbs = [[122, 100], [150, 112], [184, 98], [134, 132], [196, 126], [118, 150], [168, 146], [200, 152], [142, 158]]
const roots = 'M160 88v40M160 98c-8 8-18 14-30 18M160 104c10 6 20 14 28 26M160 118c-6 10-10 20-12 34M160 126c8 10 12 20 12 30M130 116c-6 4-8 10-8 16'
</script>

<template>
  <GuideArtFrame :label="t('guideArt.mediumSoil')">
    <defs>
      <clipPath :id="`${uid}-pot`">
        <path :d="pot" />
      </clipPath>
    </defs>
    <g :transform="`translate(160 80)`">
      <path
        d="M0 0V-58"
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
    <g :clip-path="`url(#${uid}-pot)`">
      <rect
        x="90"
        y="78"
        width="140"
        height="12"
        :fill="ART.rust"
        fill-opacity="0.3"
      />
      <path
        d="M104 84l8-3M120 86l7-4M138 83l9 2M170 85l8-3M190 82l9 3M205 86l6-3"
        :stroke="ART.rust"
        stroke-width="1.3"
      />
      <rect
        x="90"
        y="90"
        width="140"
        height="76"
        :fill="ART.soil"
        fill-opacity="0.32"
      />
      <circle
        v-for="(c, i) in crumbs"
        :key="i"
        :cx="c[0]"
        :cy="c[1]"
        :r="1.6 + (i % 3) * 0.6"
        :fill="ART.soil"
        fill-opacity="0.9"
      />
      <path
        :d="roots"
        :stroke="ART.pale"
        stroke-opacity="0.55"
        stroke-width="1.1"
      />
      <path
        d="M178 136c4-4 8 4 12 0s8 4 11 1"
        :stroke="ART.magenta"
        stroke-width="2.2"
        stroke-opacity="0.85"
      />
      <path
        d="M106 128l6 4 4-2M190 108l5 3 5-1"
        :stroke="ART.text"
        stroke-opacity="0.35"
        stroke-width="0.9"
      />
      <rect
        x="90"
        y="166"
        width="140"
        height="22"
        :fill="ART.muted"
        fill-opacity="0.12"
      />
      <circle
        v-for="(p, i) in pebbles"
        :key="`p${i}`"
        :cx="p[0]"
        :cy="p[1]"
        r="4.6"
        :fill="ART.muted"
        fill-opacity="0.35"
        :stroke="ART.muted"
        stroke-width="1.2"
      />
    </g>
    <path
      d="M110 166h100"
      :stroke="ART.muted"
      stroke-opacity="0.4"
      stroke-dasharray="2 3"
      stroke-width="1"
    />
    <path
      :d="pot"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <path
      d="M126 186v4M160 186v4M194 186v4"
      :stroke="ART.water"
      stroke-width="1.6"
    />
    <GuideArtCallout
      :x="232"
      :y="120"
      :tx="196"
      :ty="122"
      :text="t('guideArt.soil.mix')"
    />
    <GuideArtCallout
      :x="232"
      :y="176"
      :tx="200"
      :ty="176"
      :text="t('guideArt.soil.drain')"
    />
    <GuideArtCallout
      :x="88"
      :y="136"
      :tx="180"
      :ty="136"
      :text="t('guideArt.soil.life')"
      anchor="end"
    />
  </GuideArtFrame>
</template>
