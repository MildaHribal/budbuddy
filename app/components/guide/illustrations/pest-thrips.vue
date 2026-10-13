<script setup lang="ts">
import { ART, leaflet, scatter } from '~/utils/guideArt'

const { t } = useI18n()
const uid = useId()
const leaf = leaflet({ length: 190, width: 64, angle: 74, teeth: 18 })
const len = Math.hypot(...leaf.tip)
const dir = [leaf.tip[0] / len, leaf.tip[1] / len]
const streaks = scatter(leaf, 16, 4).map(p => `M${p[0].toFixed(1)} ${p[1].toFixed(1)}l${(dir[0]! * 14).toFixed(1)} ${(dir[1]! * 14).toFixed(1)}`).join('')
const specks = scatter(leaf, 14, 11)
const bugs = scatter(leaf, 2, 23)
const body = 'M0-14c2 0 2.6 3 2.4 6l1.2 4c.6 6 .2 14-3.6 20c-3.8-6-4.2-14-3.6-20l1.2-4c-.2-3 .4-6 2.4-6z'
</script>

<template>
  <GuideArtFrame :label="t('guideArt.pestThrips')">
    <defs>
      <clipPath :id="`${uid}-leaf`">
        <path :d="leaf.outline" />
      </clipPath>
    </defs>
    <g transform="translate(24 136)">
      <path
        d="M0 0l-12 24"
        :stroke="ART.leaf"
        stroke-width="2.4"
      />
      <path
        :d="leaf.outline"
        :fill="ART.leaf"
        fill-opacity="0.22"
      />
      <g :clip-path="`url(#${uid}-leaf)`">
        <path
          :d="leaf.veins"
          :stroke="ART.leaf"
          stroke-opacity="0.35"
          stroke-width="1"
        />
        <path
          :d="streaks"
          :stroke="ART.pale"
          stroke-opacity="0.75"
          stroke-width="3.2"
        />
        <circle
          v-for="(s, i) in specks"
          :key="i"
          :cx="s[0]"
          :cy="s[1]"
          r="1.4"
          fill="var(--well)"
          :stroke="ART.muted"
          stroke-width="0.5"
        />
      </g>
      <path
        :d="leaf.midrib"
        :stroke="ART.leaf"
        stroke-opacity="0.7"
        stroke-width="1"
      />
      <path
        :d="leaf.outline"
        :stroke="ART.leaf"
        stroke-width="1.6"
      />
      <g
        v-for="(b, i) in bugs"
        :key="`b${i}`"
        :transform="`translate(${b[0]} ${b[1]}) rotate(${60 + i * 40}) scale(0.4)`"
      >
        <path
          :d="body"
          :fill="ART.lamp"
          fill-opacity="0.8"
          :stroke="ART.lamp"
        />
      </g>
    </g>
    <circle
      cx="264"
      cy="56"
      r="42"
      fill="var(--well)"
      :stroke="ART.muted"
      stroke-opacity="0.8"
    />
    <g transform="translate(264 58) rotate(30) scale(2.2)">
      <path
        d="M-1-2l-9 10M1-2l9 10M-1-2l-8 8M1-2l8 8"
        :stroke="ART.pale"
        stroke-opacity="0.45"
        stroke-width="0.5"
        stroke-dasharray="0.6 0.8"
      />
      <path
        d="M-1.6-4l-4-3M1.6-4l4-3M-2 0l-4 2M2 0l4 2M-1.6-14l-2-5M1.6-14l2-5"
        :stroke="ART.lamp"
        stroke-width="0.6"
      />
      <path
        :d="body"
        :fill="ART.lamp"
        fill-opacity="0.3"
        :stroke="ART.lamp"
        stroke-width="0.8"
      />
    </g>
    <GuideArtCallout
      :x="232"
      :y="150"
      :tx="150"
      :ty="98"
      :text="t('guideArt.pests.streaks')"
    />
  </GuideArtFrame>
</template>
