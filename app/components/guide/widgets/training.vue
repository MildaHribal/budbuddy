<script setup lang="ts">
type Technique = 'lst' | 'topping' | 'fim' | 'scrog' | 'defoliation' | 'lollipop' | 'supercrop'
type Kind = 'stem' | 'fan' | 'bud' | 'tie' | 'cut' | 'net' | 'mark' | 'knot'
interface Part { k: Kind, d?: string, x?: number, y?: number, rot?: number, s?: number }
interface St { t?: string, op?: number }
interface El { parts: Part[], o?: [number, number], b?: St, a?: St, delay?: number }

const props = withDefaults(defineProps<{ technique?: Technique }>(), { technique: 'lst' })
const { t } = useI18n()
const uid = useId()
const fanId = `fan-${uid}`

const stem = (d: string): Part => ({ k: 'stem', d })
const fan = (x: number, y: number, rot = 0, s = 1): Part => ({ k: 'fan', x, y, rot, s })
const bud = (x: number, y: number, s = 1): Part => ({ k: 'bud', x, y, s })
const show = (delay = 0): Pick<El, 'b' | 'a' | 'delay'> => ({ b: { op: 0 }, a: { op: 1 }, delay })
const grow = (delay = 0): Pick<El, 'b' | 'a' | 'delay'> => ({ b: { t: 'scale(0.01)', op: 0 }, a: { t: 'scale(1)', op: 1 }, delay })
const drop = (delay = 0, rot = -30): Pick<El, 'b' | 'a' | 'delay'> => ({ b: {}, a: { t: `translate(0px, 24px) rotate(${rot}deg)`, op: 0 }, delay })
const swell = (delay = 0, s = 1.35): Pick<El, 'b' | 'a' | 'delay'> => ({ b: {}, a: { t: `scale(${s})` }, delay })

const lowerFans = [fan(104, 142, -62, 0.8), fan(136, 142, 62, 0.8)]

