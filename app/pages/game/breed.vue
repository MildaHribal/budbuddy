<script setup lang="ts">
import { NAME_MAX, POLLEN_PREFIX, previewCross, pollenSource, sanitizeStrainName, SEED_PREFIX } from '~~/shared/game/genetics'
import type { PlantSim, StrainDef } from '~~/shared/game/types'
import { BREED_LEVEL } from '~/utils/gameUi'
import { genomeRows, rangeRows } from '~/components/game/breed/traits'

const { t } = useI18n()
useHead({ title: () => t('gameBreed.title') })
const game = useGame()
const feedback = useGameFeedback()
const { notify } = useNotify()
const { state, version, ready, loadError } = game

const level = computed(() => state.value?.level ?? 1)
const locked = computed(() => level.value < BREED_LEVEL)

const plants = computed<PlantSim[]>(() => {
  void version.value
  return Object.values(state.value?.plants ?? {})
})
const strainName = (p: PlantSim) => p.label ?? game.strain(p.strainId)?.name ?? p.strainId
const mothers = computed(() => plants.value.filter(p => !p.dead && (p.stage === 'flower' || p.stage === 'ripening')))

const motherId = ref<string | null>(null)
const fatherId = ref<string | null>(null)
const name = ref('')
const touched = ref(false)
const result = ref<StrainDef | null>(null)

const mother = computed(() => mothers.value.find(p => p.id === motherId.value) ?? null)

interface FatherOption { id: string, label: string }
const fathers = computed<FatherOption[]>(() => {
  void version.value
  const s = state.value
  if (!s) return []
  const out: FatherOption[] = []
  if (mother.value?.hermed) out.push({ id: mother.value.id, label: t('gameBreed.self') })
  for (const p of plants.value) {
    if (p.hermed && !p.dead && p.id !== motherId.value) out.push({ id: p.id, label: t('gameBreed.hermed', { strain: strainName(p) }) })
  }
  for (const [key, n] of Object.entries(s.inventory)) {
    if (!key.startsWith(POLLEN_PREFIX) || n < 1) continue
    const src = pollenSource(s, key)
    if (src) out.push({ id: key, label: t('gameBreed.pack', { strain: src.label, n }) })
  }
  return out
})

watch(mothers, (list) => {
  if (!list.some(p => p.id === motherId.value)) motherId.value = list[0]?.id ?? null
}, { immediate: true })
watch(fathers, (list) => {
  if (!list.some(f => f.id === fatherId.value)) fatherId.value = list[0]?.id ?? null
}, { immediate: true })

const preview = computed(() => {
  const s = state.value
  if (!s || !mother.value || !fatherId.value) return null
  const father = pollenSource(s, fatherId.value)
  if (!father) return null
  const p = previewCross(mother.value.genome, father.genome)
  return { autoShare: p.kind.auto, rows: rangeRows(p.traits, p.kind.auto) }
})
const kindLine = computed(() => {
  const share = preview.value?.autoShare ?? 0
  if (share >= 1) return t('gameBreed.kind.auto')
  if (share <= 0) return t('gameBreed.kind.photo')
  return t('gameBreed.autoChance', { n: Math.round(share * 100) })
})

const cleanName = computed(() => sanitizeStrainName(name.value))
const nameInvalid = computed(() => touched.value && !cleanName.value)
const canBreed = computed(() => !!mother.value && !!preview.value && !!cleanName.value)

function breed() {
  touched.value = true
  const s = state.value
  if (!s || !canBreed.value || !motherId.value || !fatherId.value) return
  const before = s.customStrains.length
  const r = game.act({ t: 'breed', motherId: motherId.value, fatherId: fatherId.value, name: cleanName.value! })
  const made = state.value?.customStrains.length !== before ? state.value?.customStrains.at(-1) ?? null : null
  if (r.ok && made) {
    result.value = made
    name.value = ''
    touched.value = false
    return
  }
  if (r.ok) notify(t('gameBreed.failed'), { tone: 'error', duration: 4000 })
  else feedback(r)
}

const seedsOf = (id: string) => state.value?.inventory[`${SEED_PREFIX}${id}`] ?? 0
const own = computed(() => {
  void version.value
  return [...(state.value?.customStrains ?? [])].reverse()
})
</script>

