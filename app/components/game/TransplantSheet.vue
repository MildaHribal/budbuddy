<script setup lang="ts">
import { EQUIPMENT } from '~~/shared/game/content/catalog'
import type { PlantSim } from '~~/shared/game/types'
import { potOptions } from '~/utils/gameUi'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: PlantSim }>()
const { t } = useI18n()
const game = useGame()
const feedback = useGameFeedback()

const level = computed(() => game.state.value?.level ?? 1)
const sizes = computed(() => {
  void game.version.value
  const st = game.state.value
  return st ? potOptions(st, EQUIPMENT, props.plant.medium).filter(o => o.liters > props.plant.potL) : []
})
const pick = ref<number | null>(null)
const pot = computed(() => sizes.value.find(o => o.liters === pick.value) ?? null)
const needsPot = computed(() => !!pot.value?.id && pot.value.free <= 0)
const allowed = computed(() => props.plant.medium !== 'hydro' && (props.plant.stage === 'seedling' || props.plant.stage === 'veg'))

watch(open, (v) => {
  if (v) pick.value = (sizes.value.find(o => o.free > 0 && o.unlock <= level.value) ?? sizes.value.find(o => o.unlock <= level.value))?.liters ?? null
})

function go() {
  if (!pick.value) return
  if (needsPot.value && !feedback(game.act({ t: 'buy', itemId: pot.value!.id!, qty: 1 }))) return
  if (feedback(game.act({ t: 'transplant', plantId: props.plant.id, potL: pick.value }), t('game.transplant.done', { n: pick.value }))) open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.transplant.title')"
    icon="i-tabler-arrows-maximize"
    icon-color="var(--text-2)"
  >
    <p class="lead">
      {{ allowed ? t('game.transplant.lead', { n: plant.potL }) : plant.medium === 'hydro' ? t('game.transplant.hydro') : t('game.transplant.late') }}
    </p>
    <div
      v-if="allowed && sizes.length"
      class="chips"
      role="group"
      :aria-label="t('game.transplant.size')"
    >
      <button
        v-for="o in sizes"
        :key="o.liters"
        type="button"
        class="chip num"
        :aria-pressed="pick === o.liters"
        :disabled="o.unlock > level"
        @click="pick = o.liters"
      >
        {{ t('game.liters', { n: o.liters }) }}
      </button>
    </div>
    <p
      v-if="allowed && pot?.id"
      class="hint"
    >
      {{ pot.free > 0 ? t('game.sow.potFree', { n: pot.free }) : t('game.transplant.potBuy', { price: pot.price }) }}
    </p>
    <p
      v-else-if="allowed"
      class="lead"
    >
      {{ t('game.transplant.biggest') }}
    </p>
    <template
      v-if="allowed && sizes.length"
      #footer
    >
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!pick"
        @click="go"
      >
        {{ t('game.transplant.cta', { n: pick ?? 0 }) }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.chip:disabled {
  opacity: 0.4;
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.lead {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
