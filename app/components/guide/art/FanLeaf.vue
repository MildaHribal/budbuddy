<script setup lang="ts">
import { ART, fanLeaf, scatter } from '~/utils/guideArt'

export type LeafPattern = 'none' | 'tips' | 'edges' | 'spots' | 'patches'

const props = withDefaults(defineProps<{
  size?: number
  count?: 5 | 7
  droop?: number
  plump?: number
  spread?: number
  wobble?: number
  fill?: string
  fillOpacity?: number
  stroke?: string
  /** green veins over a yellow blade = interveinal chlorosis */
  veins?: string
  veinWidth?: number
  pattern?: LeafPattern
  patternColor?: string
  /** yellow halo between healthy tissue and the burnt part */
  halo?: string
  amount?: number
  petiole?: string
  petioleLength?: number
}>(), {
  size: 80,
  count: 7,
  droop: 0,
  plump: 1,
  spread: 1,
  wobble: 0,
  fill: ART.leaf,
  fillOpacity: 0.22,
  stroke: ART.leaf,
  veins: undefined,
  veinWidth: 3.2,
  pattern: 'none',
  patternColor: ART.burn,
  halo: undefined,
  amount: 1,
  petiole: undefined,
  petioleLength: 0.55
})

const uid = useId()
const shapes = computed(() => fanLeaf(props))
const petiolePath = computed(() => {
  const L = props.size * props.petioleLength
  const dx = props.droop * L * 0.5
  return `M0 0Q${dx * 0.2} ${L * 0.55} ${dx} ${L}`
})
const dots = computed(() => shapes.value.map((s, i) => scatter(s, Math.round(5 * props.amount), i + 3)))
</script>

<template>
  <g
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      :d="petiolePath"
      fill="none"
      :stroke="petiole ?? stroke"
      stroke-width="2.2"
    />
    <defs>
      <clipPath
        v-for="(s, i) in shapes"
        :id="`${uid}-c${i}`"
        :key="i"
      >
        <path :d="s.outline" />
      </clipPath>
    </defs>
    <g
      v-for="(s, i) in shapes"
      :key="i"
    >
      <path
        :d="s.outline"
        :fill="fill"
        :fill-opacity="fillOpacity"
      />
      <g :clip-path="`url(#${uid}-c${i})`">
        <template v-if="veins">
          <path
            :d="s.midrib + s.veins"
            fill="none"
            :stroke="veins"
            :stroke-width="veinWidth"
            stroke-opacity="0.75"
          />
        </template>
        <template v-if="pattern === 'edges'">
          <path
            v-if="halo"
            :d="s.outline"
            fill="none"
            :stroke="halo"
            stroke-opacity="0.6"
            :stroke-width="9 * amount"
          />
          <path
            :d="s.outline"
            fill="none"
            :stroke="patternColor"
            stroke-opacity="0.9"
            :stroke-width="4.5 * amount"
          />
        </template>
        <template v-if="pattern === 'tips' || pattern === 'edges'">
          <circle
            v-if="halo"
            :cx="s.tip[0]"
            :cy="s.tip[1]"
            :r="s.length * 0.24 * amount"
            :fill="halo"
            fill-opacity="0.55"
          />
          <circle
            :cx="s.tip[0]"
            :cy="s.tip[1]"
            :r="s.length * 0.15 * amount"
            :fill="patternColor"
            fill-opacity="0.92"
          />
        </template>
        <template v-if="pattern === 'spots' || pattern === 'patches'">
          <ellipse
            v-for="(p, j) in dots[i]"
            :key="j"
            :cx="p[0]"
            :cy="p[1]"
            :rx="pattern === 'patches' ? s.length * 0.09 : 1.6 + (j % 3) * 0.7"
            :ry="pattern === 'patches' ? s.length * 0.06 : 1.4 + (j % 2) * 0.8"
            :fill="patternColor"
            :fill-opacity="pattern === 'patches' ? 0.6 : 0.95"
          />
        </template>
      </g>
      <path
        :d="s.midrib"
        fill="none"
        :stroke="veins ?? stroke"
        stroke-width="1"
        stroke-opacity="0.7"
      />
      <path
        :d="s.outline"
        fill="none"
        :stroke="stroke"
        stroke-width="1.6"
      />
    </g>
  </g>
</template>
