<script setup lang="ts">
import type { EntryType } from '~/types/grow'

const { t } = useI18n()
useHead({ title: () => t('stats.title') })

const { state } = useGrow()
const today = todayISO()

const photoCount = computed(() => state.entries.reduce((n, e) => n + e.photoIds.length, 0) + state.plants.filter(p => p.photoId).length)
const waterLitres = computed(() => state.entries
  .filter(e => e.type === 'water' || e.type === 'feed')
  .reduce((s, e) => s + (e.amountMl ?? 0), 0) / 1000)

// ── Activity chart ────────────────────────────────────────────────
type Range = 'week' | 'weeks'
const range = ref<Range>('week')

const bars = computed(() => {
  if (range.value === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      const value = state.entries.filter(e => e.date === d).length
      return { label: weekdayShort(d).slice(0, 2), value, hint: formatDate(d, { day: 'numeric', month: 'short' }), highlight: d === today }
    })
  }
  const thisMonday = weekOf(today)[0]!
  return Array.from({ length: 8 }, (_, i) => {
    const start = addDays(thisMonday, (i - 7) * 7)
    const end = addDays(start, 6)
    const value = state.entries.filter(e => e.date >= start && e.date <= end).length
    return { label: formatDate(start, { day: 'numeric', month: 'numeric' }), value, hint: t('stats.activity.weekOf', { date: formatDate(start, { day: 'numeric', month: 'short' }) }), highlight: i === 7 }
  })
})
const rangeTotal = computed(() => bars.value.reduce((s, b) => s + b.value, 0))

// ── By type ───────────────────────────────────────────────────────
const byType = computed(() => {
  const counts = new Map<EntryType, number>()
  for (const e of state.entries) counts.set(e.type, (counts.get(e.type) ?? 0) + 1)
  const max = Math.max(1, ...counts.values())
  return entryTypes()
    .filter(x => counts.get(x.type))
    .map(x => ({ ...x, count: counts.get(x.type)!, pct: (counts.get(x.type)! / max) * 100 }))
    .sort((a, b) => b.count - a.count)
})

// ── Streak ────────────────────────────────────────────────────────
const streak = computed(() => {
  const days = new Set(state.entries.map(e => e.date))
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
})

const STREAK_DAYS = 14
const streakDays = computed(() => {
  const days = new Set(state.entries.map(e => e.date))
  const runStart = addDays(days.has(today) ? today : addDays(today, -1), -(streak.value - 1))
  return Array.from({ length: STREAK_DAYS }, (_, i) => {
    const date = addDays(today, i - (STREAK_DAYS - 1))
    const lit = days.has(date)
    return { date, lit, run: lit && streak.value > 0 && date >= runStart, today: date === today }
  })
})
const litDays = computed(() => streakDays.value.filter(d => d.lit).length)

// ── Harvests ──────────────────────────────────────────────────────
const harvests = computed(() => state.plants
  .filter(p => p.harvest)
  .map(p => ({
    plant: p,
    harvest: p.harvest!,
    days: daysBetween(p.startDate, p.harvest!.date)
  }))
  .sort((a, b) => b.harvest.date.localeCompare(a.harvest.date)))

const dryTotal = computed(() => harvests.value.reduce((s, h) => s + (h.harvest.dryWeight ?? 0), 0))
const withDry = computed(() => harvests.value.filter(h => h.harvest.dryWeight))
const avgDry = computed(() => (withDry.value.length ? dryTotal.value / withDry.value.length : 0))
const avgDays = computed(() => (harvests.value.length ? harvests.value.reduce((s, h) => s + h.days, 0) / harvests.value.length : 0))
const maxDry = computed(() => Math.max(1, ...withDry.value.map(h => h.harvest.dryWeight!)))

// ── Strains ───────────────────────────────────────────────────────
const strains = computed(() => {
  const map = new Map<string, { name: string, plants: number, dry: number }>()
  for (const p of state.plants) {
    const key = (p.strain || t('stats.strains.unknown')).trim()
    const s = map.get(key.toLowerCase()) ?? { name: key, plants: 0, dry: 0 }
    s.plants++
    s.dry += p.harvest?.dryWeight ?? 0
    map.set(key.toLowerCase(), s)
  }
  return [...map.values()].sort((a, b) => b.dry - a.dry || b.plants - a.plants)
})

