<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const pear = 'M0-5c2.4 0 3.4 4 3.2 7c-.2 3-1.6 4-3.2 4s-3-1-3.2-4c-.2-3 .8-7 3.2-7z'
const colony = [
  [113, 118, -10], [124, 124, 12], [114, 132, -5], [125, 140, 8], [113, 148, -14], [124, 156, 6], [116, 164, 0], [126, 170, 14],
  [140, 92, 70], [152, 88, 80], [164, 84, 75]
]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.pestAphids')">
    <path
      d="M120 198c-2-50 2-110-2-186"
      :stroke="ART.leaf"
      stroke-width="5"
      stroke-opacity="0.5"
    />
    <path
      d="M120 198c-2-50 2-110-2-186"
      :stroke="ART.leaf"
      stroke-width="1.2"
    />
    <path
      d="M120 96q30-10 58-12"
      :stroke="ART.leaf"
      stroke-width="2.2"
    />
    <g transform="translate(178 84) rotate(78) translate(0 -1)">
      <GuideArtFanLeaf
        :size="58"
        :petiole-length="0"
        :droop="0.3"
      />
    </g>
    <g transform="translate(119 40) rotate(-60) translate(0 -18)">
      <GuideArtFanLeaf
        :size="40"
        :petiole-length="0.45"
      />
    </g>
    <g
      v-for="(a, i) in colony"
      :key="i"
      :transform="`translate(${a[0]} ${a[1]}) rotate(${a[2]}) scale(${0.9 + (i % 3) * 0.2})`"
    >
      <path
        d="M-1.4 4l-1 2M1.4 4l1 2"
        :stroke="ART.lime"
        stroke-width="0.8"
      />
      <path
        :d="pear"
        :fill="ART.lime"
        fill-opacity="0.6"
        :stroke="ART.lime"
        stroke-width="1"
      />
    </g>
    <circle
      cx="250"
      cy="136"
      r="44"
      fill="#0b0d10"
      :stroke="ART.muted"
      stroke-opacity="0.8"
    />
    <path
      d="M206 140L130 140"
      :stroke="ART.muted"
      stroke-opacity="0.5"
      stroke-dasharray="2 3"
      stroke-width="1"
    />
    <g transform="translate(250 140) scale(4)">
      <path
        d="M-1.6-4.6q-2-2-2.6-5M1.6-4.6q2-2 2.6-5M-3-1l-4-2M-3 1l-4 1M-3 3l-3 4M3-1l4-2M3 1l4 1M3 3l3 4"
        :stroke="ART.lime"
        stroke-width="0.3"
      />
      <path
        d="M-1.6 4l-1 2.4M1.6 4l1 2.4"
        :stroke="ART.lime"
        stroke-width="0.7"
      />
      <path
        :d="pear"
        :fill="ART.lime"
        fill-opacity="0.25"
        :stroke="ART.lime"
        stroke-width="0.35"
      />
      <circle
        cx="-1.2"
        cy="-4"
        r="0.5"
        :fill="ART.burn"
      />
      <circle
        cx="1.2"
        cy="-4"
        r="0.5"
        :fill="ART.burn"
      />
    </g>
    <GuideArtCallout
      :x="104"
      :y="178"
      :tx="116"
      :ty="160"
      :text="t('guideArt.pests.cluster')"
      anchor="end"
    />
  </GuideArtFrame>
</template>