const SCENES: Record<Technique, El[]> = {
  lst: [
    { parts: [stem('M120 166 L120 116'), ...lowerFans] },
    { parts: [stem('M120 128 L102 100'), fan(102, 100, -20, 0.7)], o: [120, 128], b: {}, a: { t: 'rotate(18deg)' } },
    { parts: [stem('M120 128 L138 100'), fan(138, 100, 20, 0.7)], o: [120, 128], b: {}, a: { t: 'rotate(-14deg)' } },
    { parts: [stem('M120 116 L120 60'), fan(120, 60, 0, 1), fan(108, 88, -55, 0.7), fan(132, 88, 55, 0.7)], o: [120, 116], b: {}, a: { t: 'rotate(74deg)' } },
    { parts: [{ k: 'tie', d: 'M166 103 L152 166' }], ...show(250) },
    { parts: [stem('M141 110 L141 82'), fan(141, 80, 0, 0.7)], o: [141, 110], ...grow(380) },
    { parts: [stem('M158 105 L158 78'), fan(158, 76, 0, 0.7)], o: [158, 105], ...grow(470) },
    { parts: [stem('M174 101 L176 74'), fan(176, 72, 0, 0.75)], o: [174, 101], ...grow(560) },
    { parts: [{ k: 'mark', d: 'M90 68 H190' }], ...show(800) }
  ],
  topping: [
    { parts: [stem('M120 166 L120 80'), ...lowerFans, fan(106, 114, -60, 0.85), fan(134, 114, 60, 0.85), fan(109, 84, -62, 0.6), fan(131, 84, 62, 0.6)] },
    { parts: [stem('M120 80 L120 50'), fan(120, 50, 0, 0.9)], o: [120, 80], b: {}, a: { t: 'translate(0px, -16px)', op: 0 } },
    { parts: [{ k: 'cut', x: 120, y: 77 }], ...show(150) },
    { parts: [stem('M120 82 Q104 72 100 48'), fan(100, 48, -8, 0.9)], o: [120, 82], ...grow(380) },
    { parts: [stem('M120 82 Q136 72 140 48'), fan(140, 48, 8, 0.9)], o: [120, 82], ...grow(460) }
  ],
  fim: [
    { parts: [stem('M120 166 L120 64'), ...lowerFans, fan(106, 114, -60, 0.85), fan(134, 114, 60, 0.85), fan(108, 88, -62, 0.65), fan(132, 88, 62, 0.65)] },
    { parts: [fan(120, 62, 0, 0.9)], o: [120, 64], b: {}, a: { t: 'scale(0.35)', op: 0.7 } },
    { parts: [{ k: 'cut', x: 120, y: 54 }], ...show(150) },
    { parts: [stem('M120 64 Q104 58 98 44'), fan(98, 44, -30, 0.62)], o: [120, 64], ...grow(360) },
    { parts: [stem('M120 64 Q113 50 112 36'), fan(112, 36, -10, 0.62)], o: [120, 64], ...grow(430) },
    { parts: [stem('M120 64 Q127 50 128 36'), fan(128, 36, 10, 0.62)], o: [120, 64], ...grow(500) },
    { parts: [stem('M120 64 Q136 58 142 44'), fan(142, 44, 30, 0.62)], o: [120, 64], ...grow(570) }
  ],
  scrog: [
    { parts: [{ k: 'net', d: 'M52 76 H188 M52 86 H188 M52 76 V86 M69 76 V86 M86 76 V86 M103 76 V86 M120 76 V86 M137 76 V86 M154 76 V86 M171 76 V86 M188 76 V86' }], b: { op: 0.35 }, a: { op: 1 } },
    { parts: [stem('M120 166 L120 130'), ...lowerFans] },
    { parts: [stem('M120 130 L96.8 66.4'), fan(96.8, 66.4, -20, 0.75)], o: [120, 130], b: {}, a: { t: 'rotate(-35.8deg)' } },
    { parts: [stem('M120 130 L113.4 83.3'), fan(113.4, 83.3, -8, 0.7)], o: [120, 130], b: {}, a: { t: 'rotate(-28.4deg)' } },
    { parts: [stem('M120 130 L126.6 83.3'), fan(126.6, 83.3, 8, 0.7)], o: [120, 130], b: {}, a: { t: 'rotate(28.4deg)' } },
    { parts: [stem('M120 130 L143.2 66.4'), fan(143.2, 66.4, 20, 0.75)], o: [120, 130], b: {}, a: { t: 'rotate(35.8deg)' } },
    { parts: [stem('M64 92 L64 60'), bud(64, 56)], o: [64, 92], ...grow(420) },
    { parts: [stem('M92 92 L92 60'), bud(92, 56)], o: [92, 92], ...grow(500) },
    { parts: [stem('M148 92 L148 60'), bud(148, 56)], o: [148, 92], ...grow(580) },
    { parts: [stem('M176 92 L176 60'), bud(176, 56)], o: [176, 92], ...grow(660) },
    { parts: [{ k: 'mark', d: 'M52 48 H188' }], ...show(850) }
  ],
  defoliation: [
    { parts: [stem('M120 166 L120 50'), stem('M120 130 L96 108'), stem('M120 130 L144 108'), stem('M120 100 L102 82'), stem('M120 100 L138 82'), fan(110, 150, -80, 0.6), fan(130, 150, 80, 0.6)] },
    ...([[96, 106], [144, 106], [102, 80], [138, 80], [120, 46]] as const)
      .map(([x, y], i): El => ({ parts: [bud(x, y, 0.85)], o: [x, y], ...swell(500 + i * 60) })),
    { parts: [fan(100, 122, -72, 1.25)], o: [100, 122], ...drop(0, -30) },
    { parts: [fan(140, 122, 72, 1.25)], o: [140, 122], ...drop(110, 30) },
    { parts: [fan(104, 94, -72, 1.1)], o: [104, 94], ...drop(220, -30) },
    { parts: [fan(136, 94, 72, 1.1)], o: [136, 94], ...drop(330, 30) }
  ],
  lollipop: [
    { parts: [stem('M120 166 L120 46'), stem('M120 84 L100 62'), stem('M120 84 L140 62'), stem('M120 112 L98 94'), stem('M120 112 L142 94'), fan(106, 76, -60, 0.8), fan(134, 76, 60, 0.8), fan(106, 106, -64, 0.75), fan(134, 106, 64, 0.75)] },
    ...([[100, 60], [140, 60], [120, 44]] as const).map(([x, y], i): El => ({ parts: [bud(x, y)], o: [x, y], ...swell(520 + i * 60, 1.3) })),
    { parts: [bud(98, 92, 0.85), bud(142, 92, 0.85)] },
    { parts: [stem('M120 142 L100 132'), bud(100, 131, 0.5), fan(108, 152, -80, 0.7)], o: [110, 140], ...drop(0, -20) },
    { parts: [stem('M120 142 L140 132'), bud(140, 131, 0.5), fan(132, 152, 80, 0.7)], o: [130, 140], ...drop(120, 20) },
    { parts: [{ k: 'mark', d: 'M78 124 H162' }], ...show(300) }
  ],
  supercrop: [
    { parts: [stem('M120 166 L120 100'), ...lowerFans, fan(106, 118, -60, 0.8), fan(134, 118, 60, 0.8)] },
    { parts: [stem('M120 100 L120 40'), fan(120, 40, 0, 0.9), fan(108, 70, -55, 0.65), fan(132, 70, 55, 0.65)], o: [120, 100], b: {}, a: { t: 'rotate(80deg)' } },
    { parts: [{ k: 'knot', x: 120, y: 100 }], o: [120, 100], ...grow(320) },
    { parts: [stem('M179 90 L181 64'), fan(181, 62, 0, 0.7)], o: [179, 90], ...grow(560) }
  ]
}

