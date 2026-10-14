<script setup lang="ts">
import type { PlantSim } from '~~/shared/game/types'
import { ripenessKey } from '~/utils/gameUi'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: PlantSim, name: string }>()
const { t } = useI18n()
const game = useGame()
const feedback = useGameFeedback()

const look = computed(() => ripenessKey(props.plant.ripeness))
const early = computed(() => look.value === 'clear')

function harvest() {
  if (!feedback(game.act({ t: 'harvest', plantId: props.plant.id }), t('game.harvest.done', { name: props.name }))) return
  open.value = false
  navigateTo('/game/dry')
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.harvest.title')"
    icon="harvest"
    icon-color="var(--amber)"
  >
    <div class="look">
      <p class="look-title">
        {{ t('game.harvest.lookTitle') }}
      </p>
      <p>{{ t(`game.harvest.look.${look}`) }}</p>
    </div>
    <p class="lead">
      {{ early ? t('game.harvest.early') : t('game.harvest.lead') }}
    </p>
    <NuxtLink
      to="/guide/harvest"
      class="link"
    >
      {{ t('game.harvest.guide') }}
    </NuxtLink>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('game.harvest.wait') }}
      </button>
      <button
        type="button"
        class="btn"
        :class="early ? 'btn-lamp' : 'btn-primary'"
        @click="harvest"
      >
        {{ early ? t('game.harvest.ctaEarly') : t('game.harvest.cta') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.look {
  padding: 14px;
  border-radius: var(--radius);
  background: var(--lamp-soft);
}

.look p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.look .look-title {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--amber);
}

.lead {
  margin: 14px 0 8px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
