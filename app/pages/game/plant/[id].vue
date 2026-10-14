<script setup lang="ts">
import { SCANNER_PRICE } from '~~/shared/game/content/catalog'
import { flowerProgress } from '~~/shared/game/sim'
import type { ProblemPhase } from '~~/shared/game/types'
import { gameText, plantStatus, STAGE_STYLE } from '~/utils/gameUi'

const route = useRoute()
const { t } = useI18n()
const { confirm } = useConfirm()
useGameClock()
const game = useGame()
const feedback = useGameFeedback()

const id = computed(() => String(route.params.id))
const plant = computed(() => {
  void game.version.value
  const p = game.state.value?.plants[id.value]
  return p ? { ...p } : null
})
const name = computed(() => (plant.value ? plant.value.label || game.strain(plant.value.strainId)?.name || t('game.plant.unknownStrain') : ''))
useHead({ title: () => name.value || t('game.title') })

const obs = computed(() => {
  void game.version.value
  return plant.value ? game.observe(plant.value.id) : null
})
const visual = computed(() => {
  void game.version.value
  return plant.value ? game.visual(plant.value.id) : null
})
const status = computed(() => (plant.value ? plantStatus(plant.value, obs.value, game.forecasts.value, game.state.value?.nowH ?? 0) : null))
const stage = computed(() => (plant.value ? STAGE_STYLE[plant.value.stage] : null))
const alive = computed(() => !!plant.value && !plant.value.dead && plant.value.stage !== 'dead' && plant.value.stage !== 'harvested')
// the sim refuses a harvest before 30 % of flowering
const canHarvest = computed(() => alive.value && (plant.value!.stage === 'flower' || plant.value!.stage === 'ripening') && (flowerProgress(plant.value!, game.state.value!.nowH) ?? 0) >= 0.3)
const ripe = computed(() => canHarvest.value && plant.value!.stage === 'ripening')

const readings = computed(() => obs.value?.readings ?? {})
const hasRoot = computed(() => readings.value.ph != null || readings.value.ec != null)
const hasAir = computed(() => readings.value.tempC != null || readings.value.rh != null)
const readingRows = computed(() => {
  const r = readings.value
  return [
    { key: 'ph', v: r.ph, fmt: (n: number) => n.toFixed(1) },
    { key: 'ec', v: r.ec, fmt: (n: number) => n.toFixed(1) },
    { key: 'potWater', v: r.potWater, fmt: (n: number) => `${Math.round(n * 100)} %` },
    { key: 'temp', v: r.tempC, fmt: (n: number) => `${n.toFixed(1)} °C` },
    { key: 'rh', v: r.rh, fmt: (n: number) => `${Math.round(n)} %` },
    { key: 'vpd', v: r.vpd, fmt: (n: number) => `${n.toFixed(2)} kPa` },
    { key: 'ppfd', v: r.ppfd, fmt: (n: number) => `${Math.round(n)}` }
  ].filter(x => x.v != null).map(x => ({ key: x.key, text: x.fmt(x.v!) }))
})

const PHASE_TONE: Record<Exclude<ProblemPhase, 'hidden'>, string> = { subtle: 'var(--text-2)', clear: 'var(--amber)', severe: 'var(--red)' }

const credits = computed(() => game.state.value?.inventory['scanner-credit'] ?? 0)
const trainNote = computed(() => {
  const tr = plant.value?.training
  if (!tr) return ''
  const parts = [tr.topped ? t('game.train.topped', { n: tr.topped }) : '', tr.lst ? t('game.train.lstOn') : ''].filter(Boolean)
  return parts.join(', ')
})

const sheet = ref<'water' | 'treat' | 'train' | 'transplant' | 'diagnose' | 'harvest' | 'scan' | null>(null)
function sheetModel(k: NonNullable<typeof sheet.value>) {
  return computed({
    get: () => sheet.value === k,
    set: (v: boolean) => {
      sheet.value = v ? k : null
    }
  })
}
const waterOpen = sheetModel('water')
const treatOpen = sheetModel('treat')
const trainOpen = sheetModel('train')
const transplantOpen = sheetModel('transplant')
const diagnoseOpen = sheetModel('diagnose')
const harvestOpen = sheetModel('harvest')
const scanOpen = sheetModel('scan')

async function flush() {
  if (!plant.value) return
  const yes = await confirm({ title: t('game.flush.title'), message: t('game.flush.text', { n: plant.value.potL * 3 }), confirmLabel: t('game.flush.cta') })
  if (yes) feedback(game.act({ t: 'flush', plantId: plant.value.id }), t('game.flush.done'))
}

