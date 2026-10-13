<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const seeds = [{ x: 104, y: 132, a: -20 }, { x: 136, y: 138, a: 15 }, { x: 170, y: 128, a: -35 }, { x: 204, y: 136, a: 10 }]
const drops: [number, number][] = [[86, 124], [120, 146], [156, 122], [188, 146], [228, 124], [244, 140], [96, 102], [210, 96]]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.germinationPaperTowel')">
    <text
      x="300"
      y="22"
      text-anchor="end"
      class="ga-muted"
    >
      {{ t('guideArt.germ.temp') }}
    </text>
    <ellipse
      cx="160"
      cy="132"
      rx="134"
      ry="50"
      :stroke="ART.text"
      stroke-opacity="0.6"
      :fill="ART.muted"
      fill-opacity="0.06"
    />
    <ellipse
      cx="160"
      cy="132"
      rx="110"
      ry="38"
      :stroke="ART.text"
      stroke-opacity="0.2"
      stroke-width="1"
    />
    <path
      d="M60 156l200-6 12-38-200 6z"
      :fill="ART.pale"
      fill-opacity="0.13"
      :stroke="ART.pale"
      stroke-opacity="0.6"
    />
    <path
      d="M72 118l200-6 10-26-196 10z"
      :fill="ART.pale"
      fill-opacity="0.08"
      :stroke="ART.pale"
      stroke-opacity="0.45"
      stroke-dasharray="3 3"
    />
    <path
      d="M90 140h12M180 142h14M220 128h10"
      :stroke="ART.pale"
      stroke-opacity="0.25"
      stroke-width="1"
    />
    <path
      v-for="(d, i) in drops"
      :key="i"
      :d="`M${d[0]} ${d[1] - 3}q-2.4 3 0 4.6q2.4-1.6 0-4.6`"
      :fill="ART.water"
      :stroke="ART.water"
      stroke-width="0.8"
      fill-opacity="0.8"
    />
    <path
      d="M210 138q14 2 18 16q3 9-5 14"
      :stroke="ART.pale"
      stroke-width="2.2"
      :style="{ color: ART.pale }"
    />
    <g
      v-for="s in seeds"
      :key="s.x"
      :transform="`translate(${s.x} ${s.y}) rotate(${s.a})`"
    >
      <ellipse
        rx="7"
        ry="4.6"
        :fill="ART.soil"
        fill-opacity="0.75"
        :stroke="ART.rust"
        stroke-width="1.3"
      />
      <path
        d="M-6 0h12M-3-2l1 2-1 2M2-3l1 2"
        :stroke="ART.rust"
        stroke-opacity="0.6"
        stroke-width="0.8"
      />
    </g>
    <GuideArtCallout
      :x="300"
      :y="62"
      :tx="262"
      :ty="94"
      anchor="end"
      :text="t('guideArt.germ.towel')"
    />
    <GuideArtCallout
      :x="262"
      :y="172"
      :tx="226"
      :ty="160"
      :text="t('guideArt.germ.root')"
    />
  </GuideArtFrame>
</template>
