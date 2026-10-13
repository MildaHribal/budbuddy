<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const panels = [{ cx: 74, male: false }, { cx: 228, male: true }]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.preFlowers')">
    <path
      d="M160 14v172"
      :stroke="ART.muted"
      stroke-opacity="0.25"
      stroke-dasharray="2 4"
    />
    <g
      v-for="p in panels"
      :key="p.cx"
      :transform="`translate(${p.cx} 0)`"
    >
      <path
        d="M0 18v152"
        :stroke="ART.leaf"
        stroke-width="5"
        stroke-opacity="0.55"
      />
      <path
        d="M0 18v152"
        :stroke="ART.leaf"
        stroke-width="1.2"
        stroke-opacity="0.6"
      />
      <path
        d="M2 112q22-8 40-44"
        :stroke="ART.leaf"
        stroke-width="3.2"
        stroke-opacity="0.7"
      />
      <path
        d="M-2 112q-24-6-46-28"
        :stroke="ART.leaf"
        stroke-width="2.4"
        stroke-opacity="0.7"
      />
      <path
        d="M-2 116l-9 6M3 117l8 6"
        :stroke="ART.leaf"
        stroke-width="1.4"
      />
      <template v-if="!p.male">
        <path
          d="M4 114c-8-3-10-17 0-28c9 11 8 25 0 28z"
          :fill="ART.leaf"
          fill-opacity="0.3"
          :stroke="ART.leaf"
          stroke-width="1.5"
        />
        <path
          d="M4 88q-6-12-16-18M4 88q6-12 17-17"
          :stroke="ART.pale"
          stroke-width="1.8"
          :style="{ color: ART.pale }"
        />
      </template>
      <template v-else>
        <path
          d="M4 114q4-8 2-14"
          :stroke="ART.leaf"
          stroke-width="1.6"
        />
        <g
          :fill="ART.leaf"
          fill-opacity="0.3"
          :stroke="ART.leaf"
          stroke-width="1.5"
        >
          <circle
            cx="7"
            cy="94"
            r="7"
          />
          <circle
            cx="-3"
            cy="102"
            r="5.5"
          />
          <circle
            cx="16"
            cy="102"
            r="5"
          />
        </g>
        <path
          d="M7 87v14M-3 97v10M16 97v10"
          :stroke="ART.leaf"
          stroke-opacity="0.6"
          stroke-width="1"
        />
      </template>
    </g>
    <GuideArtCallout
      :x="104"
      :y="50"
      :tx="86"
      :ty="72"
      :text="t('guideArt.pre.pistils')"
    />
    <path
      d="M262 138L246 106"
      stroke="var(--text-3)"
      stroke-width="1"
      stroke-opacity="0.8"
    />
    <circle
      cx="246"
      cy="106"
      r="1.8"
      fill="var(--text-3)"
    />
    <text
      x="262"
      y="152"
      text-anchor="middle"
      class="ga-text"
    >
      {{ t('guideArt.pre.sacs') }}
    </text>
    <text
      x="74"
      y="192"
      text-anchor="middle"
      :fill="ART.leaf"
    >
      {{ t('guideArt.pre.female') }}
    </text>
    <text
      x="228"
      y="192"
      text-anchor="middle"
      :fill="ART.lamp"
    >
      {{ t('guideArt.pre.male') }}
    </text>
  </GuideArtFrame>
</template>