const scene = computed(() => SCENES[props.technique] ?? SCENES.lst)
const name = computed(() => t(`guideWidgets.training.${props.technique}.name`))
const tips = computed(() => [1, 2, 3].map(n => t(`guideWidgets.training.${props.technique}.tip${n}`)))

const phase = ref<'before' | 'after'>('before')
let timer: ReturnType<typeof setTimeout> | undefined
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function play(wait: number) {
  clearTimeout(timer)
  if (reduced()) {
    phase.value = 'after'
    return
  }
  phase.value = 'before'
  timer = setTimeout(() => {
    phase.value = 'after'
  }, wait)
}
onMounted(() => play(700))
onBeforeUnmount(() => clearTimeout(timer))
watch(() => props.technique, () => play(500))

function set(p: 'before' | 'after') {
  clearTimeout(timer)
  phase.value = p
}

function style(el: El) {
  const st = (phase.value === 'after' ? el.a : el.b) ?? el.b ?? {}
  return {
    transformOrigin: el.o ? `${el.o[0]}px ${el.o[1]}px` : undefined,
    transform: st.t ?? 'none',
    opacity: st.op ?? 1,
    transitionDelay: phase.value === 'after' ? `${el.delay ?? 0}ms` : '0ms'
  }
}
</script>

<template>
  <div class="gw training">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.training.title', { name }) }}
      </h3>
      <p class="gw-sub">
        {{ t(`guideWidgets.training.${technique}.what`) }}
      </p>
    </div>

    <div
      class="stage"
      :class="phase"
    >
      <svg
        viewBox="0 0 240 200"
        role="img"
        :aria-label="`${name}: ${phase === 'after' ? t('guideWidgets.training.after') : t('guideWidgets.training.before')}`"
      >
        <defs>
          <g :id="fanId">
            <path
              d="M0 0 V-4"
              stroke="#7fcf5a"
              stroke-width="1.6"
            />
            <ellipse
              v-for="a in [-64, -32, 0, 32, 64]"
              :key="a"
              cx="0"
              :cy="a === 0 ? -14 : -11"
              rx="2.8"
              :ry="a === 0 ? 10 : 8"
              :transform="`rotate(${a})`"
            />
          </g>
          <linearGradient
            :id="`beam-${uid}`"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0"
              stop-color="#ffd28a"
              stop-opacity="0.16"
            />
            <stop
              offset="1"
              stop-color="#ffd28a"
              stop-opacity="0"
            />
          </linearGradient>
        </defs>

        <path
          d="M64 12 H176 L206 170 H34 Z"
          :fill="`url(#beam-${uid})`"
        />
        <rect
          class="lamp"
          x="64"
          y="6"
          width="112"
          height="6"
          rx="3"
        />

        <path
          class="pot"
          d="M88 166 H152 L146 194 H94 Z"
        />
        <path
          class="soil"
          d="M88 166 H152"
        />

        <g
          v-for="(el, i) in scene"
          :key="`${technique}-${i}`"
          class="el"
          :style="style(el)"
        >
          <template
            v-for="(p, j) in el.parts"
            :key="j"
          >
            <path
              v-if="p.k === 'stem'"
              class="stem"
              :d="p.d"
            />
            <use
              v-else-if="p.k === 'fan'"
              class="fan"
              :href="`#${fanId}`"
              :transform="`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.s})`"
            />
            <g
              v-else-if="p.k === 'bud'"
              class="bud"
              :transform="`translate(${p.x} ${p.y}) scale(${p.s})`"
            >
              <ellipse
                rx="5"
                ry="7"
              />
              <path d="M-2 -5 L-4 -9 M2 -5 L4 -9 M0 -6 V-10" />
            </g>
            <path
              v-else-if="p.k === 'tie'"
              class="tie"
              :d="p.d"
            />
            <path
              v-else-if="p.k === 'cut'"
              class="cut"
              :d="`M${p.x! - 7} ${p.y! - 4} L${p.x! + 7} ${p.y! + 4} M${p.x! - 7} ${p.y! + 4} L${p.x! + 7} ${p.y! - 4}`"
            />
            <path
              v-else-if="p.k === 'net'"
              class="net"
              :d="p.d"
            />
            <path
              v-else-if="p.k === 'mark'"
              class="mark"
              :d="p.d"
            />
            <circle
              v-else-if="p.k === 'knot'"
              class="knot"
              :cx="p.x"
              :cy="p.y"
              r="5"
            />
          </template>
        </g>
      </svg>
    </div>

    <div class="controls">
      <div
        class="segmented"
        role="group"
        :aria-label="t('guideWidgets.training.view')"
      >
        <button
          type="button"
          :aria-pressed="phase === 'before'"
          @click="set('before')"
        >
          {{ t('guideWidgets.training.before') }}
        </button>
        <button
          type="button"
          :aria-pressed="phase === 'after'"
          @click="set('after')"
        >
          {{ t('guideWidgets.training.after') }}
        </button>
      </div>
      <button
        type="button"
        class="btn btn-soft replay"
        @click="play(450)"
      >
        <UIcon
          name="i-tabler-refresh"
          aria-hidden="true"
        />
        {{ t('guideWidgets.training.replay') }}
      </button>
    </div>

    <p class="gw-text when">
      <strong>{{ t('guideWidgets.training.when') }}</strong> {{ t(`guideWidgets.training.${technique}.when`) }}
    </p>

    <ul
      class="gw-list"
      :aria-label="t('guideWidgets.training.tipsHead')"
    >
      <li
        v-for="tip in tips"
        :key="tip"
      >
        {{ tip }}
      </li>
    </ul>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.stage {
  border-radius: 14px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line);
  overflow: hidden;
}

