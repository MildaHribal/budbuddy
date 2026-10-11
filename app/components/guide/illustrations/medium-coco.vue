<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const uid = useId()
const pot = 'M104 74h112l-10 102h-92z'
const leaves = [
  { y: -16, s: 30, a: -70 }, { y: -16, s: 30, a: 70 },
  { y: -36, s: 23, a: -62 }, { y: -36, s: 23, a: 62 },
  { y: -54, s: 16, a: 0 }
]
let x = 7
const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280)
const fibres = Array.from({ length: 46 }, () => {
  const px = 108 + rnd() * 104
  const py = 80 + rnd() * 94
  const a = rnd() * Math.PI
  return `M${px.toFixed(1)} ${py.toFixed(1)}l${(Math.cos(a) * 7).toFixed(1)} ${(Math.sin(a) * 7).toFixed(1)}`
}).join('')
const perlite = Array.from({ length: 22 }, () => ({ x: 110 + rnd() * 100, y: 82 + rnd() * 90, r: 2 + rnd() * 2.2 }))
</script>

<template>
  <GuideArtFrame :label="t('guideArt.mediumCoco')">
    <defs>
      <clipPath :id="`${uid}-pot`">
        <path :d="pot" />
      </clipPath>
    </defs>
    <g transform="translate(160 76)">
      <path
        d="M0 0V-58"
        :stroke="ART.leaf"
        stroke-width="2.4"
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
    <g :clip-path="`url(#${uid}-pot)`">
      <rect
        x="96"
        y="74"
        width="128"
        height="104"
        :fill="ART.rust"
        fill-opacity="0.2"
      />
      <path
        :d="fibres"
        :stroke="ART.rust"
        stroke-opacity="0.75"
        stroke-width="1.1"
      />
      <circle
        v-for="(p, i) in perlite"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        :r="p.r"
        :fill="ART.pale"
        fill-opacity="0.85"
      />
    </g>
    <path
      :d="pot"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <path
      d="M90 184h140l-4 10H94z"
      :stroke="ART.text"
      stroke-opacity="0.6"
      :fill="ART.muted"
      fill-opacity="0.08"
    />
    <path
      d="M96 189h128"
      :stroke="ART.water"
      stroke-width="3"
      stroke-opacity="0.55"
    />
    <path
      d="M136 178q-2 3 0 4.5q2-1.5 0-4.5M160 177q-2 3 0 4.5q2-1.5 0-4.5M184 178q-2 3 0 4.5q2-1.5 0-4.5"
      :fill="ART.water"
      :stroke="ART.water"
      stroke-width="1"
    />
    <GuideArtCallout
      :x="232"
      :y="100"
      :tx="196"
      :ty="104"
      :text="t('guideArt.coco.coco')"
    />
    <GuideArtCallout
      :x="88"
      :y="130"
      :tx="perlite[3]!.x"
      :ty="perlite[3]!.y"
      :text="t('guideArt.coco.perlite')"
      anchor="end"
    />
    <GuideArtCallout
      :x="244"
      :y="176"
      :tx="222"
      :ty="189"
      :text="t('guideArt.coco.runoff')"
    />
  </GuideArtFrame>
</template>
