<script setup lang="ts">
import type { DryBatch } from '~~/shared/game/types'
import { JAR_MAX_MOISTURE, READY_HI, dryEtaH, snapTest, type SnapResult } from '~~/shared/game/drying'
import { durationParts, dryStatus, moldVisible } from '~~/shared/game/drying/view'

const props = defineProps<{ batch: DryBatch, name: string, nowH: number }>()
const emit = defineEmits<{ climate: [], jar: [] }>()
const { t } = useI18n()

const status = computed(() => dryStatus(props.batch))
const mold = computed(() => moldVisible(props.batch.moldRisk))
const snap = ref<SnapResult | null>(null)
const tooWet = computed(() => props.batch.moisture > JAR_MAX_MOISTURE)
const ready = computed(() => props.batch.moisture <= READY_HI)

const dur = (h: number) => {
  const d = durationParts(h)
  return t(`gameDry.time.${d.key}`, { h: d.h, m: d.m })
}
const statusText = computed(() => {
  const eta = dryEtaH(props.batch)
  return t(`gameDry.status.${status.value}`, { time: dur(eta ?? 0) })
})
const badge = computed(() => (status.value === 'overdry' ? 'overdry' : ready.value ? 'ready' : 'drying'))

// the result describes the moment of the test; drop it once the buds have changed category
watch(() => snapTest(props.batch.moisture), (now) => {
  if (snap.value && snap.value !== now) snap.value = null
})
</script>

<template>
  <article
    class="card batch"
    :aria-labelledby="`b-${batch.id}`"
  >
    <header class="top">
      <h3
        :id="`b-${batch.id}`"
        class="name"
      >
        {{ name }}
      </h3>
      <span
        class="badge"
        :class="badge"
      >{{ t(`gameDry.badge.${badge}`) }}</span>
    </header>
    <p class="sub">
      {{ t('gameDry.hanging', { time: dur(nowH - batch.startedAtH) }) }}
    </p>

    <GameDryHangingLine
      class="art"
      :moisture="batch.moisture"
      :mold="mold"
      :label="t('gameDry.art.line', { pct: Math.round(batch.moisture * 100) })"
    />

    <GameDryMoistureMeter :moisture="batch.moisture" />

    <div class="climate">
      <span class="num">{{ t('gameDry.climate', { temp: formatNumber(batch.tempC, 1), rh: batch.rh }) }}</span>
      <button
        type="button"
        class="link"
        @click="emit('climate')"
      >
        {{ t('gameDry.climateBtn') }}
      </button>
    </div>

    <p
      class="status"
      :class="status"
    >
      {{ statusText }}
    </p>
    <p
      v-if="mold !== 'none'"
      class="status mold"
    >
      {{ t(`gameDry.mold.${mold}`) }}
    </p>

    <p
      class="snap"
      role="status"
      v-text="snap ? t(`gameDry.snap.${snap}`) : ''"
    />

    <div class="actions">
      <button
        type="button"
        class="btn"
        @click="snap = snapTest(batch.moisture)"
      >
        {{ t('gameDry.snap.btn') }}
      </button>
      <button
        type="button"
        class="btn"
        :class="ready ? 'btn-primary' : ''"
        :disabled="tooWet"
        :aria-describedby="tooWet ? `w-${batch.id}` : undefined"
        @click="emit('jar')"
      >
        {{ t('gameDry.toJars') }}
      </button>
    </div>
    <p
      v-if="tooWet"
      :id="`w-${batch.id}`"
      class="hint"
    >
      {{ t('gameDry.tooWet') }}
    </p>
  </article>
</template>

<style scoped>
.batch {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.name {
  margin: 0;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.badge.drying {
  color: #d9a06a;
}

.badge.ready {
  color: var(--green);
}

.badge.overdry {
  color: var(--red);
}

.art {
  margin: 0 auto;
  max-width: 300px;
}

.climate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 15px;
  font-weight: 600;
}

.climate .link {
  position: relative;
}

/* 44px hit area for the inline link */
.climate .link::after {
  content: '';
  position: absolute;
  inset: -10px -8px;
}

.status {
  margin: -4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.status.fast,
.status.humid {
  color: var(--amber);
}

.status.stalled,
.status.overdry,
.status.mold {
  color: var(--red);
}

.status.ready {
  color: var(--green);
}

.snap {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 500;
}

/* stays in the tree so the live region announces; collapses the flex gap while empty */
.snap:empty {
  margin-top: -12px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actions .btn {
  padding: 0 12px;
}

.hint {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--text-3);
}
</style>