interface ScanHit { id: string, phase?: string }
const scanHits = ref<ScanHit[]>([])
const scanText = ref('')
const atlasNames = ref<Record<string, string>>({})

function readScan(data: unknown): ScanHit[] {
  const list = Array.isArray(data) ? data : (data as { problems?: unknown })?.problems
  if (!Array.isArray(list)) return []
  return list
    .map(x => (typeof x === 'string' ? { id: x } : x as ScanHit))
    .filter(x => x && typeof x.id === 'string')
}

async function scan() {
  if (!plant.value || !game.state.value) return
  const have = credits.value
  const yes = await confirm({
    title: t('game.scan.title'),
    message: have > 0
      ? t('game.scan.useCredit', { n: have })
      : t('game.scan.buy', { price: SCANNER_PRICE, coins: game.state.value.coins }),
    confirmLabel: have > 0 ? t('game.scan.cta') : t('game.scan.buyCta', { price: SCANNER_PRICE })
  })
  if (!yes) return
  if (have <= 0 && !feedback(game.act({ t: 'buy', itemId: 'scanner-credit', qty: 1 }))) return
  const r = game.act({ t: 'scan', plantId: plant.value.id })
  if (!r.ok) {
    feedback(r)
    return
  }
  scanHits.value = readScan(r.data)
  scanText.value = r.message ? gameText(r.message) : ''
  if (scanHits.value.length) {
    const { getProblem } = await import('~/utils/problems')
    atlasNames.value = Object.fromEntries(scanHits.value.map(h => [h.id, getProblem(h.id)?.name ?? h.id]))
  }
  sheet.value = 'scan'
}

async function cull() {
  if (!plant.value) return
  const yes = await confirm({ title: t('game.cull.title', { name: name.value }), message: t('game.cull.text'), confirmLabel: t('game.cull.cta'), danger: true })
  if (!yes) return
  if (feedback(game.act({ t: 'cull', plantId: plant.value.id }), t('game.cull.done'))) navigateTo('/game', { replace: true })
}
</script>