.stage svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 260px;
}

.lamp {
  fill: var(--lamp);
  filter: drop-shadow(0 0 6px rgba(255, 210, 138, 0.7));
}

.pot {
  fill: #23282f;
  stroke: var(--line-strong);
}

.soil {
  stroke: #5a4632;
  stroke-width: 3;
  stroke-linecap: round;
}

.el {
  transform-box: view-box;
  transition: transform 720ms var(--ease-out), opacity 480ms ease;
}

.stage.before .el {
  transition-duration: 260ms;
}

.stem {
  fill: none;
  stroke: #7fcf5a;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fan {
  fill: #5fb04a;
  stroke: #9be36b;
  stroke-width: 0.6;
}

.bud ellipse {
  fill: #c9a2ff;
  filter: drop-shadow(0 0 4px rgba(201, 162, 255, 0.6));
}

.bud path {
  fill: none;
  stroke: #e6d6ff;
  stroke-width: 1;
  stroke-linecap: round;
}

.tie {
  fill: none;
  stroke: var(--lamp);
  stroke-width: 1.6;
  stroke-dasharray: 3 3;
}

.cut {
  fill: none;
  stroke: var(--lamp);
  stroke-width: 2.2;
  stroke-linecap: round;
}

.net {
  fill: none;
  stroke: var(--text-3);
  stroke-width: 1;
}

.mark {
  fill: none;
  stroke: var(--leaf);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.knot {
  fill: var(--lamp);
  stroke: #0b0d10;
  stroke-width: 2;
}

.controls {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.controls .segmented {
  flex: 1;
  min-width: 0;
}

.replay {
  min-height: 44px;
  flex-shrink: 0;
}

.when {
  margin-top: -4px;
}

@media (prefers-reduced-motion: reduce) {
  .el {
    transition-delay: 0ms !important;
  }
}
</style>
