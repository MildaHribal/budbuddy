<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const uid = useId()
const jar = 'M72 60H148Q160 60 160 72V178Q160 190 148 190H72Q60 190 60 178V72Q60 60 72 60Z'
const buds = [
  { x: 78, y: 188, a: -24, s: 34 }, { x: 108, y: 189, a: 8, s: 36 }, { x: 140, y: 188, a: 28, s: 32 },
  { x: 86, y: 160, a: -50, s: 30 }, { x: 128, y: 162, a: 44, s: 30 }, { x: 104, y: 150, a: -6, s: 28 }
]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.curingJar')">
    <defs>
      <clipPath :id="`${uid}-jar`">
        <path :d="jar" />
      </clipPath>
    </defs>
    <path
      :d="jar"
      :fill="ART.water"
      fill-opacity="0.05"
    />
    <g :clip-path="`url(#${uid}-jar)`">
      <g
        v-for="(b, i) in buds"
        :key="i"
        :transform="`translate(${b.x} ${b.y}) rotate(${b.a})`"
      >
        <GuideArtBud
          :size="b.s"
          :pistil="ART.rust"
        />
      </g>
    </g>
    <circle
      cx="132"
      cy="94"
      r="15"
      fill="var(--well)"
      :stroke="ART.text"
      stroke-opacity="0.8"
      stroke-width="1.4"
    />
    <path
      d="M121 100a12 12 0 0 1 22 0"
      :stroke="ART.muted"
      stroke-width="1"
      stroke-dasharray="1 2"
    />
    <path
      d="M128 92a12 12 0 0 1 8 0"
      :stroke="ART.leaf"
      stroke-width="2.4"
    />
    <path
      d="M132 98l3-9"
      :stroke="ART.text"
      stroke-width="1.2"
    />
    <path
      :d="jar"
      :stroke="ART.text"
      stroke-opacity="0.75"
    />
    <path
      d="M68 82v80"
      :stroke="ART.text"
      stroke-opacity="0.25"
      stroke-width="3"
    />
    <path
      d="M72 44h76v16H72z"
      :stroke="ART.text"
      stroke-opacity="0.75"
      :fill="ART.water"
      fill-opacity="0.05"
    />
    <path
      d="M74 49h72M74 54h72"
      :stroke="ART.text"
      stroke-opacity="0.25"
      stroke-width="1"
    />
    <rect
      x="68"
      y="32"
      width="84"
      height="12"
      rx="3"
      :fill="ART.muted"
      fill-opacity="0.3"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <path
      d="M150 30q6-6 2-12t2-12M160 34q8-6 4-12"
      :stroke="ART.muted"
      stroke-opacity="0.7"
      stroke-width="1.2"
    />
    <GuideArtCallout
      :x="180"
      :y="22"
      :tx="158"
      :ty="22"
      :text="t('guideArt.cure.burp')"
    />
    <GuideArtCallout
      :x="180"
      :y="94"
      :tx="147"
      :ty="94"
      :text="t('guideArt.cure.rh')"
      :color="ART.leaf"
    />
  </GuideArtFrame>
</template>