<template>
  <div>
    <AppHeader
      :title="t('gameBreed.title')"
      :subtitle="t('gameBreed.subtitle')"
      back
    />
    <div class="page">
      <div
        v-if="!ready"
        class="skeleton"
        aria-busy="true"
      />

      <div
        v-else-if="loadError || !state"
        class="card notice"
        role="alert"
      >
        <p class="sub">
          {{ t('gameBreed.loadError') }}
        </p>
      </div>

      <template v-else>
        <p class="intro">
          {{ t('gameBreed.intro') }}
        </p>

        <div
          v-if="locked"
          class="card notice"
        >
          <p class="notice-title">
            {{ t('gameBreed.locked.title', { n: BREED_LEVEL }) }}
          </p>
          <p class="sub">
            {{ t('gameBreed.locked.text', { n: BREED_LEVEL }) }}
          </p>
        </div>

        <template v-else>
          <section
            v-if="result"
            class="card result"
            aria-live="polite"
          >
            <p class="result-title">
              {{ t('gameBreed.result.title', { name: result.name }) }}
            </p>
            <p class="sub">
              {{ t(`gameBreed.kind.${result.genome.kind}`) }}, {{ t('gameBreed.result.seeds', { n: seedsOf(result.id) }) }}
            </p>
            <GameBreedTraitBars :rows="genomeRows(result.genome)" />
            <div class="pair">
              <NuxtLink
                to="/game"
                class="btn btn-soft"
              >
                {{ t('gameBreed.result.sow') }}
              </NuxtLink>
              <button
                type="button"
                class="btn"
                @click="result = null"
              >
                {{ t('gameBreed.result.again') }}
              </button>
            </div>
          </section>

          <form
            v-else
            class="form-stack"
            novalidate
            @submit.prevent="breed"
          >
            <fieldset class="group">
              <legend class="section-title">
                {{ t('gameBreed.mother') }}
              </legend>
              <p class="hint">
                {{ t('gameBreed.motherHint') }}
              </p>
              <EmptyState
                v-if="!mothers.length"
                icon="flowering"
                :title="t('gameBreed.noMother')"
              />
              <div
                v-else
                class="card options"
              >
                <label
                  v-for="p in mothers"
                  :key="p.id"
                  class="option"
                >
                  <input
                    v-model="motherId"
                    type="radio"
                    name="mother"
                    :value="p.id"
                  >
                  <GameThumb
                    :visual="game.visual(p.id)"
                    :size="44"
                    :label="strainName(p)"
                  />
                  <span class="opt-text">{{ strainName(p) }}</span>
                </label>
              </div>
            </fieldset>

            <fieldset
              v-if="mothers.length"
              class="group"
            >
              <legend class="section-title">
                {{ t('gameBreed.father') }}
              </legend>
              <p class="hint">
                {{ t('gameBreed.fatherHint') }}
              </p>
              <div
                v-if="!fathers.length"
                class="card notice"
              >
                <p class="sub">
                  {{ t('gameBreed.noFather') }}
                </p>
                <NuxtLink
                  to="/game/shop"
                  class="btn btn-soft"
                >
                  {{ t('gameBreed.shop') }}
                </NuxtLink>
              </div>
              <div
                v-else
                class="card options"
              >
                <label
                  v-for="f in fathers"
                  :key="f.id"
                  class="option"
                >
                  <input
                    v-model="fatherId"
                    type="radio"
                    name="father"
                    :value="f.id"
                  >
                  <span class="opt-text">{{ f.label }}</span>
                </label>
              </div>
            </fieldset>

            <section
              v-if="preview"
              class="group"
            >
              <div class="section-head">
                <h2 class="section-title">
                  {{ t('gameBreed.preview') }}
                </h2>
              </div>
              <div class="card preview">
                <p class="kind">
                  {{ kindLine }}
                </p>
                <GameBreedTraitBars :rows="preview.rows" />
                <p class="hint">
                  {{ t('gameBreed.previewHint') }}
                </p>
              </div>
            </section>

            <template v-if="preview">
              <label class="field">
                <span class="field-label">{{ t('gameBreed.name') }}</span>
                <input
                  v-model="name"
                  class="input"
                  :class="{ invalid: nameInvalid }"
                  type="text"
                  :maxlength="NAME_MAX + 8"
                  autocomplete="off"
                  :placeholder="t('gameBreed.namePlaceholder')"
                  :aria-invalid="nameInvalid"
                  aria-describedby="breed-name-msg"
                  @blur="touched = !!name"
                >
                <span
                  id="breed-name-msg"
                  :class="nameInvalid ? 'field-error' : 'field-hint'"
                >{{ nameInvalid ? t('gameBreed.nameError') : t('gameBreed.nameHint') }}</span>
              </label>
              <button
                type="submit"
                class="btn btn-primary btn-block"
                :disabled="!canBreed"
              >
                {{ t('gameBreed.confirm') }}
              </button>
            </template>
          </form>
        </template>

        <section v-if="!locked">
          <div class="section-head">
            <h2 class="section-title">
              {{ t('gameBreed.mine') }}
            </h2>
          </div>
          <EmptyState
            v-if="!own.length"
            icon="seedling"
            :title="t('gameBreed.mineEmpty')"
          />
          <ul
            v-else
            class="card own"
          >
            <li
              v-for="s in own"
              :key="s.id"
              class="own-row"
            >
              <span class="own-text">
                <span class="own-name">{{ s.name }}</span>
                <span class="sub">{{ t(`gameBreed.kind.${s.genome.kind}`) }}</span>
              </span>
              <span class="stock num">{{ t('gameBreed.stock', { n: seedsOf(s.id) }) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  height: 320px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  50% { opacity: 0.55; }
}

.intro {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: var(--text-2);
  max-width: 60ch;
}

.notice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
}

.notice-title,
.result-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

legend {
  padding: 0;
  margin-bottom: 4px;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.45;
}

.options {
  padding: 0;
  overflow: hidden;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 6px 14px;
  border-top: 1px solid var(--line);
  cursor: pointer;
}

.option:first-child {
  border-top: 0;
}

.option:has(input:checked) {
  background: var(--accent-soft);
}

.option input {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  accent-color: var(--green);
}

.option input:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

.opt-text {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
}

.preview,
.result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.kind {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.own {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.own-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
}

.own-row:first-child {
  border-top: 0;
}

.own-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.own-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>
