<script setup lang="ts">
type Where = 'old' | 'new' | 'tips' | 'canopy' | 'whole'
type Cause = 'N' | 'P' | 'K' | 'Ca' | 'Mg' | 'Fe' | 'S' | 'Zn' | 'nutrientBurn' | 'lightBurn' | 'overwater' | 'underwater' | 'lockout'
type Rank = 1 | 2 | 3

const { t } = useI18n()
const uid = useId()

const WHERE: Where[] = ['old', 'new', 'tips', 'canopy', 'whole']
const SYMPTOMS: Record<Where, Record<string, [Cause, Rank][]>> = {
  old: {
    yellowUniform: [['N', 1], ['overwater', 2], ['lockout', 3]],
    interveinal: [['Mg', 1], ['lockout', 2], ['K', 3]],
    brownEdges: [['K', 1], ['nutrientBurn', 2], ['lockout', 3]],
    purpleDark: [['P', 1], ['lockout', 2], ['Mg', 3]]
  },
  new: {
    paleNew: [['Fe', 1], ['lockout', 1], ['Zn', 3]],
    yellowNewUniform: [['S', 1], ['lockout', 2], ['Fe', 3]],
    spots: [['Ca', 1], ['lockout', 2], ['Mg', 3]],
    smallTwisted: [['Zn', 1], ['lockout', 2], ['Ca', 3]]
  },
  tips: {
    burntTips: [['nutrientBurn', 1], ['K', 2], ['lockout', 3]],
    clawDark: [['nutrientBurn', 1], ['overwater', 2]]
  },
  canopy: {
    bleached: [['lightBurn', 1], ['nutrientBurn', 3]],
    crispyTop: [['lightBurn', 1], ['underwater', 3]]
  },
  whole: {
    droopFat: [['overwater', 1], ['lockout', 3]],
    droopLimp: [['underwater', 1], ['overwater', 3]],
    mixed: [['lockout', 1], ['nutrientBurn', 2], ['overwater', 3]]
  }
}

const DEFICIENCY = new Set<Cause>(['N', 'P', 'K', 'Ca', 'Mg', 'Fe', 'S', 'Zn'])
function link(c: Cause): string {
  if (DEFICIENCY.has(c)) return '/guide/problems#problems-deficiencies'
  if (c === 'overwater' || c === 'underwater') return '/guide/media#media-watering'
  return '/guide/problems#problems-burn-lockout'
}

const where = ref<Where | null>(null)
const symptom = ref<string | null>(null)

const options = computed(() => (where.value ? Object.keys(SYMPTOMS[where.value]) : []))
const causes = computed(() => {
  if (!where.value || !symptom.value) return []
  return (SYMPTOMS[where.value][symptom.value] ?? []).map(([c, rank]) => ({ c, rank, href: link(c) }))
})

function pickWhere(w: Where) {
  if (where.value !== w) symptom.value = null
  where.value = w
}
function reset() {
  where.value = null
  symptom.value = null
}
</script>

