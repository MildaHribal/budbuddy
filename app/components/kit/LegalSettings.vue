<script setup lang="ts">
// Settings: country for the home-grow limits watcher.
import type { LegalCountry } from '~/types/kit'

const { t } = useI18n()
const legal = useLegal()
const country = computed(() => legal.legal.value.country)
const OPTIONS: (LegalCountry | null)[] = ['cz', 'de', null]
</script>

<template>
  <section aria-labelledby="h-legal">
    <div class="section-head">
      <h2
        id="h-legal"
        class="section-title"
      >
        {{ t('kit.legal.settingsTitle') }}
      </h2>
    </div>
    <div class="card pad">
      <div
        class="segmented"
        role="group"
        aria-labelledby="h-legal"
      >
        <button
          v-for="c in OPTIONS"
          :key="String(c)"
          type="button"
          :aria-pressed="country === c"
          @click="legal.update({ country: c })"
        >
          {{ t(`kit.legal.countries.${c ?? 'none'}`) }}
        </button>
      </div>
      <p class="hint">
        {{ t('kit.legal.settingsHint') }}
        <NuxtLink
          to="/legal"
          class="link"
        >
          {{ t('kit.legal.details') }}
        </NuxtLink>
      </p>
    </div>
  </section>
</template>

<style scoped>
.pad {
  padding: 14px;
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}

.hint .link {
  font-size: 12px;
  padding: 0;
}
</style>
