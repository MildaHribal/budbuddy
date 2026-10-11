<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const leaves = [
  { y: -14, s: 26, a: -70 }, { y: -14, s: 26, a: 70 },
  { y: -30, s: 20, a: -64 }, { y: -30, s: 20, a: 64 },
  { y: -46, s: 15, a: 0 }
]
const plants = [104, 142, 180, 218]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.setupGreenhouse')">
    <path
      d="M60 172V92l100-50 100 50v80z"
      :fill="ART.water"
      fill-opacity="0.04"
      :stroke="ART.text"
      stroke-opacity="0.75"
    />
    <path
      d="M110 67v105M160 42v130M210 67v105M60 126h200"
      :stroke="ART.text"
      stroke-opacity="0.25"
      stroke-width="1.2"
    />
    <path
      d="M70 80l84-42"
      :stroke="ART.muted"
      stroke-width="7"
      stroke-opacity="0.4"
    />
    <path
      d="M70 80l84-42"
      :stroke="ART.muted"
      stroke-width="7"
      stroke-opacity="0.6"
      stroke-dasharray="1 3"
    />
    <path
      d="M176 50l42 1"
      :stroke="ART.text"
      stroke-width="2"
    />
    <path
      d="M176 50l40 20"
      stroke="#0b0d10"
      stroke-width="3"
    />
    <path
      d="M176 50l40 20"
      :stroke="ART.text"
      stroke-opacity="0.3"
      stroke-dasharray="2 3"
    />
    <path
      d="M206 65l4-14"
      :stroke="ART.text"
      stroke-width="1.2"
    />
    <path
      d="M188 46q-4-10 4-18M200 46q-4-10 4-18"
      :stroke="ART.lamp"
      stroke-opacity="0.7"
      stroke-width="1.3"
    />
    <path
      d="M190 30l2-3 3 2M202 30l2-3 3 2"
      :stroke="ART.lamp"
      stroke-opacity="0.7"
      stroke-width="1.3"
    />
    <circle
      cx="292"
      cy="118"
      r="10"
      :fill="ART.lamp"
      fill-opacity="0.35"
      :stroke="ART.lamp"
      class="ga-glow"
      :style="{ color: ART.lamp }"
    />
    <path
      d="M272 118h-6M292 98v-6M278 104l-4-4M278 132l-4 4M292 138v6M306 104l4-4M312 118h4"
      :stroke="ART.lamp"
      stroke-width="1.4"
    />
    <rect
      x="76"
      y="156"
      width="168"
      height="16"
      rx="2"
      :fill="ART.soil"
      fill-opacity="0.22"
      :stroke="ART.soil"
    />
    <g
      v-for="x in plants"
      :key="x"
      :transform="`translate(${x} 156)`"
    >
      <path
        d="M0 0V-48"
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
      d="M30 172h260"
      :stroke="ART.soil"
      stroke-opacity="0.6"
    />
    <GuideArtCallout
      :x="236"
      :y="22"
      :tx="212"
      :ty="48"
      :text="t('guideArt.greenhouse.vent')"
    />
    <GuideArtCallout
      :x="84"
      :y="22"
      :tx="100"
      :ty="60"
      :text="t('guideArt.greenhouse.shade')"
      anchor="end"
    />
  </GuideArtFrame>
</template>