// ── Achievements ──────────────────────────────────────────────────
const achievements = computed(() => {
  const count = (type: EntryType) => state.entries.filter(e => e.type === type).length
  const a = (key: string, glyph: string, done: boolean) => ({ key, glyph, title: t(`stats.achievements.${key}.title`), text: t(`stats.achievements.${key}.text`), done })
  return [
    a('firstSeed', 'germination', state.plants.length >= 1),
    a('onFire', 'lamp', streak.value >= 7),
    a('diarist', 'note', state.entries.length >= 50),
    a('photographer', 'photo', photoCount.value >= 10),
    a('trainer', 'train', count('train') >= 5),
    a('gardener', 'plants', state.plants.length >= 5),
    a('firstHarvest', 'harvest', harvests.value.length >= 1),
    a('heavyHitter', 'curing', dryTotal.value >= 100)
  ]
})
const unlocked = computed(() => achievements.value.filter(a => a.done).length)
</script>

<template>
  <div>
    <AppHeader
      :title="t('stats.title')"
      :subtitle="t('stats.subtitle')"
      back
    />
    <div class="page rise">
      <section
        class="card ledger"
        :aria-label="t('stats.totals')"
      >
        <div class="figure">
          <strong class="big num">{{ state.plants.length }}</strong>
          <span>{{ t('stats.plants') }}</span>
          <small class="num">{{ t('stats.archived', { n: state.plants.filter(p => p.archived).length }) }}</small>
        </div>
        <div class="figure">
          <strong class="big num">{{ state.entries.length }}</strong>
          <span>{{ t('stats.entries') }}</span>
        </div>
        <div class="figure">
          <strong class="big num">{{ formatNumber(waterLitres, 1) }}<small>{{ t('stats.litre') }}</small></strong>
          <span>{{ t('stats.water') }}</span>
        </div>
      </section>

      <section class="card block">
        <div class="streak-head">
          <div>
            <h2 class="section-title">
              {{ t('stats.streak.title') }}
            </h2>
            <p class="section-meta">
              {{ t('stats.streak.meta', { lit: litDays, total: STREAK_DAYS }) }}
            </p>
          </div>
          <strong class="streak-value num">{{ streak }}<small>{{ t('stats.streak.unit', { n: streak }) }}</small></strong>
        </div>
        <div
          class="days"
          role="img"
          :aria-label="t('stats.streak.aria', { lit: litDays, total: STREAK_DAYS, streak: t('stats.days', { n: streak }) })"
        >
          <span
            v-for="d in streakDays"
            :key="d.date"
            class="day"
            :class="{ lit: d.lit, run: d.run, today: d.today }"
            :title="formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })"
          />
        </div>
        <div
          class="days-axis"
          aria-hidden="true"
        >
          <span>{{ formatDate(streakDays[0]!.date, { day: 'numeric', month: 'short' }) }}</span>
          <span>{{ t('stats.streak.today') }}</span>
        </div>
      </section>

      <section class="card block">
        <div class="section-head">
          <div>
            <h2 class="section-title">
              {{ t('stats.activity.title') }}
            </h2>
            <p class="section-meta num">
              {{ t('stats.activity.logged', { n: rangeTotal }) }}
            </p>
          </div>
          <div
            class="segmented small"
            role="group"
            :aria-label="t('stats.activity.title')"
          >
            <button
              type="button"
              :aria-pressed="range === 'week'"
              @click="range = 'week'"
            >
              {{ t('stats.activity.week') }}
            </button>
            <button
              type="button"
              :aria-pressed="range === 'weeks'"
              @click="range = 'weeks'"
            >
              {{ t('stats.activity.weeks') }}
            </button>
          </div>
        </div>
        <BarChart
          :bars="bars"
          :label="t(range === 'week' ? 'stats.activity.ariaWeek' : 'stats.activity.ariaWeeks', { n: rangeTotal })"
        />
      </section>

      <section
        v-if="byType.length"
        class="card block"
      >
        <h2 class="section-title block-title">
          {{ t('stats.byType') }}
        </h2>
        <ul class="types">
          <li
            v-for="ty in byType"
            :key="ty.type"
          >
            <span class="type-name">
              <GrowIcon
                :name="ty.glyph"
                class="type-glyph"
                :style="{ color: ty.color }"
              />
              {{ ty.label }}
            </span>
            <span class="meter"><span :style="{ width: `${ty.pct}%`, background: ty.color }" /></span>
            <span class="type-count num">{{ ty.count }}</span>
          </li>
        </ul>
      </section>

      <section class="card block">
        <h2 class="section-title block-title">
          {{ t('stats.harvests.title') }}
        </h2>
        <EmptyState
          v-if="!harvests.length"
          icon="harvest"
          :title="t('stats.harvests.emptyTitle')"
          :text="t('stats.harvests.emptyText')"
        />
        <template v-else>
          <div class="yield">
            <div class="yield-main">
              <strong class="num">{{ formatNumber(dryTotal, 0) }}<small>g</small></strong>
              <span>{{ t('stats.harvests.dryTotal') }}</span>
            </div>
            <div class="yield-side">
              <div>
                <strong class="num">{{ formatNumber(avgDry, 0) }}<small>g</small></strong>
                <span>{{ t('stats.harvests.avg') }}</span>
              </div>
              <div>
                <strong class="num">{{ formatNumber(avgDays, 0) }}<small>{{ t('stats.harvests.dayUnit') }}</small></strong>
                <span>{{ t('stats.harvests.seedToChop') }}</span>
              </div>
            </div>
          </div>
          <ul class="harvest-list">
            <li
              v-for="h in harvests"
              :key="h.plant.id"
            >
              <NuxtLink
                :to="`/plants/${h.plant.id}`"
                class="harvest-row"
              >
                <span class="harvest-name">
                  <strong>{{ h.plant.name }}</strong>
                  <span class="num">{{ formatDate(h.harvest.date) }} · {{ t('stats.days', { n: h.days }) }}</span>
                </span>
                <span class="meter lamp"><span :style="{ width: `${((h.harvest.dryWeight ?? 0) / maxDry) * 100}%` }" /></span>
                <span
                  class="harvest-weight num"
                  :class="{ pending: h.harvest.dryWeight == null }"
                >{{ h.harvest.dryWeight != null ? `${formatNumber(h.harvest.dryWeight)} g` : t('stats.harvests.drying') }}</span>
              </NuxtLink>
            </li>
          </ul>
        </template>
      </section>

      <section
        v-if="strains.length"
        class="card block"
      >
        <h2 class="section-title block-title">
          {{ t('stats.strains.title') }}
        </h2>
        <table class="strains">
          <thead>
            <tr><th>{{ t('stats.strains.strain') }}</th><th>{{ t('stats.strains.plants') }}</th><th>{{ t('stats.strains.dry') }}</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="s in strains"
              :key="s.name"
            >
              <td>{{ s.name }}</td>
              <td class="num">
                {{ s.plants }}
              </td>
              <td
                class="num"
                :class="{ yielded: s.dry }"
              >
                {{ s.dry ? `${formatNumber(s.dry, 0)} g` : '–' }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            {{ t('stats.achievements.title') }}
          </h2>
          <span class="section-meta num">{{ t('stats.achievements.earnedOf', { n: unlocked, total: achievements.length }) }}</span>
        </div>
        <ul class="card achievements">
          <li
            v-for="a in achievements"
            :key="a.key"
            class="achievement"
            :class="{ done: a.done }"
          >
            <span class="ach-tile">
              <GrowIcon
                :name="a.glyph"
                class="ach-glyph"
              />
            </span>
            <span class="ach-text">
              <strong>{{ a.title }}</strong>
              <span>{{ a.text }}</span>
            </span>
            <span
              v-if="a.done"
              class="ach-state"
            >
              <UIcon
                name="i-tabler-check"
                class="size-4"
              />
              {{ t('stats.achievements.earned') }}
            </span>
            <span
              v-else
              class="sr-only"
            >{{ t('stats.achievements.locked') }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.block {
  padding: 16px;
}

.block-title {
  margin-bottom: 12px;
}

.section-meta {
  margin: 2px 0 0;
}

/* Totals */
.ledger {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 14px 0;
}

.figure {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  min-width: 0;
}

.figure + .figure {
  border-left: 1px solid var(--line);
}

.big {
  font-size: 24px;
  white-space: nowrap;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.big small,
.streak-value small,
.yield strong small {
  margin-left: 5px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-3);
}

.figure span {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-2);
}

.figure > small {
  font-size: 11px;
  color: var(--text-3);
}

/* Streak */
.streak-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.streak-value {
  flex-shrink: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--green);
}

