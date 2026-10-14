<script setup lang="ts">
import type { Problem, ProblemCategory } from '~/utils/problems'
import { DIAGNOSIS_REWARD } from '~~/shared/game/content/catalog'
import type { PlantSim, ProblemId } from '~~/shared/game/types'
import { gameText } from '~/utils/gameUi'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: PlantSim }>()
const { t } = useI18n()
const game = useGame()

const atlas = shallowRef<{ problems: Problem[], categories: ProblemCategory[], search: (list: readonly Problem[], q: string) => Problem[] } | null>(null)
const failed = ref(false)
const query = ref('')
const picked = ref<string | null>(null)
const result = ref<{ ok: boolean, text: string, id: string } | null>(null)

async function loadAtlas() {
  if (atlas.value) return
  failed.value = false
  try {
    const [{ PROBLEMS }, { CATEGORIES, searchProblems }] = await Promise.all([import('~/utils/problems'), import('~/utils/problems/atlas')])
    atlas.value = { problems: PROBLEMS, categories: CATEGORIES, search: searchProblems }
  } catch (e) {
    console.error('[Game] atlas did not load', e)
    failed.value = true
  }
}

watch(open, (v) => {
  if (!v) return
  query.value = ''
  picked.value = null
  result.value = null
  loadAtlas()
})

const groups = computed(() => {
  const a = atlas.value
  if (!a) return []
  const list = query.value.trim() ? a.search(a.problems, query.value) : a.problems
  return a.categories
    .map(cat => ({ cat, items: list.filter(p => p.category === cat) }))
    .filter(g => g.items.length)
})

const pickedName = computed(() => atlas.value?.problems.find(p => p.id === picked.value)?.name ?? '')

function submit() {
  if (!picked.value) return
  const id = picked.value
  const r = game.act({ t: 'diagnose', plantId: props.plant.id, problemId: id as ProblemId })
  const data = (r.ok ? r.data : null) as { correct?: boolean, bonus?: boolean } | null
  const correct = r.ok && data?.correct !== false
  const fallback = !r.ok
    ? t(`game.reason.${r.reason}`)
    : correct
      ? (data?.bonus ? t('game.diagnose.rightBonus', { name: pickedName.value, coins: DIAGNOSIS_REWARD.coins, xp: DIAGNOSIS_REWARD.xp }) : t('game.diagnose.right', { name: pickedName.value }))
      : t('game.diagnose.wrong')
  result.value = { ok: correct, text: r.message ? gameText(r.message) : fallback, id }
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.diagnose.title')"
    icon="i-tabler-stethoscope"
    icon-color="var(--green)"
  >
    <div
      v-if="result"
      class="result"
      :class="result.ok ? 'ok' : 'bad'"
      role="status"
    >
      <UIcon
        :name="result.ok ? 'i-tabler-circle-check' : 'i-tabler-circle-x'"
        class="result-icon"
      />
      <div class="result-text">
        <p class="result-title">
          {{ result.ok ? t('game.diagnose.rightTitle') : t('game.diagnose.wrongTitle') }}
        </p>
        <p>{{ result.text }}</p>
        <NuxtLink
          :to="`/problems/${result.id}`"
          class="link"
        >
          {{ t('game.diagnose.read', { name: pickedName }) }}
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <p class="lead">
        {{ t('game.diagnose.lead') }}
      </p>
      <div
        v-if="failed"
        class="state"
        role="alert"
      >
        <p>{{ t('game.diagnose.failed') }}</p>
        <button
          type="button"
          class="btn"
          @click="loadAtlas"
        >
          {{ t('game.error.retry') }}
        </button>
      </div>
      <p
        v-else-if="!atlas"
        class="state"
        aria-busy="true"
      >
        {{ t('game.diagnose.loading') }}
      </p>
      <template v-else>
        <input
          v-model="query"
          class="input search"
          type="search"
          autocomplete="off"
          enterkeyhint="search"
          :placeholder="t('game.diagnose.search')"
          :aria-label="t('game.diagnose.search')"
        >
        <p
          v-if="!groups.length"
          class="state"
        >
          {{ t('game.diagnose.noMatch') }}
        </p>
        <div
          v-for="g in groups"
          :key="g.cat"
          class="group"
          role="radiogroup"
          :aria-label="t(`problems.categories.${g.cat}`)"
        >
          <h3>{{ t(`problems.categories.${g.cat}`) }}</h3>
          <div class="card list">
            <div
              v-for="p in g.items"
              :key="p.id"
              class="item"
            >
              <button
                type="button"
                role="radio"
                class="pick"
                :aria-checked="picked === p.id"
                @click="picked = p.id"
              >
                <span
                  class="dot"
                  aria-hidden="true"
                />
                <span class="pick-text">
                  <span class="pick-name">{{ p.name }}</span>
                  <span class="pick-sum">{{ p.summary }}</span>
                </span>
              </button>
              <NuxtLink
                :to="`/problems/${p.id}`"
                class="study icon-btn"
                :aria-label="t('game.diagnose.study', { name: p.name })"
              >
                <UIcon name="i-tabler-book" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </template>

    <template #footer>
      <template v-if="result">
        <button
          v-if="!result.ok"
          type="button"
          class="btn"
          @click="result = null; picked = null"
        >
          {{ t('game.diagnose.again') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="open = false"
        >
          {{ t('game.diagnose.close') }}
        </button>
      </template>
      <button
        v-else
        type="button"
        class="btn btn-primary"
        :disabled="!picked"
        @click="submit"
      >
        {{ picked ? t('game.diagnose.cta', { name: pickedName }) : t('game.diagnose.pickFirst') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.lead {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.state {
  margin: 0;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--text-2);
  font-size: 14px;
}

.state p {
  margin: 0;
}

.search {
  margin-bottom: 16px;
}

.group + .group {
  margin-top: 16px;
}

h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 6px;
}

.item + .item {
  border-top: 1px solid var(--line);
}

.pick {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 56px;
  padding: 12px 8px 12px 14px;
  border: 0;
  background: none;
  text-align: left;
}

.dot {
  position: relative;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  border: 2px solid var(--line-strong);
  transition: border-color var(--dur) ease;
}

.pick[aria-checked="true"] .dot {
  border-color: var(--green);
}

.pick[aria-checked="true"] .dot::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--green);
}

.pick-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pick-name {
  font-weight: 600;
  font-size: 15px;
}

.pick[aria-checked="true"] .pick-name {
  color: var(--green);
}

.pick-sum {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.study {
  color: var(--text-2);
  border-color: transparent;
  background: transparent;
}

.result {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius);
}

.result.ok {
  background: var(--accent-soft);
}

.result.bad {
  background: var(--danger-soft);
}

.result-icon {
  flex-shrink: 0;
  font-size: 28px;
}

.result.ok .result-icon {
  color: var(--green);
}

.result.bad .result-icon {
  color: var(--red);
}

.result-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.result-text p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
}

.result-text .result-title {
  font-size: 16px;
  font-weight: 600;
}
</style>
