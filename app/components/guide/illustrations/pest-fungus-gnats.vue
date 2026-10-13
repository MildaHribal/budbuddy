<script setup lang="ts">
import { ART } from '~/utils/guideArt'

const { t } = useI18n()
const uid = useId()
const pot = 'M96 100h128l-12 90h-104z'
const leaves = [
  { y: -14, s: 26, a: -70 }, { y: -14, s: 26, a: 70 },
  { y: -30, s: 18, a: 0 }
]
const gnats = [{ x: 132, y: 58, a: -20 }, { x: 186, y: 44, a: 25 }, { x: 206, y: 76, a: -10 }, { x: 150, y: 30, a: 10 }]
const larvae = [{ x: 150, y: 112, a: 10 }, { x: 176, y: 116, a: -25 }, { x: 196, y: 110, a: 40 }, { x: 130, y: 118, a: -10 }]
const crumbs = [[110, 140], [140, 150], [170, 136], [196, 152], [124, 170], [160, 172], [190, 174]]
</script>

<template>
  <GuideArtFrame :label="t('guideArt.pestFungusGnats')">
    <defs>
      <clipPath :id="`${uid}-pot`">
        <path :d="pot" />
      </clipPath>
    </defs>
    <g transform="translate(166 102)">
      <path
        d="M0 0V-32"
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
    <g :clip-path="`url(#${uid}-pot)`">
      <rect
        x="90"
        y="100"
        width="140"
        height="92"
        :fill="ART.soil"
        fill-opacity="0.3"
      />
      <rect
        x="90"
        y="100"
        width="140"
        height="24"
        :fill="ART.water"
        fill-opacity="0.16"
      />
      <path
        d="M96 124q8 2 16 0t16 0 16 0 16 0 16 0 16 0 16 0 16 0"
        :stroke="ART.water"
        stroke-opacity="0.5"
        stroke-width="1"
        stroke-dasharray="2 3"
      />
      <circle
        v-for="(c, i) in crumbs"
        :key="i"
        :cx="c[0]"
        :cy="c[1]"
        r="2"
        :fill="ART.soil"
      />
      <g
        v-for="(l, i) in larvae"
        :key="`l${i}`"
        :transform="`translate(${l.x} ${l.y}) rotate(${l.a})`"
      >
        <path
          d="M-6 0q3-2 6 0t6 0"
          :stroke="ART.pale"
          stroke-width="2.4"
        />
        <circle
          cx="6.4"
          cy="0"
          r="1.5"
          fill="var(--well)"
          :stroke="ART.text"
          stroke-width="0.6"
        />
      </g>
    </g>
    <path
      :d="pot"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
    <path
      d="M118 104V82"
      :stroke="ART.muted"
      stroke-width="1.4"
    />
    <rect
      x="106"
      y="52"
      width="24"
      height="30"
      rx="2"
      :fill="ART.yellow"
      fill-opacity="0.3"
      :stroke="ART.yellow"
    />
    <circle
      cx="113"
      cy="62"
      r="1.3"
      fill="var(--well)"
    />
    <circle
      cx="122"
      cy="70"
      r="1.3"
      fill="var(--well)"
    />
    <circle
      cx="116"
      cy="75"
      r="1.3"
      fill="var(--well)"
    />
    <path
      d="M140 64q14 10 30-6t32 4M196 50q-20-12-30 2"
      :stroke="ART.muted"
      stroke-opacity="0.4"
      stroke-dasharray="1 3"
      stroke-width="1"
    />
    <g
      v-for="(g, i) in gnats"
      :key="`g${i}`"
      :transform="`translate(${g.x} ${g.y}) rotate(${g.a}) scale(1.5)`"
    >
      <ellipse
        cx="-3"
        cy="-2"
        rx="2.6"
        ry="5.5"
        transform="rotate(-35 -3 -2)"
        :fill="ART.pale"
        fill-opacity="0.15"
        :stroke="ART.pale"
        stroke-opacity="0.7"
        stroke-width="0.6"
      />
      <ellipse
        cx="3"
        cy="-2"
        rx="2.6"
        ry="5.5"
        transform="rotate(35 3 -2)"
        :fill="ART.pale"
        fill-opacity="0.15"
        :stroke="ART.pale"
        stroke-opacity="0.7"
        stroke-width="0.6"
      />
      <path
        d="M-1 2l-4 5M1 2l4 5M0 3v6M-1-5l-3-4M1-5l3-4"
        :stroke="ART.text"
        stroke-opacity="0.7"
        stroke-width="0.5"
      />
      <ellipse
        rx="1.5"
        ry="4.4"
        :fill="ART.muted"
        :stroke="ART.text"
        stroke-width="0.7"
      />
    </g>
    <GuideArtCallout
      :x="236"
      :y="106"
      :tx="216"
      :ty="108"
      :text="t('guideArt.pests.wet')"
    />
    <GuideArtCallout
      :x="236"
      :y="134"
      :tx="198"
      :ty="114"
      :text="t('guideArt.pests.larvae')"
    />
  </GuideArtFrame>
</template>
