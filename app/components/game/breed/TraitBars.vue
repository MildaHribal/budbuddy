<script setup lang="ts">
import type { TraitRow } from './traits'

// Each trait on its full scale: a filled span for a range, a short tick for a known value.
defineProps<{ rows: TraitRow[] }>()
const { t } = useI18n()

const text = (r: TraitRow) => (r.b === null
  ? t(`gameBreed.unit.${r.unit}One`, { a: r.a })
  : t(`gameBreed.unit.${r.unit}`, { a: r.a, b: r.b }))
</script>

<template>
  <dl class="traits">
    <div
      v-for="r in rows"
      :key="r.key"
      class="trait"
    >
      <dt>{{ t(`gameBreed.trait.${r.key}`) }}</dt>
      <dd>
        <span class="value num">{{ text(r) }}</span>
        <span
          class="scale"
          aria-hidden="true"
        >
          <span
            class="span"
            :class="{ point: r.b === null }"
            :style="{ left: `${r.from * 100}%`, width: r.b === null ? undefined : `${Math.max(2, (r.to - r.from) * 100)}%` }"
          />
        </span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.traits {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.trait {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.trait:first-child {
  border-top: 0;
  padding-top: 0;
}

dt {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

dd {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.value {
  font-size: 15px;
  font-weight: 600;
}

.scale {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: var(--track);
}

.span {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: var(--green);
}

.span.point {
  width: 4px;
  top: -3px;
  bottom: -3px;
  margin-left: -2px;
  border-radius: 2px;
}
</style>
