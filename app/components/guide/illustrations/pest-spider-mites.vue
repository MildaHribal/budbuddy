<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const legs = 'M-5-4l-9-7M-6 0l-10-2M-6 3l-9 6M-4 6l-6 9M5-4l9-7M6 0l10-2M6 3l9 6M4 6l6 9'
const mites = [[124, 44], [136, 50], [98, 50], [156, 68]]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.pestSpiderMites')">
    <g transform="translate(112 136)">
      <GuideArtFanLeaf
        :size="100"
        pattern="spots"
        :pattern-color="ART.pale"
        :amount="2.2"
        :fill-opacity="0.28"
      />
    </g>
    <g
      :stroke="ART.text"
      stroke-opacity="0.55"
      stroke-width="0.7"
    >
      <path d="M112 36q6 18 39 23M112 36q-6 18-39 23M151 59q-20 6-78 0M151 59l15 39M140 52l20 30M132 48q-14 8-48 7" />
      <path
        d="M94 44l38 12M104 40l20 16M126 42l-36 14"
        stroke-opacity="0.35"
      />
    </g>
    <g
      v-for="(m, i) in mites"
      :key="i"
      :transform="`translate(${m[0]} ${m[1]}) scale(0.32)`"
    >
      <path
        :d="legs"
        :stroke="ART.pest"
        stroke-width="2.4"
      />
      <ellipse
        rx="6"
        ry="8"
        :fill="ART.pest"
        fill-opacity="0.9"
        :stroke="ART.pest"
      />
    </g>
    <circle
      cx="262"
      cy="62"
      r="40"
      fill="#0b0d10"
      :stroke="ART.muted"
      stroke-opacity="0.8"
    />
    <path
      d="M228 82L128 46"
      :stroke="ART.muted"
      stroke-opacity="0.5"
      stroke-dasharray="2 3"
      stroke-width="1"
    />
    <g transform="translate(262 64) scale(2)">
      <path
        :d="legs"
        :stroke="ART.pest"
        stroke-width="1.2"
      />
      <ellipse
        rx="6"
        ry="8"
        :fill="ART.pest"
        fill-opacity="0.28"
        :stroke="ART.pest"
        stroke-width="1.1"
      />
      <circle
        cx="0"
        cy="-8"
        r="2.6"
        :fill="ART.pest"
        fill-opacity="0.4"
        :stroke="ART.pest"
        stroke-width="0.9"
      />
      <circle
        cx="-2.6"
        cy="1"
        r="1.8"
        :fill="ART.burn"
      />
      <circle
        cx="2.6"
        cy="1"
        r="1.8"
        :fill="ART.burn"
      />
    </g>
    <GuideArtCallout
      :x="218"
      :y="128"
      :tx="160"
      :ty="80"
      :text="t('guideArt.pests.web')"
    />
    <GuideArtCallout
      :x="218"
      :y="156"
      :tx="142"
      :ty="112"
      :text="t('guideArt.pests.stipple')"
    />
  </GuideArtFrame>
</template>
