<script setup lang="ts">
import type { PlantSim } from '~~/shared/game/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: PlantSim }>()
const { t } = useI18n()
const game = useGame()
const feedback = useGameFeedback()

type Kind = 'top' | 'lst' | 'defoliate'
const options = computed(() => {
  const p = props.plant
  const veg = p.stage === 'veg'
  const flower = p.stage === 'flower'
  return ([
    {
      kind: 'top',
      ok: veg && p.nodes >= 4 && p.training.topped < 3,
      why: !veg ? t('game.train.topStage') : p.training.topped >= 3 ? t('game.train.topMax') : t('game.train.topNodes', { n: p.nodes }),
      done: p.training.topped ? t('game.train.topped', { n: p.training.topped }) : ''
    },
    { kind: 'lst', ok: (veg || flower) && !p.training.lst, why: p.training.lst ? t('game.train.lstOn') : t('game.train.lstStage'), done: '' },
    { kind: 'defoliate', ok: veg || flower || p.stage === 'ripening', why: t('game.train.defStage'), done: '' }
  ] as { kind: Kind, ok: boolean, why: string, done: string }[])
})

function train(kind: Kind) {
  if (feedback(game.act({ t: 'train', plantId: props.plant.id, kind }), t(`game.train.done.${kind}`))) open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.train.title')"
    icon="train"
    icon-color="var(--green)"
  >
    <ul class="card list">
      <li
        v-for="o in options"
        :key="o.kind"
        class="opt"
      >
        <span class="text">
          <span class="name">{{ t(`game.train.${o.kind}`) }}</span>
          <span class="desc">{{ t(`game.train.${o.kind}Desc`) }}</span>
          <span
            v-if="!o.ok || o.done"
            class="why"
          >{{ o.ok ? o.done : o.why }}</span>
        </span>
        <button
          type="button"
          class="btn btn-soft go"
          :disabled="!o.ok"
          @click="train(o.kind)"
        >
          {{ t(`game.train.${o.kind}Cta`) }}
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.opt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
}

.opt + .opt {
  border-top: 1px solid var(--line);
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
  line-height: 1.45;
}

.why {
  font-size: 12px;
  color: var(--text-3);
}

.go {
  flex-shrink: 0;
  padding: 0 16px;
}
</style>
