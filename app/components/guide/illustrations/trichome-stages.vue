<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const stages = computed(() => [
  { cx: 58, head: ART.pale, fill: 0.04, name: t('guideArt.trich.clear'), note: t('guideArt.trich.early'), tone: ART.text },
  { cx: 160, head: ART.pale, fill: 0.6, name: t('guideArt.trich.cloudy'), note: t('guideArt.trich.peak'), tone: ART.leaf },
  { cx: 262, head: ART.lamp, fill: 0.7, name: t('guideArt.trich.amber'), note: t('guideArt.trich.late'), tone: ART.lamp }
])
</script>

<template>
  <GuideArtFrame :label="t('guideArt.trichomeStages')">
    <path
      d="M110 86l6 6-6 6M212 86l6 6-6 6"
      :stroke="ART.muted"
      stroke-opacity="0.7"
    />
    <g
      v-for="s in stages"
      :key="s.cx"
      :transform="`translate(${s.cx} 0)`"
    >
      <circle
        cy="92"
        r="48"
        fill="var(--well)"
        :stroke="ART.muted"
        stroke-opacity="0.6"
      />
      <path
        d="M-44 118q22-4 44 0t44 0"
        :stroke="ART.leaf"
        stroke-opacity="0.6"
      />
      <circle
        cx="-26"
        cy="114"
        r="3.4"
        :stroke="s.head"
        stroke-width="1.2"
        :fill="s.head"
        :fill-opacity="s.fill"
      />
      <circle
        cx="28"
        cy="114"
        r="3"
        :stroke="s.head"
        stroke-width="1.2"
        :fill="s.head"
        :fill-opacity="s.fill"
      />
      <path
        d="M-3.6 118V80q0-3 3.6-3t3.6 3v38"
        :stroke="ART.pale"
        stroke-opacity="0.7"
        stroke-width="1.4"
        :fill="ART.pale"
        fill-opacity="0.1"
      />
      <circle
        cy="66"
        r="15"
        :fill="s.head"
        :fill-opacity="s.fill"
        :stroke="s.head"
        stroke-width="1.6"
        :style="{ color: s.head }"
      />
      <ellipse
        cx="-5"
        cy="60"
        rx="4"
        ry="2.6"
        transform="rotate(-30 -5 60)"
        :fill="ART.text"
        fill-opacity="0.55"
      />
      <text
        y="162"
        text-anchor="middle"
        :fill="s.tone"
      >
        {{ s.name }}
      </text>
      <text
        y="178"
        text-anchor="middle"
        class="ga-muted"
      >
        {{ s.note }}
      </text>
    </g>
  </GuideArtFrame>
</template>