<template>
  <div>
    <AppHeader
      :title="name || t('game.title')"
      :subtitle="plant && stage ? t('game.plant.headerSub', { n: obs?.ageDays ?? 0, stage: t(`game.stage.${stage.key}`) }) : undefined"
      back
    />

    <GameGate>
      <div
        v-if="!plant"
        class="page"
      >
        <EmptyState
          icon="tent"
          :title="t('game.plant.missingTitle')"
          :text="t('game.plant.missingText')"
        >
          <NuxtLink
            to="/game"
            class="btn btn-soft"
          >
            {{ t('game.plant.backToTents') }}
          </NuxtLink>
        </EmptyState>
      </div>

      <div
        v-else
        class="page rise"
      >
        <div class="card hero">
          <GameThumb
            :visual="visual"
            :size="248"
            :label="t('game.plant.renderLabel', { name })"
            :framed="false"
          />
          <div class="hero-foot">
            <span
              v-if="stage"
              class="badge"
              :style="{ color: stage.color }"
            >{{ t(`game.stage.${stage.key}`) }}</span>
            <span
              v-if="status"
              class="status"
              :class="status.tone"
            >{{ t(`game.status.${status.key}`, { n: status.n ?? 0 }) }}</span>
          </div>
        </div>

        <button
          v-if="ripe"
          type="button"
          class="btn btn-lamp btn-block"
          @click="sheet = 'harvest'"
        >
          <GrowIcon name="harvest" />
          {{ t('game.actions.harvestRipe') }}
        </button>

        <section aria-labelledby="see-h">
          <div class="section-head">
            <h2
              id="see-h"
              class="section-title"
            >
              {{ t('game.see.title') }}
            </h2>
          </div>
          <ul class="card see">
            <li
              v-if="obs"
              class="see-row"
            >
              <span class="see-icon water">
                <GrowIcon name="water" />
              </span>
              <span class="see-text">{{ t(`game.see.pot.${obs.potFeel}`) }}</span>
            </li>
            <template v-if="obs?.signs.length">
              <li
                v-for="sign in obs.signs"
                :key="sign.key"
                class="see-row"
              >
                <span
                  class="see-icon"
                  :style="{ color: PHASE_TONE[sign.phase] }"
                >
                  <UIcon name="i-tabler-eye" />
                </span>
                <span class="see-text">
                  <span
                    v-for="(line, i) in sign.lines"
                    :key="i"
                    class="see-line"
                  >{{ gameText(line) }}</span>
                  <span
                    class="see-phase"
                    :style="{ color: PHASE_TONE[sign.phase] }"
                  >{{ t(`game.see.phase.${sign.phase}`) }}</span>
                </span>
              </li>
            </template>
            <li
              v-else-if="obs && alive"
              class="see-row"
            >
              <span class="see-icon ok">
                <UIcon name="i-tabler-eye" />
              </span>
              <span class="see-text">{{ t('game.see.clean') }}</span>
            </li>
            <li
              v-if="!obs"
              class="see-row"
            >
              <span class="see-text muted">{{ t('game.see.unavailable') }}</span>
            </li>
          </ul>

          <div
            v-if="readingRows.length"
            class="card readings"
          >
            <div
              v-for="r in readingRows"
              :key="r.key"
              class="reading"
            >
              <span class="r-label">{{ t(`game.see.reading.${r.key}`) }}</span>
              <span class="r-value num">{{ r.text }}</span>
            </div>
          </div>
          <div
            v-if="!hasRoot || !hasAir"
            class="meters"
          >
            <p v-if="!hasRoot">
              {{ t('game.see.noPhPen') }}
            </p>
            <p v-if="!hasAir">
              {{ t('game.see.noHygro') }}
            </p>
            <NuxtLink
              to="/game/shop?tab=gear"
              class="link"
            >
              {{ t('game.see.toShop') }}
            </NuxtLink>
          </div>
        </section>

        <section
          v-if="alive"
          aria-labelledby="act-h"
        >
          <div class="section-head">
            <h2
              id="act-h"
              class="section-title"
            >
              {{ t('game.actions.title') }}
            </h2>
          </div>
          <button
            type="button"
            class="btn btn-block water-btn"
            @click="sheet = 'water'"
          >
            <GrowIcon name="water" />
            {{ t('game.actions.water') }}
          </button>
          <nav
            class="card actions"
            :aria-label="t('game.actions.title')"
          >
            <button
              type="button"
              class="act"
              @click="sheet = 'diagnose'"
            >
              <span class="act-tile green"><UIcon name="i-tabler-stethoscope" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.diagnose') }}</span>
                <span class="act-desc">{{ t('game.actions.diagnoseDesc') }}</span>
              </span>
            </button>
            <button
              type="button"
              class="act"
              @click="sheet = 'treat'"
            >
              <span class="act-tile pest"><GrowIcon name="pest" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.treat') }}</span>
                <span class="act-desc">{{ t('game.actions.treatDesc') }}</span>
              </span>
            </button>
            <button
              type="button"
              class="act"
              @click="flush"
            >
              <span class="act-tile water"><UIcon name="i-tabler-bucket-droplet" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.flush') }}</span>
                <span class="act-desc">{{ t('game.actions.flushDesc') }}</span>
              </span>
            </button>
            <button
              type="button"
              class="act"
              @click="sheet = 'train'"
            >
              <span class="act-tile green"><GrowIcon name="train" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.train') }}</span>
                <span class="act-desc">{{ trainNote || t('game.actions.trainDesc') }}</span>
              </span>
            </button>
            <button
              type="button"
              class="act"
              @click="sheet = 'transplant'"
            >
              <span class="act-tile neutral"><UIcon name="i-tabler-arrows-maximize" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.transplant') }}</span>
                <span class="act-desc num">{{ t('game.actions.transplantDesc', { n: plant.potL, medium: t(`game.medium.${plant.medium}`) }) }}</span>
              </span>
            </button>
            <button
              type="button"
              class="act"
              @click="scan"
            >
              <span class="act-tile neutral"><UIcon name="i-tabler-scan" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.scan') }}</span>
                <span class="act-desc num">{{ credits ? t('game.actions.scanCredits', { n: credits }) : t('game.actions.scanPrice', { price: SCANNER_PRICE }) }}</span>
              </span>
            </button>
            <button
              v-if="canHarvest && !ripe"
              type="button"
              class="act"
              @click="sheet = 'harvest'"
            >
              <span class="act-tile amber"><GrowIcon name="harvest" /></span>
              <span class="act-text">
                <span class="act-title">{{ t('game.actions.harvest') }}</span>
                <span class="act-desc">{{ t('game.actions.harvestDesc') }}</span>
              </span>
            </button>
          </nav>
        </section>

        <div
          v-else-if="plant.stage === 'harvested'"
          class="card note"
        >
          <p>{{ t('game.plant.harvestedText') }}</p>
          <NuxtLink
            to="/game/dry"
            class="link"
          >
            {{ t('game.plant.toDry') }}
          </NuxtLink>
        </div>

        <button
          v-if="plant.stage !== 'harvested'"
          type="button"
          class="btn btn-ghost cull"
          @click="cull"
        >
          {{ alive ? t('game.cull.button') : t('game.cull.remove') }}
        </button>
      </div>

      <template v-if="plant && alive">
        <GameWaterSheet
          v-model:open="waterOpen"
          :plant="plant"
        />
        <GameTreatSheet
          v-model:open="treatOpen"
          :plant="plant"
        />
        <GameTrainSheet
          v-model:open="trainOpen"
          :plant="plant"
        />
        <GameTransplantSheet
          v-model:open="transplantOpen"
          :plant="plant"
        />
        <GameDiagnoseSheet
          v-model:open="diagnoseOpen"
          :plant="plant"
        />
        <GameHarvestSheet
          v-model:open="harvestOpen"
          :plant="plant"
          :name="name"
        />
      </template>
      <BottomSheet
        v-model:open="scanOpen"
        :title="t('game.scan.resultTitle')"
        icon="i-tabler-scan"
        icon-color="var(--text-2)"
      >
        <p
          v-if="scanText"
          class="scan-text"
        >
          {{ scanText }}
        </p>
        <ul
          v-if="scanHits.length"
          class="card scan-list"
        >
          <li
            v-for="h in scanHits"
            :key="h.id"
          >
            <NuxtLink
              :to="`/problems/${h.id}`"
              class="scan-row"
            >
              <span class="scan-name">{{ atlasNames[h.id] ?? h.id }}</span>
              <span
                v-if="h.phase"
                class="scan-phase"
              >{{ t(`game.see.phase.${h.phase}`) }}</span>
              <UIcon
                name="i-tabler-chevron-right"
                class="size-5 go"
              />
            </NuxtLink>
          </li>
        </ul>
        <p
          v-else-if="!scanText"
          class="scan-text"
        >
          {{ t('game.scan.clean') }}
        </p>
        <p class="scan-hint">
          {{ t('game.scan.hint') }}
        </p>
      </BottomSheet>
    </GameGate>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 16px 14px;
  background: var(--well);
}