<template>
  <div class="gw leaf">
    <div>
      <h3 class="gw-title">
        {{ t('guideWidgets.leaf.title') }}
      </h3>
      <p class="gw-sub">
        {{ t('guideWidgets.leaf.sub') }}
      </p>
    </div>

    <section
      class="step"
      :aria-labelledby="`${uid}-where`"
    >
      <h4
        :id="`${uid}-where`"
        class="step-q"
      >
        <span class="n num">1</span>{{ t('guideWidgets.leaf.whereQ') }}
      </h4>
      <div class="gw-chips">
        <button
          v-for="w in WHERE"
          :key="w"
          type="button"
          class="chip"
          :aria-pressed="where === w"
          @click="pickWhere(w)"
        >
          {{ t(`guideWidgets.leaf.where.${w}`) }}
        </button>
      </div>
      <p class="gw-hint">
        {{ t('guideWidgets.leaf.mobileHint') }}
      </p>
    </section>

    <Transition name="gw-fade">
      <section
        v-if="where"
        :key="where"
        class="step"
        :aria-labelledby="`${uid}-what`"
      >
        <h4
          :id="`${uid}-what`"
          class="step-q"
        >
          <span class="n num">2</span>{{ t('guideWidgets.leaf.whatQ') }}
        </h4>
        <div class="opts">
          <button
            v-for="s in options"
            :key="s"
            type="button"
            class="opt"
            :aria-pressed="symptom === s"
            @click="symptom = s"
          >
            <span
              class="radio"
              aria-hidden="true"
            />
            {{ t(`guideWidgets.leaf.sym.${s}`) }}
          </button>
        </div>
      </section>
    </Transition>

    <div aria-live="polite">
      <Transition
        name="gw-fade"
        mode="out-in"
      >
        <section
          v-if="causes.length"
          :key="`${where}-${symptom}`"
          class="step"
          :aria-labelledby="`${uid}-res`"
        >
          <h4
            :id="`${uid}-res`"
            class="step-q"
          >
            <span class="n num">3</span>{{ t('guideWidgets.leaf.resultsQ') }}
          </h4>
          <ol class="causes">
            <li
              v-for="(c, i) in causes"
              :key="c.c"
              class="cause"
              :class="`r${c.rank}`"
              :style="{ '--i': i }"
            >
              <div class="c-head">
                <span
                  class="meter"
                  aria-hidden="true"
                >
                  <span
                    v-for="b in 3"
                    :key="b"
                    :class="{ on: b <= 4 - c.rank }"
                  />
                </span>
                <span class="rank">{{ t(`guideWidgets.leaf.rank${c.rank}`) }}</span>
              </div>
              <p class="c-name">
                {{ t(`guideWidgets.leaf.cause.${c.c}.name`) }}
              </p>
              <p class="gw-text">
                {{ t(`guideWidgets.leaf.cause.${c.c}.why`) }}
              </p>
              <NuxtLink
                :to="c.href"
                class="link more"
              >
                {{ t('guideWidgets.leaf.read') }}
                <UIcon
                  name="i-tabler-chevron-right"
                  aria-hidden="true"
                />
              </NuxtLink>
            </li>
          </ol>
          <p class="first">
            {{ t('guideWidgets.leaf.first') }}
          </p>
        </section>
        <p
          v-else
          class="gw-hint"
        >
          {{ where ? t('guideWidgets.leaf.pickWhat') : t('guideWidgets.leaf.pickWhere') }}
        </p>
      </Transition>
    </div>

    <button
      v-if="where"
      type="button"
      class="btn btn-ghost reset"
      @click="reset"
    >
      <UIcon
        name="i-tabler-refresh"
        aria-hidden="true"
      />
      {{ t('guideWidgets.leaf.reset') }}
    </button>
  </div>
</template>

<style src="./widget.css"></style>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-q {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.n {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--surface-3);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.leaf .chip {
  flex: 1 1 auto;
  justify-content: center;
}

.opts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opt {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, background var(--dur-fast) ease, color var(--dur-fast) ease;
}

.opt[aria-pressed="true"] {
  border-color: transparent;
  background: var(--accent-soft);
  color: var(--text);
}

.radio {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--line-strong);
  transition: border var(--dur-fast) ease;
}

.opt[aria-pressed="true"] .radio {
  border: 6px solid var(--green);
}

.causes {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.cause {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  animation: cause-in var(--dur-slow) var(--ease-out) both;
  animation-delay: calc(var(--i) * 70ms);
}

.cause:first-child {
  border-top: 0;
  padding-top: 2px;
}

@keyframes cause-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.c-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meter {
  display: inline-flex;
  gap: 3px;
}

.meter span {
  width: 12px;
  height: 4px;
  border-radius: 2px;
  background: var(--track);
}

.r1 {
  --rc: var(--green);
}

.r2 {
  --rc: var(--amber);
}

.r3 {
  --rc: var(--text-3);
}

.meter span.on {
  background: var(--rc);
}

.rank {
  font-size: 12px;
  font-weight: 600;
  color: var(--rc);
}

.c-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
}

.first {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: var(--lamp-soft);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
}

.reset {
  align-self: flex-start;
  min-height: 44px;
}

@media (prefers-reduced-motion: reduce) {
  .cause {
    animation: none;
  }
}
</style>
