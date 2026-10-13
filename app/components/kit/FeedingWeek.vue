<script setup lang="ts">
// Home: this week's dose for every plant with a feeding schedule.
import { addDays } from '~/utils/date'
import type { Dose } from '~/utils/feeding'

const { t } = useI18n()
const grow = useGrow()
const feeding = useFeeding()
const today = useToday()

const rows = computed(() => grow.state.plants
  .filter(isGrowing)
  .map((p) => {
    const f = feeding.feedingFor(p, today.value)
    if (!f?.current) return null
    const last = grow.lastEntryOf(p.id, ['feed'])
    // fed within the last 7 days
    const fed = !!last && last.date > addDays(today.value, -7)
    return { plant: p, f, current: f.current, fed, last }
  })
  .filter(r => r !== null)
  // still to feed first; the card hides once everything is fed this week
  .sort((a, b) => Number(a.fed) - Number(b.fed)))

const summary = (doses: Dose[]) => {
  const head = doses.slice(0, 3).map(d => `${d.name} ${formatNumber(d.perLitre, 2)}`).join(' · ')
  return doses.length > 3 ? `${head} · ${t('kit.week.more', { n: doses.length - 3 })}` : head
}

// mid-sentence: "Fed yesterday", not "Fed Yesterday"; dates keep their capital month
const fedWhen = (iso: string) => {
  const rel = formatRelativeDay(iso, today.value)
  return iso > addDays(today.value, -7) ? rel.charAt(0).toLocaleLowerCase() + rel.slice(1) : rel
}

const logPlant = ref<string | null>(null)
const logOpen = ref(false)
function log(id: string) {
  logPlant.value = id
  logOpen.value = true
}
</script>

<template>
  <section
    v-if="rows.some(r => !r.fed)"
    aria-labelledby="feeding-week-title"
  >
    <div class="section-head">
      <h2
        id="feeding-week-title"
        class="section-title"
      >
        {{ t('kit.week.title') }}
      </h2>
      <NuxtLink
        to="/feeding"
        class="link"
      >
        {{ t('kit.week.plans') }}
      </NuxtLink>
    </div>
    <div class="card list">
      <div
        v-for="r in rows"
        :key="r.plant.id"
        class="row"
      >
        <span
          class="tile"
          :class="{ fed: r.fed }"
        >
          <GrowIcon :name="r.fed ? 'i-tabler-check' : 'feed'" />
        </span>
        <NuxtLink
          :to="`/plants/${r.plant.id}?tab=info`"
          class="text"
        >
          <strong>{{ r.plant.name }}</strong>
          <span>{{ feedWeekLabel(r.current.week.phase, r.current.week.n) }}</span>
          <span
            v-if="r.f.doses.length"
            class="num doses"
          >{{ summary(r.f.doses) }}</span>
          <span
            v-else
            class="doses"
          >{{ t('kit.plainWater') }}</span>
          <span
            v-if="r.fed && r.last"
            class="faint"
          >{{ t('kit.week.fed', { when: fedWhen(r.last.date) }) }}</span>
        </NuxtLink>
        <button
          type="button"
          class="log-btn"
          :aria-label="t('kit.week.logFor', { name: r.plant.name })"
          @click="log(r.plant.id)"
        >
          {{ t('kit.week.log') }}
        </button>
      </div>
    </div>
    <EntrySheet
      v-if="logPlant"
      v-model:open="logOpen"
      :plant-id="logPlant"
      type="feed"
      :date="today"
    />
  </section>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, #b58cf5 14%, transparent);
  color: #b58cf5;
  font-size: 20px;
}

.tile.fed {
  background: var(--accent-soft);
  color: var(--green);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
  text-decoration: none;
}

.text strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.doses {
  font-size: 12px;
  color: var(--text-3);
}

.faint {
  font-size: 12px;
  color: var(--text-3);
}

.log-btn {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, #b58cf5 14%, transparent);
  color: #b58cf5;
  font-size: 13px;
  font-weight: 600;
  transition: transform var(--dur-fast) var(--ease-out);
}

.log-btn:active {
  transform: scale(0.96);
}
</style>
