<script setup lang="ts">
import { PRODUCTS } from '~~/shared/game/content/catalog'
import type { FeedDose, PlantSim } from '~~/shared/game/types'
import { gameText } from '~/utils/gameUi'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: PlantSim }>()
const { t } = useI18n()
const game = useGame()
const feedback = useGameFeedback()

const RECIPE_KEY = 'budbuddy:game:last-recipe'
interface Recipe { ph: number, feed: FeedDose[], perPotL: number }

const liters = ref(1)
const ph = ref(6.5)
const doses = ref<Record<string, number>>({})

const maxL = computed(() => Math.max(1, Math.round(props.plant.potL * 0.6 * 10) / 10))
const defaultPh = computed(() => (props.plant.medium === 'soil' ? 6.5 : 5.8))

const owned = computed(() => {
  void game.version.value
  const inv = game.state.value?.inventory ?? {}
  return PRODUCTS.filter(p => (inv[p.id] ?? 0) > 0).map(p => ({ def: p, left: inv[p.id] ?? 0 }))
})
const feed = computed<FeedDose[]>(() => owned.value
  .map(o => ({ productId: o.def.id, mlPerL: doses.value[o.def.id] ?? 0 }))
  .filter(d => d.mlPerL > 0))
const ec = computed(() => feed.value.reduce((sum, d) => sum + (PRODUCTS.find(p => p.id === d.productId)?.ecPerMl ?? 0) * d.mlPerL, 0))
const isFeed = computed(() => feed.value.length > 0)

function readRecipe(): Recipe | null {
  try {
    const r = JSON.parse(localStorage.getItem(RECIPE_KEY) ?? 'null') as Recipe | null
    return r && Array.isArray(r.feed) ? r : null
  } catch {
    return null
  }
}
const recipe = ref<Recipe | null>(null)
const preset = ref<'plain' | 'last' | null>('plain')

function plain() {
  preset.value = 'plain'
  liters.value = Math.round(props.plant.potL * 0.25 * 10) / 10
  ph.value = defaultPh.value
  doses.value = {}
}

function last() {
  const r = recipe.value
  if (!r) return
  preset.value = 'last'
  ph.value = r.ph
  liters.value = Math.min(maxL.value, Math.round(r.perPotL * props.plant.potL * 10) / 10)
  doses.value = Object.fromEntries(r.feed.filter(d => owned.value.some(o => o.def.id === d.productId)).map(d => [d.productId, d.mlPerL]))
}

watch(open, (v) => {
  if (!v) return
  recipe.value = readRecipe()
  plain()
})

function step(id: string, delta: number) {
  preset.value = null
  const next = Math.max(0, Math.min(6, Math.round(((doses.value[id] ?? 0) + delta) * 10) / 10))
  doses.value = { ...doses.value, [id]: next }
}

const phHint = computed(() => t(`game.water.phHint.${props.plant.medium}`))

function submit() {
  const r = game.act({ t: 'water', plantId: props.plant.id, liters: liters.value, ph: ph.value, feed: feed.value })
  const ok = feedback(r, isFeed.value ? t('game.water.fed', { n: liters.value }) : t('game.water.watered', { n: liters.value }))
  if (!ok) return
  if (isFeed.value) {
    try {
      localStorage.setItem(RECIPE_KEY, JSON.stringify({ ph: ph.value, feed: feed.value, perPotL: liters.value / props.plant.potL }))
    } catch {
      // storage full: the preset is a convenience only
    }
  }
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.water.title')"
    icon="water"
    icon-color="var(--blue)"
  >
    <div class="form-stack">
      <div
        class="chips"
        role="group"
        :aria-label="t('game.water.presets')"
      >
        <button
          type="button"
          class="chip"
          :aria-pressed="preset === 'plain'"
          @click="plain"
        >
          {{ t('game.water.plain') }}
        </button>
        <button
          v-if="recipe"
          type="button"
          class="chip"
          :aria-pressed="preset === 'last'"
          @click="last"
        >
          {{ t('game.water.last') }}
        </button>
      </div>

      <GameRange
        v-model="liters"
        :label="t('game.water.amount')"
        :min="0.1"
        :max="maxL"
        :step="0.1"
        :display="t('game.liters', { n: liters })"
        tone="blue"
        :hint="t('game.water.amountHint', { pot: plant.potL })"
      />
      <GameRange
        v-model="ph"
        :label="t('game.water.ph')"
        :min="4.5"
        :max="8"
        :step="0.1"
        :display="ph.toFixed(1)"
        :hint="phHint"
      />

      <div class="field">
        <span class="field-label">{{ t('game.water.nutrients') }}</span>
        <p
          v-if="!owned.length"
          class="none"
        >
          {{ t('game.water.noNutrients') }}
          <NuxtLink
            to="/game/shop?tab=nutrients"
            class="link"
            @click="open = false"
          >{{ t('game.water.toShop') }}</NuxtLink>
        </p>
        <div
          v-else
          class="card doses"
        >
          <div
            v-for="o in owned"
            :key="o.def.id"
            class="dose"
          >
            <span class="dose-text">
              <span class="dose-name">{{ gameText(o.def.name) }}</span>
              <span class="dose-left num">{{ t('game.water.left', { n: Math.round(o.left) }) }}</span>
            </span>
            <span class="stepper">
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('game.water.less', { name: gameText(o.def.name) })"
                :disabled="!(doses[o.def.id] ?? 0)"
                @click="step(o.def.id, -0.5)"
              >
                <UIcon name="i-tabler-minus" />
              </button>
              <span
                class="dose-val num"
                aria-live="polite"
              >{{ t('game.water.mlPerL', { n: doses[o.def.id] ?? 0 }) }}</span>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('game.water.more', { name: gameText(o.def.name) })"
                @click="step(o.def.id, 0.5)"
              >
                <UIcon name="i-tabler-plus" />
              </button>
            </span>
          </div>
        </div>
        <span
          v-if="isFeed"
          class="field-hint num"
        >{{ t('game.water.ecEstimate', { ec: ec.toFixed(1) }) }}</span>
      </div>
    </div>

    <template #footer>
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
        @click="submit"
      >
        {{ isFeed ? t('game.water.feedCta', { n: liters }) : t('game.water.waterCta', { n: liters }) }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.none {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.doses {
  display: flex;
  flex-direction: column;
}

.dose {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  padding: 8px 8px 8px 14px;
}

.dose + .dose {
  border-top: 1px solid var(--line);
}

.dose-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dose-name {
  font-size: 14px;
  font-weight: 600;
}

.dose-left {
  font-size: 12px;
  color: var(--text-3);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stepper .icon-btn {
  background: var(--surface-2);
}

.stepper .icon-btn:disabled {
  opacity: 0.4;
}

.dose-val {
  min-width: 64px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
}
</style>
