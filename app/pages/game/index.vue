<script setup lang="ts">
import { EQUIPMENT, JOURNAL_BONUS, STRAINS } from '~~/shared/game/content/catalog'
import type { Tent } from '~~/shared/game/types'
import { gameText, seedCount } from '~/utils/gameUi'

const { t } = useI18n()
useHead({ title: () => t('game.title') })
useGameClock()
const game = useGame()
const { notify } = useNotify()

const sowOpen = ref(false)
const sowTent = ref<string | null>(null)
const tentOpen = ref(false)
const tentId = ref<string | null>(null)
const settingsOpen = ref(false)

// shallow copy per version: the sim mutates in place, so the same object would not re-render
const s = computed(() => {
  void game.version.value
  const st = game.state.value
  return st ? { ...st } : null
})

const clock = computed(() => {
  const h = s.value?.nowH ?? 0
  return t('game.clock', { day: Math.floor(h / 24) + 1, time: `${String(Math.floor(h % 24)).padStart(2, '0')}:00` })
})

const firstRun = computed(() => !!s.value && !Object.keys(s.value.plants).length && !s.value.history.length)
const hasSeeds = computed(() => !!s.value && [...STRAINS, ...s.value.customStrains].some(x => seedCount(s.value!.inventory, x.id) > 0))

const tents = computed(() => (s.value?.tents ?? []).map((tent, i) => ({
  tent,
  index: i,
  name: tentName(tent, i),
  plants: tent.plantIds.map(id => s.value!.plants[id]).filter(p => !!p && p.stage !== 'harvested').map(p => ({ ...p! }))
})))

function tentName(tent: Tent, i: number) {
  const def = EQUIPMENT.find(e => e.id === tent.tentItem)
  return def ? gameText(def.name) : t('game.tent.name', { n: i + 1 })
}

function openSow(id: string | null) {
  sowTent.value = id
  sowOpen.value = true
}

function openTent(id: string) {
  tentId.value = id
  tentOpen.value = true
}

onBeforeUnmount(() => game.markEventsRead())

onMounted(async () => {
  await Promise.all([initGrow(), initGame()])
  const { state } = useGrow()
  const names = game.claimJournalBonus(state.plants, state.entries)
  if (names.length) notify(t('game.bonus.toast', { n: JOURNAL_BONUS.coins * names.length }), { icon: 'harvest', duration: 6000 })
})
</script>

<template>
  <div>
    <AppHeader
      :title="t('game.title')"
      :subtitle="s ? clock : undefined"
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('game.settings.title')"
          @click="settingsOpen = true"
        >
          <UIcon name="i-tabler-settings" />
        </button>
      </template>
    </AppHeader>

    <GameGate>
      <div
        v-if="s"
        class="page rise"
      >
        <GameGrowerBar
          :level="s.level"
          :xp="s.xp"
          :coins="s.coins"
        />

        <EmptyState
          v-if="firstRun"
          icon="tent"
          :title="t('game.first.title')"
          :text="t('game.first.text')"
        >
          <button
            type="button"
            class="btn btn-primary"
            @click="openSow(null)"
          >
            {{ t('game.first.cta') }}
          </button>
        </EmptyState>

        <template v-else>
          <section
            v-for="row in tents"
            :key="row.tent.id"
            :aria-labelledby="`tent-${row.tent.id}`"
          >
            <div class="section-head">
              <h2
                :id="`tent-${row.tent.id}`"
                class="section-title"
              >
                {{ row.name }}
              </h2>
              <button
                type="button"
                class="link tent-light"
                :aria-label="t('game.tent.openSettings', { name: row.name })"
                @click="openTent(row.tent.id)"
              >
                <UIcon
                  :name="row.tent.env.lightsOn ? 'i-tabler-sun' : 'i-tabler-sun-off'"
                  class="size-4"
                />
                <span class="num">{{ t('game.tent.schedule', { on: row.tent.lightHours, off: 24 - row.tent.lightHours }) }}</span>
              </button>
            </div>
            <div class="plants">
              <GamePlantCard
                v-for="p in row.plants"
                :key="p!.id"
                :plant="p!"
              />
              <div
                v-if="!row.plants.length"
                class="card tent-empty"
              >
                <p>{{ t('game.tent.empty') }}</p>
              </div>
              <button
                v-if="hasSeeds"
                type="button"
                class="btn btn-soft btn-block"
                @click="openSow(row.tent.id)"
              >
                <GrowIcon name="germination" />
                {{ t('game.tent.sow') }}
              </button>
              <NuxtLink
                v-else-if="!row.plants.length"
                to="/game/shop?tab=seeds"
                class="btn btn-soft btn-block"
              >
                {{ t('game.tent.buySeeds') }}
              </NuxtLink>
            </div>
          </section>
        </template>

        <GameEventFeed
          v-if="!firstRun || s.events.length"
          :events="s.events"
          @read-all="game.markEventsRead()"
        />

        <GameEntryList :state="s" />
      </div>
    </GameGate>

    <GameSowSheet
      v-model:open="sowOpen"
      :tent-id="sowTent"
    />
    <GameTentSheet
      v-model:open="tentOpen"
      :tent-id="tentId"
    />
    <GameSettingsSheet v-model:open="settingsOpen" />
  </div>
</template>

<style scoped>
.plants {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tent-light {
  gap: 6px;
  color: var(--text-2);
}

.tent-empty {
  padding: 16px 14px;
}

.tent-empty p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
</style>
