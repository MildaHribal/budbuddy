<script setup lang="ts">
import type { CureJar, DryBatch } from '~~/shared/game/types'
import { READY_HI, batchOfJar, burpDue, cureBreakdown, gramsAt, nextBurpH } from '~~/shared/game/drying'
import type { CureResult } from '~~/shared/game/drying/view'
import { gameText } from '~/utils/gameUi'

const { t } = useI18n()
useHead({ title: () => t('gameDry.title') })
useGameClock()
const game = useGame()
const feedback = useGameFeedback()
const { confirm } = useConfirm()

const s = computed(() => {
  void game.version.value
  return game.state.value
})

// `s` keeps the same object between ticks, so lists read the version themselves
const batches = computed(() => {
  void game.version.value
  return (s.value?.drying ?? []).filter(b => !b.done).map(b => ({ ...b }))
})
const jars = computed(() => {
  void game.version.value
  return (s.value?.jars ?? []).filter(j => !j.done).map(j => ({ ...j }))
})

function nameOf(plantId: string, strainId: string) {
  const label = s.value?.plants[plantId]?.label
  return label || game.strain(strainId)?.name || t('gameDry.plantFallback')
}
const jarName = (jar: CureJar) => {
  const b = s.value && batchOfJar(s.value, jar)
  return nameOf(jar.plantId, b?.strainId ?? s.value?.plants[jar.plantId]?.strainId ?? '')
}

const climateOpen = ref(false)
const climateFor = ref<string | null>(null)
const climateBatch = computed<DryBatch | null>(() => batches.value.find(b => b.id === climateFor.value) ?? null)

function openClimate(id: string) {
  climateFor.value = id
  climateOpen.value = true
}

function setClimate(tempC: number, rh: number) {
  if (!climateFor.value) return
  feedback(game.act({ t: 'dry', batchId: climateFor.value, tempC, rh }), t('gameDry.toast.climate', { temp: formatNumber(tempC, 1), rh }))
}

async function toJars(b: DryBatch) {
  if (b.moisture > READY_HI) {
    const yes = await confirm({ title: t('gameDry.early.title'), message: t('gameDry.early.message'), confirmLabel: t('gameDry.early.confirm') })
    if (!yes) return
  }
  feedback(game.act({ t: 'jar', batchId: b.id }), t('gameDry.toast.jarred'))
}

const burpText = ref<Record<string, string>>({})
function burp(jar: CureJar) {
  const r = game.act({ t: 'burp', jarId: jar.id })
  if (r.ok) burpText.value = { ...burpText.value, [jar.id]: r.message ? gameText(r.message) : '' }
  else feedback(r)
}

const resultOpen = ref(false)
const result = ref<CureResult | null>(null)
function finish(jar: CureJar) {
  const st = s.value
  const b = st && batchOfJar(st, jar)
  if (!b) return
  // snapshot first: the engine may fold the jar into the harvest history right away
  const name = jarName(jar)
  const r = game.act({ t: 'finishCure', jarId: jar.id })
  if (!feedback(r)) return
  const data = (r.ok ? r.data : null) as { breakdown?: CureResult['breakdown'], dryG?: number } | null
  result.value = {
    name,
    breakdown: data?.breakdown ?? cureBreakdown(b, jar),
    dryG: data?.dryG ?? gramsAt(b)
  }
  resultOpen.value = true
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('gameDry.title')"
      :subtitle="s && (batches.length || jars.length) ? t('gameDry.subtitle', { a: batches.length, b: jars.length }) : undefined"
      back
    />

    <GameGate>
      <div
        v-if="s"
        class="page"
      >
        <EmptyState
          v-if="!batches.length && !jars.length"
          icon="drying"
          :title="t('gameDry.empty.title')"
          :text="t('gameDry.empty.text')"
        >
          <NuxtLink
            to="/game"
            class="btn btn-primary"
          >
            {{ t('gameDry.empty.cta') }}
          </NuxtLink>
        </EmptyState>

        <section
          v-if="batches.length"
          aria-labelledby="dry-line"
        >
          <div class="section-head">
            <h2
              id="dry-line"
              class="section-title"
            >
              {{ t('gameDry.line.title') }}
            </h2>
            <span class="section-meta">{{ t('gameDry.line.meta') }}</span>
          </div>
          <div class="list rise">
            <GameDryBatchCard
              v-for="b in batches"
              :key="b.id"
              :batch="b"
              :name="nameOf(b.plantId, b.strainId)"
              :now-h="s.nowH"
              @climate="openClimate(b.id)"
              @jar="toJars(b)"
            />
          </div>
        </section>

        <section
          v-if="jars.length"
          aria-labelledby="dry-jars"
        >
          <div class="section-head">
            <h2
              id="dry-jars"
              class="section-title"
            >
              {{ t('gameDry.jars.title') }}
            </h2>
            <span class="section-meta">{{ t('gameDry.jars.meta') }}</span>
          </div>
          <div class="list rise">
            <GameDryJarCard
              v-for="j in jars"
              :key="j.id"
              :jar="j"
              :name="jarName(j)"
              :now-h="s.nowH"
              :due="burpDue(s, j)"
              :next-burp-h="nextBurpH(s, j)"
              :feedback="burpText[j.id] ?? null"
              @burp="burp(j)"
              @finish="finish(j)"
            />
          </div>
        </section>
      </div>
    </GameGate>

    <GameDryClimateSheet
      v-model:open="climateOpen"
      :batch="climateBatch"
      @save="setClimate"
    />
    <GameDryResultSheet
      v-model:open="resultOpen"
      :result="result"
    />
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