.hero-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.status {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
}

.status.ok {
  color: var(--green);
}

.status.soon {
  color: var(--amber);
}

.status.now,
.status.dead {
  color: var(--red);
}

.see {
  margin: 0;
  padding: 0;
  list-style: none;
}

.see-row {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
}

.see-row + .see-row {
  border-top: 1px solid var(--line);
}

.see-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--text-2);
}

.see-icon.water {
  color: var(--blue);
}

.see-icon.ok {
  color: var(--green);
}

.see-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 15px;
  line-height: 1.45;
}

.see-phase {
  font-size: 12px;
  font-weight: 600;
}

.readings {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 1px;
  margin-top: 10px;
  overflow: hidden;
  background: var(--line);
}

.reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--surface);
}

.r-label {
  font-size: 12px;
  color: var(--text-3);
}

.r-value {
  font-size: 17px;
  font-weight: 600;
}

.meters {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-top: 10px;
  padding: 0 2px;
}

.meters p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.water-btn {
  margin-bottom: 10px;
  background: color-mix(in srgb, var(--blue) 14%, var(--surface));
  border-color: transparent;
  color: var(--blue);
}

.water-btn .grow-icon {
  font-size: 20px;
}

.actions {
  display: flex;
  flex-direction: column;
}

.act {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 14px;
  border: 0;
  background: none;
  text-align: left;
  transition: background var(--dur) ease;
}

.act + .act {
  border-top: 1px solid var(--line);
}

.act:first-child {
  border-radius: var(--radius) var(--radius) 0 0;
}

.act:last-child {
  border-radius: 0 0 var(--radius) var(--radius);
}

.act:active {
  background: var(--surface-2);
}

.act-tile {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, var(--surface));
  font-size: 22px;
}

.act-tile.green {
  color: var(--green);
}

.act-tile.pest {
  color: #f0905a;
}

.act-tile.water {
  color: var(--blue);
}

.act-tile.amber {
  color: var(--amber);
}

.act-tile.neutral {
  color: var(--text-2);
}

.act-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.act-title {
  font-size: 15px;
  font-weight: 600;
}

.act-desc {
  font-size: 13px;
  color: var(--text-2);
}

.note {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
}

.note p {
  margin: 0;
  font-size: 14px;
  color: var(--text-2);
}

.cull {
  align-self: center;
  color: var(--red);
}

.scan-text,
.scan-hint {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
}

.scan-hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.scan-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.scan-list li + li {
  border-top: 1px solid var(--line);
}

.scan-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 8px 12px 8px 14px;
  color: inherit;
  text-decoration: none;
}

.scan-name {
  flex: 1;
  font-weight: 600;
}

.scan-phase {
  font-size: 12px;
  color: var(--amber);
  font-weight: 600;
}

.go {
  color: var(--text-3);
}
</style>
