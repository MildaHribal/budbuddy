<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const branches = [{ x: 70, y: 33 }, { x: 160, y: 35 }, { x: 250, y: 34 }]
</script>

<template>
  <GuideArtFrame
    view-box="0 0 320 208"
    :label="t('guideArt.dryingHang')"
  >
    <path
      d="M14 30Q160 40 306 30"
      :stroke="ART.muted"
      stroke-width="1.4"
    />
    <circle
      cx="14"
      cy="30"
      r="2.4"
      :fill="ART.muted"
    />
    <circle
      cx="306"
      cy="30"
      r="2.4"
      :fill="ART.muted"
    />
    <g
      v-for="(b, i) in branches"
      :key="b.x"
      :transform="`translate(${b.x} ${b.y})`"
    >
      <path
        d="M0 0v-4a4 4 0 1 1 4 4"
        :stroke="ART.text"
        stroke-opacity="0.75"
        stroke-width="1.3"
      />
      <path
        d="M0 0v6"
        :stroke="ART.text"
        stroke-opacity="0.75"
        stroke-width="1.3"
      />
      <path
        d="M0 6v84M0 26l-22 34M0 40l22 36"
        :stroke="ART.leafDeep"
        stroke-width="2"
      />
      <g transform="translate(0 86) rotate(180)">
        <GuideArtBud
          :size="i === 1 ? 58 : 50"
          :color="ART.leafDeep"
          :pistil="ART.rust"
        />
      </g>
      <g transform="translate(-22 58) rotate(152)">
        <GuideArtBud
          :size="30"
          :color="ART.leafDeep"
          :pistil="ART.rust"
        />
      </g>
      <g transform="translate(22 74) rotate(208)">
        <GuideArtBud
          :size="30"
          :color="ART.leafDeep"
          :pistil="ART.rust"
        />
      </g>
    </g>
    <path
      d="M20 160q10-4 20 0t20 0M20 152q10-4 20 0t20 0"
      :stroke="ART.water"
      stroke-opacity="0.5"
      stroke-width="1.2"
      stroke-dasharray="3 3"
    />
    <path
      d="M292 158a8 8 0 1 0 8 10a6 6 0 1 1-8-10z"
      :fill="ART.lamp"
      fill-opacity="0.2"
      :stroke="ART.lamp"
      stroke-opacity="0.6"
      stroke-width="1.2"
    />
    <text
      x="20"
      y="200"
      class="ga-muted"
    >
      {{ t('guideArt.dry.dark') }}
    </text>
    <text
      x="304"
      y="200"
      text-anchor="end"
      :fill="ART.lamp"
    >
      {{ t('guideArt.dry.climate') }}
    </text>
  </GuideArtFrame>
</template>
