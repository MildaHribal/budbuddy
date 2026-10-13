<script setup lang="ts">
// Stats: money and electricity per gram across runs.
import { formatMoney } from '~/utils/costs'

const { t } = useI18n()
const { costs, totals } = useCosts()

const cur = computed(() => costs.value.currency)
const spent = computed(() => costs.value.expenses.reduce((s, e) => s + e.amount, 0) + totals.value.reduce((s, r) => s + r.electricity, 0))
const kwhTotal = computed(() => totals.value.reduce((s, r) => s + r.kwh, 0))
const withYield = computed(() => totals.value.filter(r => r.costPerGram != null))
const grams = computed(() => withYield.value.reduce((s, r) => s + r.dryGrams, 0))
const costPerGram = computed(() => (grams.value ? withYield.value.reduce((s, r) => s + r.total, 0) / grams.value : null))
const bestGpw = computed(() => Math.max(0, ...totals.value.map(r => r.gramsPerWatt ?? 0)))
const has = computed(() => costs.value.expenses.length > 0 || totals.value.length > 0)
</script>

<template>
  <section class="card block">
    <div class="head">
      <h2 class="section-title">
        <GrowIcon
          name="lamp"
          class="lamp"
        /> {{ t('kit.costs.title') }}
      </h2>
      <NuxtLink
        to="/costs"
        class="link"
      >
        {{ has ? t('kit.costs.open') : t('kit.costs.start') }}
      </NuxtLink>
    </div>
    <dl
      v-if="has"
      class="grid"
    >
      <div>
        <dt>{{ t('kit.costs.spent') }}</dt>
        <dd class="num">
          {{ formatMoney(spent, cur) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('kit.costs.power') }}</dt>
        <dd class="num">
          {{ formatNumber(kwhTotal, 0) }} kWh
        </dd>
      </div>
      <div>
        <dt>{{ t('kit.costs.perGram') }}</dt>
        <dd class="num lamp">
          {{ costPerGram != null ? formatMoney(costPerGram, cur, 2) : '–' }}
        </dd>
      </div>
      <div>
        <dt>{{ t('kit.costs.gpw') }}</dt>
        <dd class="num">
          {{ bestGpw ? formatNumber(bestGpw, 2) : '–' }}
        </dd>
      </div>
    </dl>
    <p
      v-else
      class="empty"
    >
      {{ t('kit.costs.empty') }}
    </p>
  </section>
</template>

<style scoped>
.block {
  padding: 14px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.lamp {
  color: var(--amber);
}

.grid {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 12px;
}

.grid dt {
  font-size: 12px;
  color: var(--text-3);
}

.grid dd {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
}

.empty {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
</style>
