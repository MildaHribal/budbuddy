<script setup lang="ts">
import { computed, useId } from 'vue'
import type { PlantVisual } from '../../../../shared/game/types'
import type { Detail } from '~/utils/gameRender/layout'
import { buildModel, cotyledonColor, potPalette as P } from '~/utils/gameRender/model'

const props = withDefaults(defineProps<{
  visual: PlantVisual
  /** rendered width in px; height follows the 4:5 frame */
  size?: number
  /** accessible description, e.g. "Northern Lights, day 34, flowering" */
  label?: string
  detail?: Detail
}>(), { size: 240, label: '', detail: 'full' })

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const model = computed(() => buildModel(props.visual, uid, props.detail))
const height = computed(() => Math.round(props.size * model.value.h / model.value.w))

const pot = computed(() => {
  const p = model.value.scene.pot
  const hydro = p.medium === 'hydro'
  const topW = p.w
  const botW = hydro ? p.w * 0.9 : p.w * 0.8
  const ry = p.w * 0.11
  const top = p.soilY
  const bot = p.soilY + p.h
  const x0 = p.cx - topW / 2
  const x1 = p.cx + topW / 2
  const bx0 = p.cx - botW / 2
  const bx1 = p.cx + botW / 2
  const body = `M${x0} ${top}L${bx0} ${bot - ry * 0.4}Q${bx0} ${bot} ${bx0 + ry * 0.6} ${bot}L${bx1 - ry * 0.6} ${bot}Q${bx1} ${bot} ${bx1} ${bot - ry * 0.4}L${x1} ${top}A${topW / 2} ${ry} 0 0 1 ${x0} ${top}Z`
  const shadeX = p.cx + topW * 0.18
  const shadeBx = p.cx + botW * 0.18
  const shadeD = `M${shadeX} ${top + ry * 0.95}L${shadeBx} ${bot - 0.2}L${bx1 - ry * 0.6} ${bot}Q${bx1} ${bot} ${bx1} ${bot - ry * 0.4}L${x1} ${top}A${topW / 2} ${ry} 0 0 1 ${shadeX} ${top + ry * 0.95}Z`
  const rimH = Math.max(2, p.h * 0.09)
  return { ...p, hydro, topW, ry, top, bot, body, shadeD, rimH, x0, x1, mediumRx: topW / 2 - (hydro ? topW * 0.2 : 1.2) }
})

const mediumDots = computed(() => {
  // deterministic speckle pattern tile; one <pattern> per plant
  const seed = props.visual.seed
  const dots: { x: number, y: number, r: number, k: number }[] = []
  let a = seed >>> 0 || 7
  const nx = () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const hydro = pot.value.hydro
  for (let i = 0; i < (hydro ? 14 : 26); i++) {
    dots.push({ x: nx() * 24, y: nx() * 12, r: hydro ? 1.6 + nx() * 1.3 : 0.5 + nx() * 1.1, k: i % 3 })
  }
  return dots
})

const stump = computed(() => model.value.scene.stump)
const germ = computed(() => model.value.scene.germ)
const cot = computed(() => model.value.scene.cotyledons)
</script>

