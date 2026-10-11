<script setup lang="ts">
import { ART, fanLeaf, scatter } from '~/utils/guideArt'

const { t } = useI18n()
const SIZE = 128
const spots = fanLeaf({ size: SIZE }).flatMap((s, i) => scatter(s, i > 3 ? 2 : 1, i + 7))
  .map((p, i) => ({ x: p[0], y: p[1], r: 4.6 + (i % 3) * 1.6 }))
</script>

<template>
  <GuideArtFrame
    view-box="0 0 320 210"
    :label="t('guideArt.powderyMildew')"
  >
    <g transform="translate(116 160)">
      <GuideArtFanLeaf
        :size="SIZE"
        :petiole-length="0.35"
      />
      <g
        v-for="(s, i) in spots"
        :key="i"
      >
        <circle
          :cx="s.x"
          :cy="s.y"
          :r="s.r"
          :fill="ART.pale"
          fill-opacity="0.75"
        />
        <circle
          :cx="s.x"
          :cy="s.y"
          :r="s.r + 2"
          :stroke="ART.pale"
          stroke-opacity="0.55"
          stroke-width="1.4"
          stroke-dasharray="0.8 2"
        />
      </g>
    </g>
    <GuideArtCallout
      :x="210"
      :y="96"
      :tx="116 + spots[1]!.x"
      :ty="160 + spots[1]!.y"
      :text="t('guideArt.mildew.spots')"
    />
  </GuideArtFrame>
</template>
