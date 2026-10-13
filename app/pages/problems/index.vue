<script setup lang="ts">
import { PROBLEMS, type ProblemCategory } from '~/utils/problems'
import { CATEGORIES, searchProblems } from '~/utils/problems/atlas'

const { t } = useI18n()
useHead({ title: () => t('problems.title') })

const query = ref('')
const category = ref<ProblemCategory | null>(null)

// only categories that have content get a chip
const categories = computed(() => CATEGORIES.filter(c => PROBLEMS.some(p => p.category === c)))
const list = computed(() => searchProblems(PROBLEMS, query.value)
  .filter(p => !category.value || p.category === category.value))

function clear() {
  query.value = ''
  category.value = null
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('problems.title')"
      :subtitle="t('problems.subtitle')"
      back
    />

    <div
      v-if="!PROBLEMS.length"
      class="page"
    >
      <EmptyState
        icon="pest"
        :title="t('problems.emptyTitle')"
        :text="t('problems.emptyText')"
      />
    </div>

    <div
      v-else
      class="page rise"
    >
      <ProblemsProblemChecker />

      <section aria-labelledby="atlas-h">
        <div class="section-head">
          <h2
            id="atlas-h"
            class="section-title"
          >
            {{ t('problems.browse') }}
          </h2>
          <span class="section-meta num">{{ t('problems.count', { n: list.length }) }}</span>
        </div>

        <div class="controls">
          <label class="search">
            <UIcon
              name="i-tabler-search"
              class="search-icon"
            />
            <input
              v-model="query"
              class="input"
              type="search"
              enterkeyhint="search"
              autocomplete="off"
              :placeholder="t('problems.search')"
              :aria-label="t('problems.search')"
            >
          </label>
          <div
            class="chips filter-row"
            role="group"
            :aria-label="t('problems.browse')"
          >
            <button
              type="button"
              class="chip"
              :aria-pressed="!category"
              @click="category = null"
            >
              {{ t('problems.all') }}
            </button>
            <button
              v-for="c in categories"
              :key="c"
              type="button"
              class="chip"
              :aria-pressed="category === c"
              @click="category = category === c ? null : c"
            >
              {{ t(`problems.categories.${c}`) }}
            </button>
          </div>
        </div>

        <div
          v-if="list.length"
          class="list"
        >
          <ProblemsProblemCard
            v-for="p in list"
            :key="p.id"
            :problem="p"
          />
        </div>
        <EmptyState
          v-else
          icon="i-tabler-search"
          :title="t('problems.noResultsTitle')"
          :text="t('problems.noResultsText')"
        >
          <button
            type="button"
            class="btn btn-soft"
            @click="clear"
          >
            {{ t('problems.clear') }}
          </button>
        </EmptyState>
      </section>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.search {
  position: relative;
  display: block;
}

.search .input {
  padding-left: 42px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 18px;
  pointer-events: none;
}

.filter-row {
  margin: 0 -16px;
  padding: 0 16px 2px;
}

.filter-row .chip {
  min-height: 44px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
