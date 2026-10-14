<script setup lang="ts">
import type { PlantSim } from '~~/shared/game/types'
import { plantStatus, STAGE_STYLE } from '~/utils/gameUi'

const props = defineProps<{ plant: PlantSim }>()
const { t } = useI18n()
const game = useGame()

const name = computed(() => props.plant.label || game.strain(props.plant.strainId)?.name || t('game.plant.unknownStrain'))
const obs = computed(() => {
  void game.version.value
  return game.observe(props.plant.id)
})
const visual = computed(() => {
  void game.version.value
  return game.visual(props.plant.id)
})
const status = computed(() => plantStatus(props.plant, obs.value, game.forecasts.value, game.state.value?.nowH ?? 0))
const stage = computed(() => STAGE_STYLE[props.plant.stage])
</script>

<template>
  <NuxtLink
    :to="`/game/plant/${plant.id}`"
    class="card gplant"
  >
    <GameThumb
      :visual="visual"
      :size="72"
      :label="t('game.plant.renderLabel', { name })"
    />
    <span class="body">
      <span class="name">{{ name }}</span>
      <span class="top">
        <span
          class="badge"
          :style="{ color: stage.color }"
        >{{ t(`game.stage.${stage.key}`) }}</span>
        <span class="sub num">{{ t('game.plant.daySub', { n: obs?.ageDays ?? 0, pot: plant.potL, medium: t(`game.medium.${plant.medium}`) }) }}</span>
      </span>
      <span
        class="status"
        :class="status.tone"
      >{{ t(`game.status.${status.key}`, { n: status.n ?? 0 }) }}</span>
    </span>
    <UIcon
      name="i-tabler-chevron-right"
      class="size-5 go"
    />
  </NuxtLink>
</template>

<style scoped>
.gplant {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.gplant:active {
  transform: scale(0.985);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.name {
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  font-size: 13px;
  color: var(--text-2);
}

.status {
  font-size: 12px;
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

.go {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