<template>
  <svg
    :viewBox="`0 0 ${model.w} ${model.h}`"
    :width="size"
    :height="height"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    class="game-plant"
  >
    <defs>
      <symbol
        v-for="s in model.symbols"
        :id="s.id"
        :key="s.id"
        overflow="visible"
      >
        <path
          :d="s.silhouette"
          stroke="none"
        />
        <path
          :d="s.veins"
          fill="none"
          stroke-linecap="round"
        />
      </symbol>
      <path
        v-for="i in model.insets"
        :id="i.id"
        :key="i.id"
        :d="i.d"
      />
      <symbol
        v-for="o in model.overlays"
        :id="o.id"
        :key="o.id"
        overflow="visible"
      >
        <path
          v-for="(p, idx) in o.parts"
          :key="idx"
          :d="p.d"
          :fill="p.fill ?? 'none'"
          :stroke="p.stroke"
          :stroke-width="p.sw"
          :opacity="p.opacity"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </symbol>
      <pattern
        :id="`${uid}-med`"
        patternUnits="userSpaceOnUse"
        width="24"
        height="12"
      >
        <rect
          width="24"
          height="12"
          :fill="pot.hydro ? P.pebbleDark : (pot.medium === 'coco' ? P.coco : P.soil)"
        />
        <circle
          v-for="(d, i) in mediumDots"
          :key="i"
          :cx="d.x"
          :cy="d.y"
          :r="d.r"
          :fill="pot.hydro ? (d.k === 0 ? P.pebbleDark : P.pebble) : (pot.medium === 'coco' ? (d.k === 0 ? P.soil : P.cocoDot) : (d.k === 0 ? P.soilDark : P.soilDot))"
        />
      </pattern>
    </defs>

    <!-- pot: back rim, medium, front body -->
    <g class="pot">
      <ellipse
        :cx="pot.cx"
        :cy="pot.top"
        :rx="pot.topW / 2"
        :ry="pot.ry"
        :fill="pot.hydro ? P.bucketLid : P.clayRim"
      />
      <ellipse
        :cx="pot.cx"
        :cy="pot.top"
        :rx="pot.mediumRx"
        :ry="pot.ry * (pot.hydro ? 0.75 : 0.9)"
        :fill="`url(#${uid}-med)`"
      />
      <path
        :d="pot.body"
        :fill="pot.hydro ? P.bucket : P.clay"
      />
      <path
        :d="pot.shadeD"
        :fill="pot.hydro ? '#161a19' : P.clayDark"
        opacity="0.85"
      />
      <path
        :d="`M${pot.x0} ${pot.top}A${pot.topW / 2} ${pot.ry} 0 0 0 ${pot.x1} ${pot.top}`"
        fill="none"
        :stroke="pot.hydro ? P.bucketEdge : P.clayRim"
        :stroke-width="pot.rimH"
        stroke-linecap="butt"
      />
    </g>

    <!-- germination: seed, hypocotyl hook, opening cotyledons -->
    <g
      v-if="germ"
      :transform="`translate(${germ.x} ${germ.y})`"
    >
      <path
        v-if="germ.progress > 0.25"
        :d="`M0 0C${-germ.size * 0.6} ${-germ.size * 2.2 * germ.progress} ${germ.size * 0.9} ${-germ.size * 2.6 * germ.progress} ${germ.size * 0.2} ${-germ.size * 3.2 * germ.progress}`"
        fill="none"
        :stroke="P.shoot"
        :stroke-width="germ.size * 0.22"
        stroke-linecap="round"
      />
      <g
        v-if="germ.progress > 0.55"
        :transform="`translate(${germ.size * 0.2} ${-germ.size * 3.2 * germ.progress}) scale(${(germ.progress - 0.55) / 0.45})`"
      >
        <ellipse
          :rx="germ.size * 1.2"
          :ry="germ.size * 0.5"
          :cx="-germ.size * 1.1"
          :cy="0"
          :fill="P.cotyledon"
          transform="rotate(-14)"
        />
        <ellipse
          :rx="germ.size * 1.2"
          :ry="germ.size * 0.5"
          :cx="germ.size * 1.1"
          :cy="0"
          :fill="P.cotyledon"
          transform="rotate(14)"
        />
      </g>
      <g :transform="`translate(${germ.progress > 0.25 ? germ.size * 0.9 : 0} ${germ.progress > 0.55 ? germ.size * 0.1 : -germ.size * 0.35}) rotate(${germ.progress > 0.25 ? 50 : -20})`">
        <ellipse
          :rx="germ.size * 0.72"
          :ry="germ.size * 0.5"
          :fill="P.seed"
        />
        <path
          :d="`M${-germ.size * 0.5} ${-germ.size * 0.2}q${germ.size * 0.3} ${germ.size * 0.1} ${germ.size * 0.9} 0M${-germ.size * 0.45} ${germ.size * 0.15}q${germ.size * 0.3} ${germ.size * 0.12} ${germ.size * 0.85} 0`"
          fill="none"
          :stroke="P.seedStripe"
          :stroke-width="germ.size * 0.1"
        />
        <path
          v-if="germ.progress > 0.08"
          :d="`M${-germ.size * 0.7} 0L${germ.size * 0.7} 0`"
          :stroke="P.shoot"
          :stroke-width="germ.size * 0.08"
        />
      </g>
    </g>

    <!-- harvested: cut stump -->
    <g v-if="stump">
      <path
        :d="`M${stump.x - stump.w / 2} ${stump.y}L${stump.x - stump.w / 2.4} ${stump.y - stump.h}L${stump.x + stump.w / 2.4} ${stump.y - stump.h}L${stump.x + stump.w / 2} ${stump.y}Z`"
        :fill="model.stemColor"
      />
      <ellipse
        :cx="stump.x"
        :cy="stump.y - stump.h"
        :rx="stump.w / 2.4"
        :ry="stump.w / 6"
        :fill="P.cut"
      />
      <path
        :d="`M${stump.x} ${stump.y - stump.h * 0.55}l${stump.w * 1.6} ${-stump.h * 0.25}M${stump.x} ${stump.y - stump.h * 0.35}l${-stump.w * 1.4} ${-stump.h * 0.2}`"
        fill="none"
        :stroke="model.stemColor"
        :stroke-width="stump.w * 0.4"
        stroke-linecap="round"
      />
    </g>

    <!-- back leaves -->
    <g
      v-for="(l, i) in model.back"
      :key="`b${i}`"
    >
      <path
        :d="l.petiole.d"
        fill="none"
        :stroke="model.petioleColor"
        :stroke-width="l.petiole.w"
        stroke-linecap="round"
      />
      <g :transform="l.transform">
        <use
          :href="`#${l.symbol}`"
          :fill="l.outer ?? l.fill"
          :stroke="l.vein"
          :stroke-width="l.veinW"
        />
        <use
          v-if="l.insetId"
          :href="`#${l.insetId}`"
          :fill="l.fill"
        />
        <use
          v-for="o in l.overlays"
          :key="o.id"
          :href="`#${o.id}`"
          :opacity="o.opacity"
        />
      </g>
    </g>

    <!-- stems -->
    <path
      v-for="(st, i) in model.stems"
      :key="`s${i}`"
      :d="st.d"
      fill="none"
      :stroke="model.stemColor"
      :stroke-width="st.w"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-if="model.stemDots"
      :d="model.stemDots.d"
      :fill="model.stemDots.fill"
      :opacity="model.stemDots.opacity"
    />

    <!-- seedling cotyledons -->
    <g v-if="cot">
      <ellipse
        :cx="cot.x - cot.len * 0.55"
        :cy="cot.y"
        :rx="cot.len * 0.55"
        :ry="cot.len * 0.22"
        :fill="cotyledonColor(visual.life)"
        :transform="`rotate(-12 ${cot.x} ${cot.y})`"
      />
      <ellipse
        :cx="cot.x + cot.len * 0.55"
        :cy="cot.y"
        :rx="cot.len * 0.55"
        :ry="cot.len * 0.22"
        :fill="cotyledonColor(visual.life)"
        :transform="`rotate(12 ${cot.x} ${cot.y})`"
      />
    </g>

    <!-- front leaves -->
    <g
      v-for="(l, i) in model.front"
      :key="`f${i}`"
    >
      <path
        :d="l.petiole.d"
        fill="none"
        :stroke="model.petioleColor"
        :stroke-width="l.petiole.w"
        stroke-linecap="round"
      />
      <g :transform="l.transform">
        <use
          :href="`#${l.symbol}`"
          :fill="l.outer ?? l.fill"
          :stroke="l.vein"
          :stroke-width="l.veinW"
        />
        <use
          v-if="l.insetId"
          :href="`#${l.insetId}`"
          :fill="l.fill"
        />
        <use
          v-for="o in l.overlays"
          :key="o.id"
          :href="`#${o.id}`"
          :opacity="o.opacity"
        />
      </g>
    </g>

    <!-- buds with sugar leaves -->
    <g
      v-for="(b, i) in model.buds"
      :key="`bud${i}`"
      :transform="b.transform"
    >
      <g
        v-for="(l, j) in b.sugar"
        :key="`sg${j}`"
      >
        <path
          :d="l.petiole.d"
          fill="none"
          :stroke="model.petioleColor"
          :stroke-width="l.petiole.w"
          stroke-linecap="round"
        />
        <g :transform="l.transform">
          <use
            :href="`#${l.symbol}`"
            :fill="l.outer ?? l.fill"
            :stroke="l.vein"
            :stroke-width="l.veinW"
          />
          <use
            v-if="l.insetId"
            :href="`#${l.insetId}`"
            :fill="l.fill"
          />
          <use
            v-for="o in l.overlays"
            :key="o.id"
            :href="`#${o.id}`"
            :opacity="o.opacity"
          />
        </g>
      </g>
      <path
        v-for="(p, j) in b.parts"
        :key="`bp${j}`"
        :d="p.d"
        :fill="p.fill ?? 'none'"
        :stroke="p.stroke"
        :stroke-width="p.sw"
        :opacity="p.opacity"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
  </svg>
</template>

<style scoped>
.game-plant {
  display: block;
  overflow: visible;
}
</style>
