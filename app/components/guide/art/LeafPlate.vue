<script setup lang="ts">
import { GLYPHS } from '~/utils/glyphs'
import { ART } from '~/utils/guideArt'

export type LeafZone = 'old' | 'new' | 'top' | 'all'

const props = withDefaults(defineProps<{
  label: string
  where: LeafZone
  /** short location caption under the mini plant */
  place: string
  tone: string
  droopy?: boolean
  lamp?: boolean
}>(), { droopy: false, lamp: false })

const leafParts = GLYPHS.vegetative.fill ?? []
const nodes = [
  { y: 150, s: 1.35 },
  { y: 124, s: 1.2 },
  { y: 98, s: 1.05 },
  { y: 74, s: 0.85 }
]
const lit = (i: number) => {
  if (props.where === 'all') return true
  if (props.where === 'old') return i <= 1
  return i >= 3
}
const topLit = computed(() => props.where !== 'old')
const bracket = computed(() => {
  if (props.where === 'old') return [134, 160]
  if (props.where === 'all') return [44, 160]
  return [40, 84]
})
const ang = computed(() => (props.droopy ? 112 : 62))
</script>

<template>
  <GuideArtFrame :label="label">
    <g transform="translate(112 132)">
      <slot />
    </g>
    <path
      d="M214 30v140"
      stroke="#8d9a8a"
      stroke-opacity="0.25"
      stroke-dasharray="2 4"
    />
    <g v-if="lamp">
      <rect
        x="228"
        y="14"
        width="48"
        height="6"
        rx="3"
        :fill="ART.lamp"
        fill-opacity="0.25"
        :stroke="ART.lamp"
        class="ga-glow"
        :style="{ color: ART.lamp }"
      />
      <path
        d="M236 26l-3 6M252 26v7M268 26l3 6"
        :stroke="ART.lamp"
        stroke-opacity="0.7"
      />
    </g>
    <path
      d="M252 166V46"
      :stroke="ART.muted"
      stroke-width="1.8"
    />
    <g
      v-for="(n, i) in nodes"
      :key="i"
    >
      <g
        v-for="side in [-1, 1]"
        :key="side"
        :transform="`translate(252 ${n.y}) rotate(${side * ang}) scale(${n.s}) translate(-12 -17)`"
        :stroke="lit(i) ? tone : ART.muted"
        :stroke-opacity="lit(i) ? 1 : 0.55"
        stroke-width="1.3"
      >
        <path
          v-for="(p, j) in leafParts"
          :key="j"
          :d="p.d"
          :transform="p.t"
          :fill="lit(i) ? tone : ART.muted"
          :fill-opacity="lit(i) ? 0.3 : 0.08"
        />
      </g>
    </g>
    <g
      :transform="`translate(252 ${droopy ? 52 : 50}) rotate(${droopy ? 30 : 0}) scale(0.8) translate(-12 -17)`"
      :stroke="topLit ? tone : ART.muted"
      :stroke-opacity="topLit ? 1 : 0.55"
      stroke-width="1.4"
    >
      <path
        v-for="(p, j) in leafParts"
        :key="j"
        :d="p.d"
        :transform="p.t"
        :fill="topLit ? tone : ART.muted"
        :fill-opacity="topLit ? 0.3 : 0.08"
      />
    </g>
    <path
      d="M238 166h28l-3 13h-22z"
      :stroke="ART.soil"
      :fill="ART.soil"
      fill-opacity="0.2"
    />
    <path
      :d="`M290 ${bracket[0]}h4v${bracket[1]! - bracket[0]!}h-4`"
      :stroke="tone"
      stroke-width="1.4"
    />
    <text
      x="252"
      y="195"
      text-anchor="middle"
      :fill="tone"
    >
      {{ place }}
    </text>
  </GuideArtFrame>
</template>
