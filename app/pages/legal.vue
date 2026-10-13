<script setup lang="ts">
import type { LegalCountry } from '~/types/kit'
import { LEGAL_CHECKED, LEGAL_RULES } from '~/utils/legal'

const { t } = useI18n()
useHead({ title: () => t('manage.legal.title') })
const legal = useLegal()

const country = computed(() => legal.legal.value.country)
const rule = computed(() => (country.value ? LEGAL_RULES[country.value] : null))
const status = legal.status

function setCountry(c: LegalCountry | null) {
  legal.update({ country: c })
}
function setAdults(n: number) {
  legal.update({ adults: Math.min(10, Math.max(1, n)) })
}

const pct = (v: number, max: number) => Math.min(100, (v / Math.max(1, max)) * 100)
const tone = (level: string) => (level === 'over' ? 'var(--red)' : level === 'near' ? 'var(--amber)' : 'var(--green)')

function onStored(plantId: string, v: string) {
  const n = Number(v.replace(',', '.'))
  if (v.trim() === '' || !Number.isFinite(n) || n < 0) return
  legal.setStored(plantId, n)
}

const COUNTRIES: (LegalCountry | null)[] = ['cz', 'de', null]
const ruleKeys = computed(() => (country.value === 'cz' ? ['a', 'b', 'c', 'd', 'e', 'f'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g']))
</script>

<template>
  <div>
    <AppHeader
      :title="t('manage.legal.title')"
      :subtitle="t('manage.legal.subtitle')"
      back
    />
    <div class="page rise">
      <p class="card disclaimer">
        <UIcon
          name="i-tabler-info-circle"
          class="size-5 info"
        />
        <span>{{ t('kit.legal.disclaimer', { date: formatDate(LEGAL_CHECKED) }) }}</span>
      </p>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('manage.legal.country') }}
          </h2>
        </div>
        <div
          class="segmented"
          role="group"
          :aria-label="t('manage.legal.country')"
        >
          <button
            v-for="c in COUNTRIES"
            :key="String(c)"
            type="button"
            :aria-pressed="country === c"
            @click="setCountry(c)"
          >
            {{ t(`kit.legal.countries.${c ?? 'none'}`) }}
          </button>
        </div>
      </section>

      <template v-if="rule && status">
        <section
          v-if="rule.perAdult"
          class="card pad adults"
        >
          <div>
            <strong>{{ t('manage.legal.adults') }}</strong>
            <span>{{ t('manage.legal.adultsHint', { age: rule.minAge }) }}</span>
          </div>
          <div class="stepper">
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('manage.legal.fewer')"
              :disabled="legal.legal.value.adults <= 1"
              @click="setAdults(legal.legal.value.adults - 1)"
            >
              <UIcon name="i-tabler-minus" />
            </button>
            <strong
              class="num"
              aria-live="polite"
            >{{ legal.legal.value.adults }}</strong>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('manage.legal.more')"
              :disabled="legal.legal.value.adults >= 10"
              @click="setAdults(legal.legal.value.adults + 1)"
            >
              <UIcon name="i-tabler-plus" />
            </button>
          </div>
        </section>

        <section class="card meters">
          <div class="meter">
            <div class="meter-top">
              <span>{{ t('manage.legal.plantsNow') }}</span>
              <strong
                class="num"
                :style="{ color: tone(status.plantLevel) }"
              >{{ status.plants }} / {{ status.plantLimit }}</strong>
            </div>
            <div
              class="progress"
              role="progressbar"
              :aria-valuenow="status.plants"
              aria-valuemin="0"
              :aria-valuemax="status.plantLimit"
              :aria-label="t('manage.legal.plantsNow')"
            >
              <div :style="{ width: `${pct(status.plants, status.plantLimit)}%`, background: tone(status.plantLevel) }" />
            </div>
          </div>
          <div class="meter">
            <div class="meter-top">
              <span>{{ t('manage.legal.gramsNow') }}</span>
              <strong
                class="num"
                :style="{ color: tone(status.gramLevel) }"
              >{{ status.grams }} / {{ status.gramLimit }} g</strong>
            </div>
            <div
              class="progress"
              role="progressbar"
              :aria-valuenow="status.grams"
              aria-valuemin="0"
              :aria-valuemax="status.gramLimit"
              :aria-label="t('manage.legal.gramsNow')"
            >
              <div :style="{ width: `${pct(status.grams, status.gramLimit)}%`, background: tone(status.gramLevel) }" />
            </div>
          </div>
          <p
            class="verdict"
            :style="{ color: tone(status.level) }"
          >
            {{ t(`kit.legal.level.${status.level}`) }}
          </p>
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('manage.legal.rulesTitle', { country: t(`kit.legal.countries.${rule.country}`) }) }}
            </h2>
            <span class="section-meta">{{ t('manage.legal.since', { date: formatDate(rule.since) }) }}</span>
          </div>
          <ul class="card rules">
            <li
              v-for="k in ruleKeys"
              :key="k"
            >
              {{ t(`manage.legal.rules.${rule.country}.${k}`) }}
            </li>
          </ul>
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('manage.legal.storedTitle') }}
            </h2>
          </div>
          <EmptyState
            v-if="!legal.stored.value.length"
            icon="curing"
            :title="t('manage.legal.noStoredTitle')"
            :text="t('manage.legal.noStoredText')"
          />
          <div
            v-else
            class="card list"
          >
            <div
              v-for="h in legal.stored.value"
              :key="h.plant.id"
              class="row"
            >
              <span class="row-text">
                <strong>{{ h.plant.name }}</strong>
                <span>{{ h.edited ? t('manage.legal.edited') : h.estimated ? t('manage.legal.estimated') : t('manage.legal.fullDry') }}</span>
              </span>
              <label class="grams">
                <span class="sr-only">{{ t('manage.legal.gramsLeft', { name: h.plant.name }) }}</span>
                <input
                  class="input num"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  :value="h.grams"
                  @change="onStored(h.plant.id, ($event.target as HTMLInputElement).value)"
                >
                <span aria-hidden="true">g</span>
              </label>
              <button
                v-if="h.edited"
                type="button"
                class="icon-btn"
                :aria-label="t('manage.legal.reset', { name: h.plant.name })"
                @click="legal.setStored(h.plant.id, null)"
              >
                <UIcon
                  name="i-tabler-arrow-back-up"
                  class="size-5"
                />
              </button>
            </div>
          </div>
          <p
            v-if="legal.stored.value.length"
            class="hint"
          >
            {{ t('manage.legal.storedHint') }}
          </p>
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('manage.legal.sources') }}
            </h2>
          </div>
          <nav class="card list">
            <a
              v-for="s in rule.sources"
              :key="s.url"
              :href="s.url"
              target="_blank"
              rel="noopener noreferrer"
              class="row source"
            >
              <span class="row-text">
                <strong>{{ s.label }}</strong>
                <span>{{ s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] }}</span>
              </span>
              <UIcon
                name="i-tabler-external-link"
                class="size-5 go"
              />
            </a>
          </nav>
        </section>
      </template>

      <EmptyState
        v-else
        icon="guide"
        :title="t('manage.legal.pickTitle')"
        :text="t('manage.legal.pickText')"
      />
    </div>
  </div>
</template>

<style scoped>
.pad {
  padding: 14px;
}

.disclaimer {
  margin: 0;
  padding: 12px 14px;
  display: flex;
  gap: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.info {
  flex-shrink: 0;
  color: var(--blue);
}

.adults {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.adults > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.adults strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper strong {
  min-width: 20px;
  text-align: center;
  font-size: 20px;
}

.meters {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.meter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meter-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 14px;
  color: var(--text-2);
}

.meter-top strong {
  font-size: 20px;
  font-weight: 600;
}

.verdict {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.rules {
  margin: 0;
  padding: 4px 14px;
  list-style: none;
}

.rules li {
  padding: 10px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.rules li + li {
  border-top: 1px solid var(--line);
}

.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
  color: inherit;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.source:active {
  background: var(--surface-2);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.row-text strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.grams {
  position: relative;
  width: 96px;
  flex-shrink: 0;
}

.grams .input {
  padding-right: 28px;
}

.grams > span:last-child {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-3);
  pointer-events: none;
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}
</style>
