<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const leaves = [
  { y: -14, s: 24, a: -68 }, { y: -14, s: 24, a: 68 },
  { y: -30, s: 19, a: -64 }, { y: -30, s: 19, a: 64 },
  { y: -44, s: 14, a: 0 }
]
const pots = [70, 128]
</script>

<template>
  <GuideArtFrame
    :label="t('guideArt.setupIndoor')"
    view-box="0 0 320 200"
  >
    <rect
      x="20"
      y="12"
      width="160"
      height="178"
      rx="4"
      :stroke="ART.muted"
      stroke-opacity="0.7"
      :fill="ART.muted"
      fill-opacity="0.04"
    />
    <path
      d="M28 20v162M172 20v162"
      :stroke="ART.muted"
      stroke-opacity="0.2"
      stroke-dasharray="1 5"
    />
    <path
      d="M48 41L28 182h144L132 41z"
      :fill="ART.lamp"
      fill-opacity="0.06"
    />
    <path
      d="M52 12v22M128 12v22"
      :stroke="ART.muted"
      stroke-width="1"
    />
    <rect
      x="44"
      y="34"
      width="92"
      height="7"
      rx="3.5"
      :fill="ART.lamp"
      fill-opacity="0.3"
      :stroke="ART.lamp"
      class="ga-glow"
      :style="{ color: ART.lamp }"
    />
    <rect
      x="146"
      y="18"
      width="22"
      height="32"
      rx="5"
      :fill="ART.muted"
      fill-opacity="0.15"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <path
      d="M146 26h22M146 42h22"
      :stroke="ART.text"
      stroke-opacity="0.4"
      stroke-width="1"
    />
    <path
      d="M168 26h28"
      :stroke="ART.text"
      stroke-opacity="0.8"
      stroke-width="5"
    />
    <path
      d="M168 26h28"
      stroke="#0b0d10"
      stroke-width="2"
    />
    <circle
      cx="206"
      cy="26"
      r="10"
      :stroke="ART.text"
    />
    <path
      d="M206 26c-1-5 2-7 5-7M206 26c5 0 6 4 4 7M206 26c-3 4-7 3-8 0"
      :stroke="ART.text"
      stroke-width="1.3"
    />
    <circle
      cx="166"
      cy="104"
      r="9"
      :stroke="ART.text"
      stroke-opacity="0.85"
    />
    <path
      d="M166 104l-4-5M166 104l6 1M166 104l-2 6M175 100h5M175 108h5"
      :stroke="ART.text"
      stroke-opacity="0.85"
      stroke-width="1.2"
    />
    <path
      d="M152 98q-8 3-16 0M152 106q-10 3-20 0M152 114q-8 3-16 0"
      :stroke="ART.water"
      stroke-opacity="0.6"
      stroke-width="1.2"
      stroke-dasharray="3 3"
    />
    <g
      v-for="x in pots"
      :key="x"
    >
      <g :transform="`translate(${x} 160)`">
        <path
          d="M0 0V-46"
          :stroke="ART.leaf"
          stroke-width="2"
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
      <path
        :d="`M${x - 18} 160h36l-4 28h-28z`"
        :stroke="ART.soil"
        :fill="ART.soil"
        fill-opacity="0.22"
      />
    </g>
    <GuideArtCallout
      :x="222"
      :y="26"
      :tx="217"
      :ty="26"
      :text="t('guideArt.indoor.fan')"
    />
    <GuideArtCallout
      :x="222"
      :y="56"
      :tx="166"
      :ty="44"
      :text="t('guideArt.indoor.filter')"
    />
    <GuideArtCallout
      :x="222"
      :y="80"
      :tx="134"
      :ty="40"
      :text="t('guideArt.indoor.led')"
    />
    <GuideArtCallout
      :x="222"
      :y="122"
      :tx="172"
      :ty="110"
      :text="t('guideArt.indoor.clip')"
    />
    <GuideArtCallout
      :x="222"
      :y="170"
      :tx="144"
      :ty="172"
      :text="t('guideArt.indoor.pots')"
    />
  </GuideArtFrame>
</template>
