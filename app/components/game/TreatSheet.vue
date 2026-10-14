<script setup lang="ts">
import { TREATMENTS } from '~~/shared/game/content/catalog'
import type { PlantSim } from '~~/shared/game/types'
import { gameText } from '~/utils/gameUi'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: PlantSim }>()
const { t } = useI18n()
const game = useGame()
const feedback = useGameFeedback()

// free treatments are actions (raise the light, fan up); paid ones come from stock
const stock = computed(() => {
  void game.version.value
  const st = game.state.value
  const inv = st?.inventory ?? {}
  return TREATMENTS
    .filter(x => (inv[x.id] ?? 0) > 0 || (x.price === 0 && x.unlockLevel <= (st?.level ?? 1)))
    .map(x => ({ def: x, n: inv[x.id] ?? 0, free: x.price === 0 }))
    .sort((a, b) => Number(a.free) - Number(b.free))
})

function use(id: string, name: string) {
  if (feedback(game.act({ t: 'treat', plantId: props.plant.id, treatmentId: id }), t('game.treat.done', { name }))) open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.treat.title')"
    icon="pest"
    icon-color="#f0905a"
  >
    <p class="lead">
      {{ t('game.treat.lead') }}
    </p>
    <div
      v-if="!stock.some(x => !x.free)"
      class="none"
    >
      <p>{{ t('game.treat.none') }}</p>
      <NuxtLink
        to="/game/shop?tab=treatments"
        class="btn btn-soft"
        @click="open = false"
      >
        {{ t('game.treat.toShop') }}
      </NuxtLink>
    </div>
    <ul
      v-if="stock.length"
      class="card list"
    >
      <li
        v-for="x in stock"
        :key="x.def.id"
      >
        <button
          type="button"
          class="row"
          @click="use(x.def.id, gameText(x.def.name))"
        >
          <span class="text">
            <span class="name">{{ gameText(x.def.name) }}</span>
            <span class="desc">{{ gameText(x.def.blurb) }}</span>
          </span>
          <span class="meta num">{{ x.free ? t('game.treat.free') : t('game.treat.left', { n: x.n }) }}</span>
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.lead {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.none {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.none p {
  margin: 0;
  color: var(--text-2);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 14px;
  border: 0;
  background: none;
  text-align: left;
  border-radius: var(--radius);
  transition: background var(--dur) ease;
}

.row:active {
  background: var(--surface-2);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-weight: 600;
}

.desc {
  font-size: 13px;
  color: var(--text-2);
}

.meta {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>
