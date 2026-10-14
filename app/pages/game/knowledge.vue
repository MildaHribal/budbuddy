<script setup lang="ts">
import type { Problem } from '~/utils/problems'
import { pct } from '~/utils/gameUi'

const { t } = useI18n()
useHead({ title: () => t('game.knowledge.title') })
useGameClock()
const game = useGame()

// shallow copy per version: the sim mutates in place, so the same object would not re-render
const s = computed(() => {
  void game.version.value
  const st = game.state.value
  return st ? { ...st } : null
})

const atlas = shallowRef<((id: string) => Problem | undefined) | null>(null)
const atlasFailed = ref(false)
async function loadAtlas() {
  atlasFailed.value = false
  try {
    atlas.value = (await import('~/utils/problems')).getProblem
  } catch (e) {
    console.error('[Game] atlas did not load', e)
    atlasFailed.value = true
  }
}
onMounted(loadAtlas)

const learned = computed(() => (s.value?.knowledge ?? []).map(id => ({ id, problem: atlas.value?.(id) })))
const harvests = computed(() => [...(s.value?.history ?? [])].sort((a, b) => b.atH - a.atH))

const PARTS = ['yield', 'density', 'terpenes', 'cleanliness', 'ripeness', 'cure'] as const
const nameOf = (h: { label?: string, strainId: string }) => h.label || game.strain(h.strainId)?.name || t('game.plant.unknownStrain')
const qualityTone = (q: number) => (q >= 80 ? 'var(--green)' : q >= 55 ? 'var(--amber)' : 'var(--red)')
</script>

<template>
  <div>
    <AppHeader
      :title="t('game.knowledge.title')"
      :subtitle="t('game.knowledge.subtitle')"
      back
    />

    <GameGate>
      <div
        v-if="s"
        class="page rise"
      >
        <section aria-labelledby="k-learned">
          <div class="section-head">
            <h2
              id="k-learned"
              class="section-title"
            >
              {{ t('game.knowledge.learned') }}
            </h2>
            <span class="section-meta num">{{ learned.length }}</span>
          </div>
          <EmptyState
            v-if="!learned.length"
            icon="i-tabler-stethoscope"
            :title="t('game.knowledge.noneTitle')"
            :text="t('game.knowledge.noneText')"
          />
          <div
            v-else-if="atlasFailed"
            class="card note"
            role="alert"
          >
            <p>{{ t('game.diagnose.failed') }}</p>
            <button
              type="button"
              class="btn"
              @click="loadAtlas"
            >
              {{ t('game.error.retry') }}
            </button>
          </div>
          <nav
            v-else
            class="card rows"
            :aria-label="t('game.knowledge.learned')"
          >
            <NuxtLink
              v-for="k in learned"
              :key="k.id"
              :to="`/problems/${k.id}`"
              class="row"
            >
              <span class="row-text">
                <span class="row-title">{{ k.problem?.name ?? (atlas ? k.id : t('game.diagnose.loading')) }}</span>
                <span
                  v-if="k.problem"
                  class="row-desc"
                >{{ k.problem.summary }}</span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="size-5 go"
              />
            </NuxtLink>
          </nav>
        </section>

        <section aria-labelledby="k-harvests">
          <div class="section-head">
            <h2
              id="k-harvests"
              class="section-title"
            >
              {{ t('game.knowledge.harvests') }}
            </h2>
            <span class="section-meta num">{{ harvests.length }}</span>
          </div>
          <EmptyState
            v-if="!harvests.length"
            icon="harvest"
            :title="t('game.knowledge.noHarvestTitle')"
            :text="t('game.knowledge.noHarvestText')"
          />
          <div
            v-else
            class="harvests"
          >
            <article
              v-for="h in harvests"
              :key="`${h.plantId}-${h.atH}`"
              class="card harvest"
            >
              <header class="h-head">
                <div>
                  <h3>{{ nameOf(h) }}</h3>
                  <p class="h-sub num">
                    {{ t('game.knowledge.harvestSub', { day: Math.floor(h.atH / 24) + 1, g: Math.round(h.dryG), coins: h.coins, xp: h.xp }) }}
                  </p>
                </div>
                <div
                  class="q"
                  :style="{ color: qualityTone(h.quality) }"
                >
                  <strong class="num">{{ Math.round(h.quality) }}</strong>
                  <span>{{ t('game.knowledge.quality') }}</span>
                </div>
              </header>
              <dl class="parts">
                <div
                  v-for="part in PARTS"
                  :key="part"
                  class="part"
                >
                  <dt>{{ t(`game.knowledge.part.${part}`) }}</dt>
                  <dd>
                    <span
                      class="bar"
                      aria-hidden="true"
                    ><span :style="{ width: `${pct(h.breakdown[part])}%` }" /></span>
                    <span class="num">{{ pct(h.breakdown[part]) }}</span>
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </div>
    </GameGate>
  </div>
</template>

<style scoped>
.rows {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 10px 14px;
  color: inherit;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title {
  font-weight: 600;
}

.row-desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}

.note {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
}

.note p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
}

.harvests {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.harvest {
  padding: 14px;
}

.h-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.h-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.q {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.q strong {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.q span {
  font-size: 12px;
  color: var(--text-3);
}

.parts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.part {
  min-width: 0;
}

dt {
  font-size: 12px;
  color: var(--text-3);
}

dd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
}

.bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--green);
}
</style>
