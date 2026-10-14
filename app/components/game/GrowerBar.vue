<script setup lang="ts">
import { xpForLevel } from '~~/shared/game/content/catalog'
import { xpProgress } from '~/utils/gameUi'

const props = defineProps<{ level: number, xp: number, coins: number }>()
const { t } = useI18n()

const progress = computed(() => xpProgress(props.xp, props.level, xpForLevel))
</script>

<template>
  <div class="card grower">
    <span
      class="lvl"
      aria-hidden="true"
    >
      <span class="lvl-num num">{{ level }}</span>
    </span>
    <div class="mid">
      <p class="lvl-title">
        {{ t('game.grower.level', { n: level }) }}
      </p>
      <div
        class="progress"
        role="progressbar"
        :aria-label="t('game.grower.xpLabel')"
        :aria-valuenow="progress.into"
        :aria-valuemin="0"
        :aria-valuemax="progress.span || progress.into"
      >
        <div :style="{ width: `${Math.round(progress.ratio * 100)}%` }" />
      </div>
      <p class="xp num">
        {{ progress.span ? t('game.grower.xp', { into: progress.into, span: progress.span }) : t('game.grower.xpMax') }}
      </p>
    </div>
    <div
      class="coins"
      :aria-label="t('game.grower.coinsLabel', { n: coins })"
    >
      <UIcon
        name="i-tabler-coin"
        class="coin-icon"
        aria-hidden="true"
      />
      <strong class="num">{{ coins }}</strong>
    </div>
  </div>
</template>

<style scoped>
.grower {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
}

.lvl {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  background: var(--accent-soft);
  color: var(--green);
}

.lvl-num {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lvl-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.xp {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.coins {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 14px;
  border-left: 1px solid var(--line);
  align-self: stretch;
}

.coin-icon {
  font-size: 20px;
  color: var(--text-2);
}

.coins strong {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
</style>
