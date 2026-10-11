<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
</script>

<template>
  <GuideArtFrame
    view-box="0 0 320 206"
    :label="t('guideArt.seedlingStretch')"
  >
    <path
      d="M160 14v168"
      :stroke="ART.muted"
      stroke-opacity="0.25"
      stroke-dasharray="2 4"
    />
    <path
      d="M56 70L36 166h108L124 70z"
      :fill="ART.lamp"
      fill-opacity="0.09"
    />
    <rect
      x="50"
      y="62"
      width="80"
      height="7"
      rx="3.5"
      :fill="ART.lamp"
      fill-opacity="0.35"
      :stroke="ART.lamp"
      class="ga-glow"
      :style="{ color: ART.lamp }"
    />
    <path
      d="M90 20v42"
      :stroke="ART.muted"
      stroke-width="1"
    />
    <path
      d="M200 22L190 166h88L268 22z"
      :fill="ART.lamp"
      fill-opacity="0.03"
    />
    <rect
      x="196"
      y="14"
      width="76"
      height="7"
      rx="3.5"
      :fill="ART.lamp"
      fill-opacity="0.12"
      :stroke="ART.lamp"
      stroke-opacity="0.5"
    />
    <path
      d="M90 166v-26"
      :stroke="ART.leaf"
      stroke-width="2.6"
    />
    <ellipse
      cx="80"
      cy="146"
      rx="9"
      ry="3.6"
      transform="rotate(-18 80 146)"
      :fill="ART.leaf"
      fill-opacity="0.3"
      :stroke="ART.leaf"
      stroke-width="1.4"
    />
    <ellipse
      cx="100"
      cy="146"
      rx="9"
      ry="3.6"
      transform="rotate(18 100 146)"
      :fill="ART.leaf"
      fill-opacity="0.3"
      :stroke="ART.leaf"
      stroke-width="1.4"
    />
    <g transform="translate(90 140) rotate(-55) translate(0 -7)">
      <GuideArtFanLeaf
        :size="18"
        :count="5"
        :petiole-length="0.4"
      />
    </g>
    <g transform="translate(90 140) rotate(55) translate(0 -7)">
      <GuideArtFanLeaf
        :size="18"
        :count="5"
        :petiole-length="0.4"
      />
    </g>
    <path
      d="M234 166c3-30-5-58 2-90"
      :stroke="ART.leaf"
      stroke-width="1.3"
      stroke-opacity="0.9"
    />
    <ellipse
      cx="229"
      cy="78"
      rx="6"
      ry="2.4"
      transform="rotate(-30 229 78)"
      :fill="ART.lime"
      fill-opacity="0.25"
      :stroke="ART.lime"
      stroke-width="1.2"
    />
    <ellipse
      cx="243"
      cy="78"
      rx="6"
      ry="2.4"
      transform="rotate(30 243 78)"
      :fill="ART.lime"
      fill-opacity="0.25"
      :stroke="ART.lime"
      stroke-width="1.2"
    />
    <path
      d="M236 76l-1-6M232 70l3 0 4 0"
      :stroke="ART.lime"
      stroke-width="1.2"
    />
    <path
      d="M246 46v28M243 49l3-3 3 3M243 71l3 3 3-3"
      :stroke="ART.muted"
      stroke-width="1.1"
      stroke-opacity="0.7"
    />
    <path
      d="M76 166h28l-3 18H79zM220 166h28l-3 18h-22z"
      :stroke="ART.soil"
      :fill="ART.soil"
      fill-opacity="0.22"
    />
    <text
      x="90"
      y="198"
      text-anchor="middle"
      :fill="ART.leaf"
    >
      {{ t('guideArt.seedling.ok') }}
    </text>
    <text
      x="234"
      y="198"
      text-anchor="middle"
      :fill="ART.rust"
    >
      {{ t('guideArt.seedling.stretched') }}
    </text>
  </GuideArtFrame>
</template>
