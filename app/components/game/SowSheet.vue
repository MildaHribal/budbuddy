<script setup lang="ts">
import { EQUIPMENT, STRAINS } from '~~/shared/game/content/catalog'
import type { Medium } from '~~/shared/game/types'
import { gameText, potOptions, seedCount } from '~/utils/gameUi'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ tentId: string | null }>()
const { t } = useI18n()
const game = useGame()
const feedback = useGameFeedback()

const MEDIA: Medium[] = ['soil', 'coco', 'hydro']

const strainId = ref<string | null>(null)
const tentPick = ref<string | null>(null)
const medium = ref<Medium>('soil')
const potL = ref(11)

const seeds = computed(() => {
  void game.version.value
  const s = game.state.value
  if (!s) return []
  return [...STRAINS, ...s.customStrains]
    .map(def => ({ def, n: seedCount(s.inventory, def.id) }))
    .filter(x => x.n > 0)
})
const tents = computed(() => game.state.value?.tents ?? [])
const level = computed(() => game.state.value?.level ?? 1)

const potsFor = (m: Medium) => {
  void game.version.value
  const st = game.state.value
  return st ? potOptions(st, EQUIPMENT, m) : []
}
const media = computed(() => MEDIA.map((m) => {
  const opts = potsFor(m)
  const unlock = opts.length ? Math.min(...opts.map(o => o.unlock)) : Infinity
  return { m, unlock, open: unlock <= level.value }
}))
const pots = computed(() => potsFor(medium.value))
const pot = computed(() => pots.value.find(o => o.liters === potL.value) ?? null)
const needsPot = computed(() => !!pot.value && pot.value.free <= 0 && !!pot.value.id)

function pickMedium(m: Medium) {
  medium.value = m
  const open = pots.value.filter(o => o.unlock <= level.value)
  if (!open.some(o => o.liters === potL.value)) potL.value = (open.find(o => o.free > 0) ?? open[0])?.liters ?? potL.value
}

watch(open, (v) => {
  if (!v) return
  strainId.value = seeds.value[0]?.def.id ?? null
  tentPick.value = props.tentId ?? tents.value[0]?.id ?? null
  medium.value = 'soil'
  const open = pots.value.filter(o => o.unlock <= level.value)
  potL.value = (open.find(o => o.free > 0) ?? open.find(o => o.liters === 11) ?? open[0])?.liters ?? 11
})

function sow() {
  if (!strainId.value || !tentPick.value) return
  const name = seeds.value.find(x => x.def.id === strainId.value)?.def.name ?? ''
  if (needsPot.value && !feedback(game.act({ t: 'buy', itemId: pot.value!.id!, qty: 1 }))) return
  const r = game.act({ t: 'sow', strainId: strainId.value, tentId: tentPick.value, medium: medium.value, potL: potL.value })
  if (feedback(r, t('game.sow.done', { name }))) open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.sow.title')"
    icon="germination"
    icon-color="#d9c46b"
  >
    <div
      v-if="!seeds.length"
      class="none"
    >
      <p>{{ t('game.sow.noSeeds') }}</p>
      <NuxtLink
        to="/game/shop?tab=seeds"
        class="btn btn-soft"
        @click="open = false"
      >
        {{ t('game.sow.toShop') }}
      </NuxtLink>
    </div>
    <div
      v-else
      class="form-stack"
    >
      <fieldset class="field">
        <legend class="field-label">
          {{ t('game.sow.seed') }}
        </legend>
        <div class="options">
          <label
            v-for="x in seeds"
            :key="x.def.id"
            class="opt"
            :class="{ on: strainId === x.def.id }"
          >
            <input
              v-model="strainId"
              type="radio"
              name="sow-strain"
              :value="x.def.id"
              class="sr-only"
            >
            <span class="opt-text">
              <span class="opt-title">{{ x.def.name }}</span>
              <span class="opt-desc">{{ gameText(x.def.blurb) }}</span>
            </span>
            <span class="opt-meta num">{{ t('game.sow.left', { n: x.n }) }}</span>
          </label>
        </div>
      </fieldset>

      <label
        v-if="tents.length > 1"
        class="field"
      >
        <span class="field-label">{{ t('game.sow.tent') }}</span>
        <select
          v-model="tentPick"
          class="input"
        >
          <option
            v-for="(tent, i) in tents"
            :key="tent.id"
            :value="tent.id"
          >{{ t('game.tent.name', { n: i + 1 }) }}</option>
        </select>
      </label>

      <div class="field">
        <span
          id="sow-medium"
          class="field-label"
        >{{ t('game.sow.medium') }}</span>
        <div
          class="segmented"
          role="group"
          aria-labelledby="sow-medium"
        >
          <button
            v-for="x in media"
            :key="x.m"
            type="button"
            :aria-pressed="medium === x.m"
            :disabled="!x.open"
            @click="pickMedium(x.m)"
          >
            <UIcon
              v-if="!x.open"
              name="i-tabler-lock"
              class="size-4"
            />
            {{ t(`game.medium.${x.m}`) }}
          </button>
        </div>
        <span class="field-hint">{{ t(`game.sow.mediumHint.${medium}`) }}<template v-if="media.some(x => !x.open)">{{ ' ' + t('game.sow.mediumLocked', { n: Math.min(...media.filter(x => !x.open).map(x => x.unlock)) }) }}</template></span>
      </div>

      <div class="field">
        <span
          id="sow-pot"
          class="field-label"
        >{{ t('game.sow.pot') }}</span>
        <div
          class="chips"
          role="group"
          aria-labelledby="sow-pot"
        >
          <button
            v-for="o in pots"
            :key="o.liters"
            type="button"
            class="chip num"
            :aria-pressed="potL === o.liters"
            :disabled="o.unlock > level"
            @click="potL = o.liters"
          >
            {{ t('game.liters', { n: o.liters }) }}
          </button>
        </div>
        <span class="field-hint">{{ !pot?.id ? t('game.sow.potHint') : pot.free > 0 ? t('game.sow.potFree', { n: pot.free }) : t('game.sow.potBuy', { price: pot.price }) }}</span>
      </div>
    </div>

    <template
      v-if="seeds.length"
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
        :disabled="!strainId || !tentPick || !pot"
        @click="sow"
      >
        {{ t('game.sow.confirm') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.chip:disabled,
.segmented button:disabled {
  opacity: 0.4;
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  padding: 0;
  margin-bottom: 8px;
}

.none {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 8px;
}

.none p {
  margin: 0;
  color: var(--text-2);
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opt {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line-strong);
  cursor: pointer;
  transition: background var(--dur) ease, border-color var(--dur) ease;
}

.opt.on {
  background: var(--accent-soft);
  border-color: transparent;
}

.opt:has(:focus-visible) {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

.opt-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.opt-title {
  font-weight: 600;
}

.opt.on .opt-title {
  color: var(--green);
}

.opt-desc {
  font-size: 13px;
  color: var(--text-2);
}

.opt-meta {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>