.days {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 4px;
}

.day {
  height: 28px;
  border-radius: 4px;
  background: var(--track);
}

.day.lit {
  background: var(--accent-line);
}

.day.run {
  background: var(--green);
}

.day.today {
  outline: 1px solid var(--line-strong);
  outline-offset: 2px;
}

.days-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
}

/* Segmented range */
.segmented.small {
  padding: 3px;
  flex-shrink: 0;
}

.segmented.small button {
  position: relative;
  white-space: nowrap;
  min-height: 34px;
  padding: 0 10px;
  font-size: 12px;
}

/* 44px tap area around the compact segments */
.segmented.small button::after {
  content: "";
  position: absolute;
  inset: -8px -2px;
}

/* Meters */
.meter {
  height: 6px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

.meter span {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
}

.meter.lamp span {
  background: var(--amber);
}

.types {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.types li {
  display: grid;
  grid-template-columns: 100px 1fr 34px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.type-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.type-glyph {
  font-size: 18px;
}

.type-count {
  text-align: right;
  font-weight: 600;
}

/* Harvests */
.yield {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  margin: 0 -16px 12px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--line);
}

.yield-main,
.yield-side > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 0 16px;
}

.yield-side {
  display: contents;
}

.yield-side > div {
  border-left: 1px solid var(--line);
}

.yield strong {
  display: block;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.yield-main strong {
  color: var(--amber);
}

.yield span {
  display: block;
  font-size: 12px;
  color: var(--text-2);
}

.harvest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.harvest-list li + li {
  border-top: 1px solid var(--line);
}

.harvest-row {
  display: grid;
  grid-template-columns: 1fr 64px 58px;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  color: inherit;
  text-decoration: none;
}

.harvest-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.harvest-name strong {
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.harvest-name span {
  font-size: 12px;
  color: var(--text-2);
}

.harvest-weight {
  text-align: right;
  font-size: 15px;
  font-weight: 600;
}

.harvest-weight.pending {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

/* Strains */
.strains {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.strains th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  padding: 0 0 8px;
}

.strains td {
  height: 44px;
  padding: 0;
  border-top: 1px solid var(--line);
}

.strains th:not(:first-child),
.strains td:not(:first-child) {
  text-align: right;
  width: 84px;
}

.strains td.yielded {
  font-weight: 600;
}

/* Achievements */
.achievements {
  list-style: none;
  margin: 0;
  padding: 0 16px;
}

.achievement {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 0;
}

.achievement + .achievement {
  border-top: 1px solid var(--line);
}

.ach-tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text-3);
  font-size: 20px;
}

.ach-glyph :deep(.tint) {
  opacity: 0;
}

.achievement.done .ach-tile {
  background: var(--accent-soft);
  color: var(--green);
}

.achievement.done .ach-glyph :deep(.tint) {
  opacity: 1;
}

.ach-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ach-text strong {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-2);
}

.ach-text span {
  font-size: 12px;
  color: var(--text-3);
}

.achievement.done .ach-text strong {
  color: var(--text);
}

.achievement.done .ach-text span {
  color: var(--text-2);
}

.ach-state {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--green);
}
</style>
