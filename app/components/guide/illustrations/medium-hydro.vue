<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const uid = useId()
const bucket = 'M100 70h100l-8 120h-84z'
const leaves = [
  { y: -14, s: 26, a: -70 }, { y: -14, s: 26, a: 70 },
  { y: -30, s: 20, a: -62 }, { y: -30, s: 20, a: 62 },
  { y: -44, s: 14, a: 0 }
]
const pebbles = [[138, 54], [148, 52], [158, 55], [168, 52], [143, 46], [153, 45], [163, 46]]
const roots = 'M146 90c-4 24 2 40-6 70M152 90c2 30-6 48 0 78M158 90c4 26 0 44 8 66M164 90c6 22 10 34 6 58M150 120c-8 8-12 16-12 26M160 130c8 6 10 14 12 24M144 140c-4 6-4 12-2 18'
const bubbles = [[142, 168, 2.2], [156, 158, 2.6], [148, 140, 2], [162, 128, 2.4], [140, 118, 1.8], [168, 150, 1.8], [154, 106, 2]]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.mediumHydro')">
    <defs>
      <clipPath :id="`${uid}-b`">
        <path :d="bucket" />
      </clipPath>
    </defs>
    <g transform="translate(152 44)">
      <path
        d="M0 0V-38"
        :stroke="ART.leaf"
        stroke-width="2.2"
      />
      <g
        v-for="l in leaves"
        :key="`${l.y}${l.a}`"
        :transform="`translate(0 ${l.y + 6}) rotate(${l.a}) translate(0 ${-l.s * 0.45})`"
      >
        <GuideArtFanLeaf
          :size="l.s"
          :petiole-length="0.45"
        />
      </g>
    </g>
    <g :clip-path="`url(#${uid}-b)`">
      <rect
        x="96"
        y="98"
        width="110"
        height="94"
        :fill="ART.water"
        fill-opacity="0.16"
      />
      <path
        d="M96 98q7-3 14 0t14 0 14 0 14 0 14 0 14 0 14 0 14 0"
        :stroke="ART.water"
        stroke-opacity="0.8"
        stroke-width="1.3"
      />
      <path
        :d="roots"
        :stroke="ART.pale"
        stroke-opacity="0.75"
        stroke-width="1.1"
      />
      <circle
        v-for="(b, i) in bubbles"
        :key="i"
        :cx="b[0]"
        :cy="b[1]"
        :r="b[2]"
        :stroke="ART.text"
        stroke-opacity="0.7"
        stroke-width="1"
      />
    </g>
    <path
      :d="bucket"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <rect
      x="94"
      y="62"
      width="112"
      height="8"
      rx="2"
      :fill="ART.muted"
      fill-opacity="0.2"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <path
      d="M134 56h36l-5 36h-26z"
      fill="var(--well)"
      :stroke="ART.text"
      stroke-opacity="0.9"
    />
    <path
      d="M136 68h32M138 80h28M144 56l-1 36M152 56v36M160 56l1 36"
      :stroke="ART.text"
      stroke-opacity="0.35"
      stroke-width="1"
    />
    <circle
      v-for="(p, i) in pebbles"
      :key="`p${i}`"
      :cx="p[0]"
      :cy="p[1]"
      r="4.6"
      :fill="ART.rust"
      fill-opacity="0.35"
      :stroke="ART.rust"
      stroke-width="1.2"
    />
    <path
      d="M62 172q20 0 22-50t26-60q4 2 4 18v94q0 6 20 6"
      :stroke="ART.muted"
      stroke-width="1.6"
    />
    <ellipse
      cx="150"
      cy="181"
      rx="16"
      ry="4"
      :fill="ART.muted"
      fill-opacity="0.5"
      :stroke="ART.text"
      stroke-opacity="0.7"
      stroke-width="1.2"
    />
    <rect
      x="22"
      y="160"
      width="40"
      height="26"
      rx="5"
      :fill="ART.muted"
      fill-opacity="0.15"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <circle
      cx="34"
      cy="173"
      r="4"
      :stroke="ART.text"
      stroke-opacity="0.6"
      stroke-width="1.2"
    />
    <path
      d="M44 169h12M44 177h12"
      :stroke="ART.text"
      stroke-opacity="0.4"
      stroke-width="1"
    />
    <GuideArtCallout
      :x="212"
      :y="40"
      :tx="170"
      :ty="60"
      :text="t('guideArt.hydro.net')"
    />
    <GuideArtCallout
      :x="212"
      :y="130"
      :tx="194"
      :ty="130"
      :text="t('guideArt.hydro.water')"
    />
    <GuideArtCallout
      :x="212"
      :y="176"
      :tx="166"
      :ty="180"
      :text="t('guideArt.hydro.stone')"
    />
    <text
      x="42"
      y="152"
      text-anchor="middle"
      class="ga-text"
    >
      {{ t('guideArt.hydro.pump') }}
    </text>
  </GuideArtFrame>
</template>
