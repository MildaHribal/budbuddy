<script setup lang="ts">
import type { Plant } from '~/types/grow'
import { scheduleTitle } from '~/utils/feeding'

const props = defineProps<{ plant: Plant }>()
const emit = defineEmits<{ log: [] }>()

const { t } = useI18n()
const feeding = useFeeding()
const today = useToday()
const f = computed(() => feeding.feedingFor(props.plant, today.value))
const assignOpen = ref(false)
const growing = computed(() => isGrowing(props.plant))
</script>

<template>
  <section
    v-if="growing || f"
    class="card plan"
  >
    <div class="plan-head">
      <h2 class="section-title">
        <GrowIcon
          name="feed"
          class="feed-icon"
        /> {{ t('kit.plan.title') }}
      </h2>
      <button
        v-if="f"
        type="button"
        class="link"
        @click="assignOpen = true"
      >
        {{ t('common.edit') }}
      </button>
    </div>

    <template v-if="f">
      <NuxtLink
        :to="{ path: '/feeding', query: { s: f.schedule.id } }"
        class="plan-name"
      >
        {{ scheduleTitle(f.schedule) }}
        <span class="num">· {{ f.plan.strength }} % · {{ formatNumber(f.plan.waterL, 1) }} L</span>
      </NuxtLink>
      <template v-if="f.current">
        <p class="week">
          {{ feedWeekLabel(f.current.week.phase, f.current.week.n) }}<template v-if="f.current.repeated">
            · {{ t('kit.plan.repeated') }}
          </template><template v-if="f.current.week.ec != null">
            · EC {{ formatNumber(f.current.week.ec, 2) }}
          </template>
        </p>
        <ul
          v-if="f.doses.length"
          class="doses"
        >
          <li
            v-for="d in f.doses"
            :key="d.productId"
          >
            <span>{{ d.name }}</span>
            <span class="num"><strong>{{ formatNumber(d.perLitre, 2) }}</strong> {{ d.unit }}/L · {{ formatNumber(d.total, 1) }} {{ d.unit }}</span>
          </li>
        </ul>
        <p
          v-else
          class="muted small"
        >
          {{ t('kit.plainWater') }}
        </p>
        <p
          v-if="localized(f.current.week.note)"
          class="note"
        >
          {{ localized(f.current.week.note) }}
        </p>
        <button
          v-if="growing"
          type="button"
          class="btn btn-soft btn-block"
          @click="emit('log')"
        >
          {{ t('kit.plan.log') }}
        </button>
      </template>
      <p
        v-else
        class="muted small"
      >
        {{ t('kit.fill.noWeek') }}
      </p>
    </template>
    <template v-else>
      <p class="muted small">
        {{ t('kit.plan.empty') }}
      </p>
      <button
        type="button"
        class="btn btn-soft btn-block"
        @click="assignOpen = true"
      >
        {{ t('kit.plan.assign') }}
      </button>
    </template>

    <KitAssignSheet
      v-model:open="assignOpen"
      :plant-ids="[plant.id]"
    />
  </section>
</template>

<style scoped>
.plan {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feed-icon {
  color: #b58cf5;
}

.plan-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}

.plan-name span {
  font-weight: 400;
  color: var(--text-2);
}

.week {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.doses {
  margin: 0;
  padding: 0;
  list-style: none;
}

.doses li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  border-top: 1px solid var(--line);
}

.doses li span:last-child {
  color: var(--text-2);
  white-space: nowrap;
}

.doses strong {
  color: var(--text);
  font-weight: 600;
}

.small {
  margin: 0;
  font-size: 13px;
}

.note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}
</style>
