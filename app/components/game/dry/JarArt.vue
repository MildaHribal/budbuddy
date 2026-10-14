<script setup lang="ts">
import { ART } from '~/utils/guideArt'

// Jar with buds and the analog hygrometer from the guide's curing figure; the needle shows jar RH on a 40-80 % dial.
const props = defineProps<{ rh: number, label: string }>()
const uid = useId()

const jar = 'M14 30H82Q90 30 90 38V112Q90 120 82 120H14Q6 120 6 112V38Q6 30 14 30Z'
const buds = [
  { x: 22, y: 119, a: -24, s: 24 }, { x: 48, y: 120, a: 6, s: 26 }, { x: 74, y: 119, a: 26, s: 23 },
  { x: 32, y: 100, a: -46, s: 22 }, { x: 64, y: 101, a: 40, s: 22 }, { x: 48, y: 92, a: -4, s: 20 }
]

const CX = 48
const CY = 62
const R = 15
const LO = 40
const HI = 80
// dial spans 220 degrees, centred at the top
const angle = (rh: number) => (-200 + ((Math.min(HI, Math.max(LO, rh)) - LO) / (HI - LO)) * 220) * Math.PI / 180
const pt = (rh: number, r: number) => `${(CX + r * Math.cos(angle(rh))).toFixed(2)} ${(CY + r * Math.sin(angle(rh))).toFixed(2)}`
const arc = (a: number, b: number, r: number) => `M${pt(a, r)}A${r} ${r} 0 ${(b - a) / (HI - LO) * 220 > 180 ? 1 : 0} 1 ${pt(b, r)}`
const needle = computed(() => `M${CX} ${CY}L${pt(props.rh, R - 3)}`)
const tone = computed(() => (props.rh > 70 ? 'var(--red)' : props.rh > 65 ? 'var(--amber)' : props.rh < 58 ? 'var(--text-2)' : 'var(--green)'))
</script>

<template>
  <GuideArtFrame
    view-box="0 0 96 124"
    :label="label"
  >
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
          :color="ART.leafDeep"
          :pistil="ART.rust"
        />
      </g>
    </g>
    <circle
      :cx="CX"
      :cy="CY"
      :r="R"
      fill="var(--well)"
      :stroke="ART.text"
      stroke-opacity="0.8"
      stroke-width="1.4"
    />
    <path
      :d="arc(LO, HI, R - 4)"
      :stroke="ART.muted"
      stroke-width="1"
      stroke-dasharray="1 2"
    />
    <path
      :d="arc(58, 65, R - 4)"
      :stroke="ART.leaf"
      stroke-width="2.6"
    />
    <path
      :d="needle"
      :stroke="tone"
      stroke-width="1.6"
    />
    <circle
      :cx="CX"
      :cy="CY"
      r="1.6"
      :fill="ART.text"
    />
    <path
      :d="jar"
      :stroke="ART.text"
      stroke-opacity="0.75"
    />
    <path
      d="M12 16h72v14H12z"
      :stroke="ART.text"
      stroke-opacity="0.75"
      :fill="ART.water"
      fill-opacity="0.05"
    />
    <rect
      x="8"
      y="5"
      width="80"
      height="11"
      rx="3"
      :fill="ART.muted"
      fill-opacity="0.3"
      :stroke="ART.text"
      stroke-opacity="0.8"
    />
  </GuideArtFrame>
</template>
